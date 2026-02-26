"""
Constant-rate drawdown analysis using semi-log (semilog) methods.

During a drawdown test the well produces at constant rate *q* from an
initial shut-in pressure *Pi*.  In the infinite-acting radial flow
(IARF) period the flowing bottom-hole pressure follows:

    Pwf = Pi - 162.6 * (q * B * mu) / (k * h)
              * [log10(t) + log10(k / (phi * mu * ct * rw^2)) - 3.23 + 0.87*s]

A plot of Pwf vs log10(t) gives a straight line of slope:

    m = -162.6 * q * B * mu / (k * h)       (psi / log-cycle)

From the slope and intercept the formation permeability and skin factor
are computed.

References:
  - Earlougher, R.C. Jr (1977). *Advances in Well Test Analysis*,
    Monograph Vol. 5, SPE.
  - Lee, J. (1982). *Well Testing*, Textbook Series Vol. 1, SPE.
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
class DrawdownResult:
    """Results of constant-rate drawdown semi-log analysis."""

    permeability: float           # md
    skin_factor: float
    p1hr: float                   # Pressure at 1 hour from IARF line (psi)
    slope: float                  # Semi-log slope m (psi/cycle), negative for drawdown
    intercept: float              # Semi-log intercept (psi)
    flow_capacity: float          # kh (md-ft)
    radius_investigation: float   # ri at last time point (ft)
    straight_line_start: int      # Index where IARF begins
    straight_line_end: int        # Index where IARF ends
    semi_log_plot: dict           # {"log_t": [...], "pwf": [...], "fit_line": [...]}
    log_log_plot: dict            # {"log_t": [...], "log_dp": [...], "log_dp_deriv": [...]}


# ─────────────────────────────────────────────────────────────
# Drawdown analysis engine
# ─────────────────────────────────────────────────────────────

class DrawdownAnalysis:
    """Semi-log analysis for constant-rate drawdown tests.

    The workflow:
    1. Compute Bourdet derivative to locate the IARF region.
    2. Fit Pwf vs log10(t) in the IARF region.
    3. Extract permeability, skin, and ancillary quantities.
    """

    def __init__(self, L: float = 0.1):
        self._deriv_engine = BourdetDerivative()
        self._L = L

    # ----------------------------------------------------------
    # Public API
    # ----------------------------------------------------------

    def analyze(
        self,
        time: NDArray[np.floating],
        pressure: NDArray[np.floating],
        rate: float,
        mu: float,
        bo: float,
        h: float,
        phi: float,
        ct: float,
        rw: float,
        pi: float,
    ) -> DrawdownResult:
        """Run constant-rate drawdown analysis.

        Args:
            time:     Elapsed time (hours), 1-D array, > 0.
            pressure: Flowing BHP Pwf (psi), 1-D array.
            rate:     Constant flow rate q (STB/d).
            mu:       Oil viscosity (cp).
            bo:       Oil formation volume factor (rb/stb).
            h:        Net pay thickness (ft).
            phi:      Porosity (fraction, 0-1).
            ct:       Total compressibility (1/psi).
            rw:       Wellbore radius (ft).
            pi:       Initial reservoir pressure (psi).

        Returns:
            DrawdownResult with all computed quantities and plot data.

        Raises:
            ValueError: On invalid inputs.
        """
        time = np.asarray(time, dtype=np.float64)
        pressure = np.asarray(pressure, dtype=np.float64)
        self._validate(time, pressure, rate, mu, bo, h, phi, ct, rw, pi)

        # Sort by time if not monotonic
        order = np.argsort(time)
        if not np.all(order == np.arange(len(order))):
            warnings.warn("Time is not monotonic; sorting.", stacklevel=2)
            time = time[order]
            pressure = pressure[order]

        # Strip t <= 0
        mask = time > 0
        time = time[mask]
        pressure = pressure[mask]

        # Step 1 -- Bourdet derivative for diagnostics
        deriv_result = self._deriv_engine.compute(time, pressure, pi, L=self._L)

        # Step 2 -- Locate IARF region
        start_idx, end_idx = self._find_iarf(
            np.array(deriv_result.time),
            np.array(deriv_result.derivative),
            time,
        )

        # Step 3 -- Semi-log straight-line fit in IARF region
        log_t = np.log10(time)
        m, b = np.polyfit(log_t[start_idx:end_idx + 1],
                          pressure[start_idx:end_idx + 1], 1)

        # Slope must be negative for a drawdown; use |m| in formulas
        abs_m = abs(m)
        if abs_m < 1e-12:
            raise ValueError(
                "Semi-log slope is effectively zero; cannot extract "
                "reservoir parameters.  Check data quality."
            )

        # Step 4 -- Permeability  k = 162.6 * q * B * mu / (|m| * h)
        k = 162.6 * rate * bo * mu / (abs_m * h)
        kh = k * h

        # Pressure at 1 hour from the IARF straight line
        p1hr = m * np.log10(1.0) + b  # log10(1) = 0, so p1hr = b

        # Step 5 -- Skin factor
        # s = 1.151 * [(Pi - P1hr)/|m| - log10(k/(phi*mu*ct*rw^2)) + 3.23]
        log_term = np.log10(k / (phi * mu * ct * rw ** 2))
        s = 1.151 * ((pi - p1hr) / abs_m - log_term + 3.23)

        # Step 6 -- Radius of investigation  ri = 0.029 * sqrt(k*t / (phi*mu*ct))
        t_max = time[-1]
        ri = 0.029 * np.sqrt(k * t_max / (phi * mu * ct))

        # Step 7 -- Build semi-log plot data
        fit_line = m * log_t + b
        semi_log_plot = {
            "log_t":    log_t.tolist(),
            "pwf":      pressure.tolist(),
            "fit_line": fit_line.tolist(),
        }

        return DrawdownResult(
            permeability=round(float(k), 4),
            skin_factor=round(float(s), 4),
            p1hr=round(float(p1hr), 2),
            slope=round(float(m), 4),
            intercept=round(float(b), 4),
            flow_capacity=round(float(kh), 2),
            radius_investigation=round(float(ri), 2),
            straight_line_start=int(start_idx),
            straight_line_end=int(end_idx),
            semi_log_plot=semi_log_plot,
            log_log_plot=deriv_result.log_log_plot,
        )

    # ----------------------------------------------------------
    # IARF detection from derivative
    # ----------------------------------------------------------

    @staticmethod
    def _find_iarf(
        deriv_time: NDArray[np.floating],
        derivative: NDArray[np.floating],
        full_time: NDArray[np.floating],
        tolerance: float = 0.20,
    ) -> tuple[int, int]:
        """Locate the IARF region where the derivative is approximately flat.

        Strategy:
          1. Filter to positive derivative values.
          2. Compute the median derivative.
          3. Find the longest contiguous run of points within
             *tolerance* of the median.
          4. Map those points back to the full time array indices.

        If no clear IARF is found, fall back to the middle 40-60% of
        the data and issue a warning.
        """
        if len(derivative) < 5:
            # Not enough derivative points; use middle portion
            n = len(full_time)
            warnings.warn(
                "Insufficient derivative points; using heuristic IARF window.",
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

        # Boolean mask: within tolerance of median
        within = np.abs(derivative - med) / med <= tolerance

        # Find longest contiguous run
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
            # Fallback: middle portion
            n = len(full_time)
            warnings.warn(
                "Could not identify clear IARF region; "
                "using middle 40-60%% of data.",
                stacklevel=2,
            )
            return int(n * 0.3), int(n * 0.7)

        # Map derivative-array indices back to full_time indices
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
        time: NDArray,
        pressure: NDArray,
        rate: float,
        mu: float,
        bo: float,
        h: float,
        phi: float,
        ct: float,
        rw: float,
        pi: float,
    ) -> None:
        if time.ndim != 1 or pressure.ndim != 1:
            raise ValueError("time and pressure must be 1-D arrays.")
        if len(time) != len(pressure):
            raise ValueError("time and pressure must have the same length.")
        if len(time) < 10:
            raise ValueError(
                f"Need at least 10 data points, got {len(time)}."
            )
        if rate <= 0:
            raise ValueError("Flow rate must be positive.")
        if mu <= 0 or bo <= 0 or h <= 0:
            raise ValueError("mu, bo, h must be positive.")
        if not (0 < phi <= 1):
            raise ValueError("Porosity must be in (0, 1].")
        if ct <= 0:
            raise ValueError("Total compressibility must be positive.")
        if rw <= 0:
            raise ValueError("Wellbore radius must be positive.")
        if pi <= 0:
            raise ValueError("Initial pressure must be positive.")
        if np.any(pressure < 0):
            raise ValueError("Pressure values must be non-negative.")
