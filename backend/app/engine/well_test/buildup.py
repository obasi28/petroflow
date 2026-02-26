"""
Pressure buildup analysis using Horner and MDH methods.

After producing at rate *q* for time *tp*, the well is shut in and the
bottom-hole pressure Pws is recorded as a function of shut-in time dt.

**Horner method**: Plot Pws vs log10((tp + dt) / dt).  In the IARF
regime this gives a straight line whose slope yields permeability:

    m_H = 162.6 * q * B * mu / (k * h)   (psi / log-cycle)

The extrapolated pressure P* (at HTR = 1, i.e. dt -> infinity) gives an
estimate of average reservoir pressure (exact for infinite-acting).

**MDH (Miller-Dyes-Hutchinson) method**: Plot Pws vs log10(dt).  The
slope is identical in magnitude but plotted on a different abscissa.
Useful as a secondary check and when tp >> dt.

References:
  - Horner, D.R. (1951). "Pressure Build-Up in Wells."  Proc. Third
    World Petroleum Congress, The Hague.
  - Miller, C.C., Dyes, A.B., and Hutchinson, C.A. (1950). "The
    Estimation of Permeability and Reservoir Pressure from Bottom Hole
    Pressure Build-Up Characteristics."  Trans. AIME 189, 91-104.
  - Earlougher, R.C. Jr (1977). *Advances in Well Test Analysis*,
    SPE Monograph Vol. 5.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from .derivative import BourdetDerivative


# ─────────────────────────────────────────────────────────────
# Result container
# ─────────────────────────────────────────────────────────────

@dataclass
class BuildupResult:
    """Results of Horner / MDH pressure buildup analysis."""

    permeability: float           # md
    skin_factor: float
    p_star: float                 # Extrapolated pressure at HTR=1 (psi)
    flow_efficiency: float        # Fraction (can exceed 1 if stimulated)
    dp_skin: float                # Pressure drop due to skin (psi)
    horner_slope: float           # psi / log-cycle (positive value)
    flow_capacity: float          # kh (md-ft)
    straight_line_start: int      # Index in input arrays where IARF begins
    straight_line_end: int        # Index where IARF ends
    horner_plot: dict             # {"log_htr": [...], "pws": [...], "fit_line": [...]}
    mdh_plot: dict                # {"log_dt": [...], "pws": [...], "fit_line": [...]}
    log_log_plot: dict            # {"log_dt": [...], "log_dp": [...], "log_dp_deriv": [...]}


# ─────────────────────────────────────────────────────────────
# Buildup analysis engine
# ─────────────────────────────────────────────────────────────

class BuildupAnalysis:
    """Horner and MDH buildup analysis.

    The workflow:
    1. Compute Bourdet derivative to locate the IARF region.
    2. Fit Horner straight line: Pws vs log10(HTR) in the IARF window.
    3. Extract permeability, skin, P*, flow efficiency.
    4. Also fit MDH line (Pws vs log10(dt)) as secondary check.
    """

    def __init__(self, L: float = 0.1):
        self._deriv_engine = BourdetDerivative()
        self._L = L

    # ----------------------------------------------------------
    # Public API
    # ----------------------------------------------------------

    def analyze(
        self,
        delta_t: NDArray[np.floating],
        pressure: NDArray[np.floating],
        tp: float,
        rate: float,
        pwf_at_shutin: float,
        mu: float,
        bo: float,
        h: float,
        phi: float,
        ct: float,
        rw: float,
        pi: float | None = None,
    ) -> BuildupResult:
        """Run Horner + MDH buildup analysis.

        Args:
            delta_t:        Shut-in time array (hours), > 0.
            pressure:       Shut-in BHP Pws (psi).
            tp:             Cumulative producing time before shut-in (hours).
            rate:           Last stabilised flow rate q (STB/d).
            pwf_at_shutin:  Flowing BHP at moment of shut-in Pwf(dt=0) (psi).
            mu:             Oil viscosity (cp).
            bo:             Oil formation volume factor (rb/stb).
            h:              Net pay thickness (ft).
            phi:            Porosity (fraction).
            ct:             Total compressibility (1/psi).
            rw:             Wellbore radius (ft).
            pi:             Initial reservoir pressure (psi), optional.
                            If not supplied, P* is used in its place for the
                            skin calculation.

        Returns:
            BuildupResult with all computed quantities and plot data.

        Raises:
            ValueError: On invalid inputs.
        """
        delta_t = np.asarray(delta_t, dtype=np.float64)
        pressure = np.asarray(pressure, dtype=np.float64)
        self._validate(delta_t, pressure, tp, rate, pwf_at_shutin,
                        mu, bo, h, phi, ct, rw)

        # Sort by dt if needed
        order = np.argsort(delta_t)
        if not np.all(order == np.arange(len(order))):
            warnings.warn("delta_t is not monotonic; sorting.", stacklevel=2)
            delta_t = delta_t[order]
            pressure = pressure[order]

        # Strip dt <= 0
        mask = delta_t > 0
        delta_t = delta_t[mask]
        pressure = pressure[mask]

        # ── Bourdet derivative (uses dt as time, pwf_at_shutin as p_ref) ──
        deriv_result = self._deriv_engine.compute(
            delta_t, pressure, pwf_at_shutin, L=self._L,
        )

        # ── Locate IARF ──
        start_idx, end_idx = self._find_iarf(
            np.array(deriv_result.time),
            np.array(deriv_result.derivative),
            delta_t,
        )

        # ── Horner time ratio ──
        htr = (tp + delta_t) / delta_t  # Horner time ratio
        log_htr = np.log10(htr)         # Note: decreases with dt

        # ── Horner straight-line fit in IARF ──
        # Pws vs log10(HTR) — slope is positive because Pws increases as
        # log10(HTR) decreases (time progresses).  The Horner convention
        # yields a negative slope on the Pws-vs-log_HTR plot; we take |m|.
        m_horner, b_horner = np.polyfit(
            log_htr[start_idx:end_idx + 1],
            pressure[start_idx:end_idx + 1],
            1,
        )
        abs_m = abs(m_horner)

        if abs_m < 1e-12:
            raise ValueError(
                "Horner slope is effectively zero; cannot compute "
                "reservoir parameters."
            )

        # ── Permeability ──
        k = 162.6 * rate * bo * mu / (abs_m * h)
        kh = k * h

        # ── Extrapolated pressure P* ──
        # P* = Pws when HTR = 1 => log10(HTR) = 0
        p_star = float(m_horner * 0.0 + b_horner)  # = b_horner

        # ── Pressure at dt = 1 hour from Horner line ──
        htr_1hr = (tp + 1.0) / 1.0
        p1hr_horner = float(m_horner * np.log10(htr_1hr) + b_horner)

        # ── Skin factor ──
        # Use P* if pi not supplied
        p_ref_skin = pi if pi is not None else p_star
        log_term = np.log10(k / (phi * mu * ct * rw ** 2))
        s = 1.151 * ((p1hr_horner - pwf_at_shutin) / abs_m - log_term + 3.23)

        # ── Pressure drop due to skin ──
        dp_skin = 0.87 * abs_m * s

        # ── Flow efficiency ──
        # FE = (P* - Pwf_avg - dp_skin) / (P* - Pwf_avg)
        # Pwf_avg approximated by pwf_at_shutin (last flowing pressure)
        drawdown_total = p_star - pwf_at_shutin
        if abs(drawdown_total) > 1e-6:
            fe = (drawdown_total - dp_skin) / drawdown_total
        else:
            fe = 1.0

        # ── MDH analysis (secondary) ──
        log_dt = np.log10(delta_t)
        m_mdh, b_mdh = np.polyfit(
            log_dt[start_idx:end_idx + 1],
            pressure[start_idx:end_idx + 1],
            1,
        )
        mdh_fit = m_mdh * log_dt + b_mdh

        # ── Build plot data ──
        horner_fit = m_horner * log_htr + b_horner

        horner_plot = {
            "log_htr":  log_htr.tolist(),
            "pws":      pressure.tolist(),
            "fit_line": horner_fit.tolist(),
        }

        mdh_plot = {
            "log_dt":   log_dt.tolist(),
            "pws":      pressure.tolist(),
            "fit_line": mdh_fit.tolist(),
        }

        return BuildupResult(
            permeability=round(float(k), 4),
            skin_factor=round(float(s), 4),
            p_star=round(float(p_star), 2),
            flow_efficiency=round(float(fe), 4),
            dp_skin=round(float(dp_skin), 2),
            horner_slope=round(float(abs_m), 4),
            flow_capacity=round(float(kh), 2),
            straight_line_start=int(start_idx),
            straight_line_end=int(end_idx),
            horner_plot=horner_plot,
            mdh_plot=mdh_plot,
            log_log_plot=deriv_result.log_log_plot,
        )

    # ----------------------------------------------------------
    # IARF detection (same strategy as drawdown)
    # ----------------------------------------------------------

    @staticmethod
    def _find_iarf(
        deriv_time: NDArray[np.floating],
        derivative: NDArray[np.floating],
        full_time: NDArray[np.floating],
        tolerance: float = 0.20,
    ) -> tuple[int, int]:
        """Locate IARF region from derivative flatness.

        See DrawdownAnalysis._find_iarf for detailed documentation.
        """
        if len(derivative) < 5:
            n = len(full_time)
            warnings.warn(
                "Insufficient derivative points; using heuristic IARF.",
                stacklevel=2,
            )
            return int(n * 0.3), int(n * 0.7)

        pos_mask = derivative > 0
        if pos_mask.sum() < 5:
            n = len(full_time)
            warnings.warn(
                "Too few positive derivative values; using heuristic IARF.",
                stacklevel=2,
            )
            return int(n * 0.3), int(n * 0.7)

        med = float(np.median(derivative[pos_mask]))
        within = np.abs(derivative - med) / med <= tolerance

        # Longest contiguous run
        best_start, best_len = 0, 0
        run_start, run_len = 0, 0
        for i in range(len(within)):
            if within[i]:
                if run_len == 0:
                    run_start = i
                run_len += 1
            else:
                if run_len > best_len:
                    best_start, best_len = run_start, run_len
                run_len = 0
        if run_len > best_len:
            best_start, best_len = run_start, run_len

        if best_len < 3:
            n = len(full_time)
            warnings.warn(
                "Could not identify clear IARF region; using middle 40-60%%.",
                stacklevel=2,
            )
            return int(n * 0.3), int(n * 0.7)

        # Map back to full_time indices
        iarf_t_start = deriv_time[best_start]
        iarf_t_end = deriv_time[best_start + best_len - 1]

        idx_start = int(np.searchsorted(full_time, iarf_t_start, side="left"))
        idx_end = int(np.searchsorted(full_time, iarf_t_end, side="right") - 1)
        idx_end = max(idx_end, idx_start + 1)

        return idx_start, idx_end

    # ----------------------------------------------------------
    # Validation
    # ----------------------------------------------------------

    @staticmethod
    def _validate(
        delta_t: NDArray,
        pressure: NDArray,
        tp: float,
        rate: float,
        pwf_at_shutin: float,
        mu: float,
        bo: float,
        h: float,
        phi: float,
        ct: float,
        rw: float,
    ) -> None:
        if delta_t.ndim != 1 or pressure.ndim != 1:
            raise ValueError("delta_t and pressure must be 1-D arrays.")
        if len(delta_t) != len(pressure):
            raise ValueError("delta_t and pressure must have the same length.")
        if len(delta_t) < 10:
            raise ValueError(
                f"Need at least 10 data points, got {len(delta_t)}."
            )
        if tp <= 0:
            raise ValueError("Producing time tp must be positive.")
        if rate <= 0:
            raise ValueError("Flow rate must be positive.")
        if pwf_at_shutin < 0:
            raise ValueError("Pwf at shut-in must be non-negative.")
        if mu <= 0 or bo <= 0 or h <= 0:
            raise ValueError("mu, bo, h must be positive.")
        if not (0 < phi <= 1):
            raise ValueError("Porosity must be in (0, 1].")
        if ct <= 0:
            raise ValueError("Total compressibility must be positive.")
        if rw <= 0:
            raise ValueError("Wellbore radius must be positive.")
        if np.any(pressure < 0):
            raise ValueError("Pressure values must be non-negative.")
