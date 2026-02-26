"""
Havlena-Odeh Straight-Line Material Balance Analysis.

Re-arranges the general MBE into linear forms suitable for graphical
verification and regression-based estimation of OOIP (*N*) and gas-cap
ratio (*m*).

Straight-line relationships implemented:

1. **No water influx, no gas cap (m = 0)**::

       F = N * Et
       Plot F vs Et -- slope = N

2. **Known gas-cap ratio (m known), possible water influx**::

       F / Et = N + We / Et
       Plot F/Et vs We/Et -- intercept = N

3. **Unknown gas cap (m unknown), no water influx**::

       F = N * (Eo + Efw) + N * m * Eg
       Rearranging:  F / (Eo + Efw) = N + N*m * [Eg / (Eo + Efw)]

4. **Campbell plot (diagnostic)**::

       F / Et  vs  Np
       Should be a horizontal line at N if the correct model is chosen.

References:
    - Havlena, D. and Odeh, A.S., "The Material Balance as an Equation of a
      Straight Line", JPT, 1963.
    - Dake, L.P., "Fundamentals of Reservoir Engineering", Ch. 3.
"""

from __future__ import annotations

import logging
import warnings
from dataclasses import dataclass, field

import numpy as np

from .schilthuis import PressureStep, PVTAtPressure

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result data class
# ---------------------------------------------------------------------------

@dataclass
class HavlenaOdehResult:
    """Container for Havlena-Odeh straight-line analysis results."""

    # Core expansion / withdrawal arrays (one value per pressure step)
    F_values: list[float]
    Et_values: list[float]
    Eo_values: list[float]
    Eg_values: list[float]
    Efw_values: list[float]

    # Straight-line regression
    N_estimate: float | None       # OOIP from regression (STB)
    m_estimate: float | None       # Gas-cap ratio estimate
    r_squared: float               # Regression R-squared

    # Campbell plot data
    campbell_x: list[float]        # Np values
    campbell_y: list[float]        # F / Et values

    # Drive analysis
    drive_indices: dict = field(default_factory=dict)
    drive_mechanism: str = ""

    # Regression line for F-vs-Et plot (two-point line for charting)
    regression_slope: float | None = None
    regression_intercept: float | None = None


# ---------------------------------------------------------------------------
# Havlena-Odeh analysis engine
# ---------------------------------------------------------------------------

class HavlenaOdehAnalysis:
    """Havlena-Odeh straight-line material balance verification.

    Usage::

        ho = HavlenaOdehAnalysis()
        result = ho.analyze(
            pressure_history=[...],
            pvt_data=[...],
            pi=4000.0, boi=1.35, bgi=0.00065, rsi=750.0,
            m=None,   # None = estimate from data
        )
    """

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #

    def analyze(
        self,
        pressure_history: list[PressureStep],
        pvt_data: list[PVTAtPressure],
        pi: float,
        boi: float,
        bgi: float,
        rsi: float,
        m: float | None = None,
        swi: float = 0.2,
        cf: float = 3.0e-6,
        cw: float = 3.0e-6,
    ) -> HavlenaOdehResult:
        """Run the Havlena-Odeh straight-line analysis.

        Parameters
        ----------
        pressure_history : list[PressureStep]
            Time-ordered production / pressure data.
        pvt_data : list[PVTAtPressure]
            PVT properties at discrete pressures.
        pi : float
            Initial reservoir pressure (psia).
        boi : float
            Initial oil FVF (rb/stb).
        bgi : float
            Initial gas FVF (rb/scf).
        rsi : float
            Initial solution GOR (scf/stb).
        m : float | None
            Gas-cap ratio.  ``None`` = estimate from data.
        swi : float
            Initial water saturation.
        cf : float
            Formation compressibility (1/psi).
        cw : float
            Connate-water compressibility (1/psi).

        Returns
        -------
        HavlenaOdehResult
        """
        self._validate_inputs(pressure_history, pvt_data)

        # Build interpolation arrays
        pvt_pressures, bo_arr, bg_arr, bw_arr, rs_arr = self._unpack_pvt(pvt_data)

        n_steps = len(pressure_history)
        F_arr = np.zeros(n_steps)
        Eo_arr = np.zeros(n_steps)
        Eg_arr = np.zeros(n_steps)
        Efw_arr = np.zeros(n_steps)

        for i, step in enumerate(pressure_history):
            p = step.pressure

            bo = float(np.interp(p, pvt_pressures, bo_arr))
            bg = float(np.interp(p, pvt_pressures, bg_arr))
            bw = float(np.interp(p, pvt_pressures, bw_arr))
            rs = float(np.interp(p, pvt_pressures, rs_arr))

            gp_scf = step.gp_cum * 1_000.0
            gi_scf = step.gi_cum * 1_000.0

            # Underground withdrawal
            F_arr[i] = (
                step.np_cum * bo
                + (gp_scf - step.np_cum * rs) * bg
                + step.wp_cum * bw
                - step.wi_cum * bw
                - gi_scf * bg
            )

            # Expansion terms
            Eo_arr[i] = (bo - boi) + (rsi - rs) * bg
            Eg_arr[i] = boi * (bg / bgi - 1.0)
            Efw_arr[i] = boi * ((cf + cw * swi) / (1.0 - swi)) * (pi - p)

        # Warn on negative expansion (noisy data)
        if np.any(Eo_arr < 0):
            warnings.warn(
                "Negative oil expansion (Eo) detected. Data may be noisy.",
                stacklevel=2,
            )

        # ---- Regression depending on whether m is known -------------------
        if m is not None:
            N_est, m_est, r2, slope, intercept = self._regress_known_m(
                F_arr, Eo_arr, Eg_arr, Efw_arr, m,
            )
        else:
            N_est, m_est, r2, slope, intercept = self._regress_unknown_m(
                F_arr, Eo_arr, Eg_arr, Efw_arr,
            )

        # Use effective m for total expansion
        m_eff = m_est if m_est is not None else (m if m is not None else 0.0)
        Et_arr = Eo_arr + m_eff * Eg_arr + Efw_arr

        # ---- Campbell plot: F/Et vs Np -----------------------------------
        campbell_x: list[float] = []
        campbell_y: list[float] = []
        for i, step in enumerate(pressure_history):
            if Et_arr[i] > 0:
                campbell_x.append(step.np_cum)
                campbell_y.append(float(F_arr[i] / Et_arr[i]))

        # ---- Drive indices (at last step) --------------------------------
        drive_indices = self._compute_drive_indices(
            N=N_est, m=m_eff,
            F_last=float(F_arr[-1]),
            Eo_last=float(Eo_arr[-1]),
            Eg_last=float(Eg_arr[-1]),
            Efw_last=float(Efw_arr[-1]),
        )
        drive_mechanism = self._identify_primary_drive(drive_indices)

        return HavlenaOdehResult(
            F_values=F_arr.tolist(),
            Et_values=Et_arr.tolist(),
            Eo_values=Eo_arr.tolist(),
            Eg_values=Eg_arr.tolist(),
            Efw_values=Efw_arr.tolist(),
            N_estimate=N_est,
            m_estimate=m_est,
            r_squared=r2,
            campbell_x=campbell_x,
            campbell_y=campbell_y,
            drive_indices=drive_indices,
            drive_mechanism=drive_mechanism,
            regression_slope=slope,
            regression_intercept=intercept,
        )

    # --------------------------------------------------------------------- #
    # Regression strategies
    # --------------------------------------------------------------------- #

    @staticmethod
    def _regress_known_m(
        F: np.ndarray,
        Eo: np.ndarray,
        Eg: np.ndarray,
        Efw: np.ndarray,
        m: float,
    ) -> tuple[float | None, float | None, float, float | None, float | None]:
        """Regression when m is known: F = N * Et.

        Plot F vs Et; slope through origin = N.

        Returns (N, m, R^2, slope, intercept).
        """
        Et = Eo + m * Eg + Efw
        mask = Et > 0
        if mask.sum() < 2:
            logger.warning("Too few valid Et points for regression.")
            return None, m, 0.0, None, None

        Et_valid = Et[mask]
        F_valid = F[mask]

        # Ordinary least-squares: F = slope * Et + intercept
        coeffs = np.polyfit(Et_valid, F_valid, 1)
        slope, intercept = float(coeffs[0]), float(coeffs[1])

        # N = slope (forced through origin gives better physical meaning,
        # but intercept captures water influx signal)
        N = slope if slope > 0 else None

        # R-squared
        F_pred = np.polyval(coeffs, Et_valid)
        ss_res = np.sum((F_valid - F_pred) ** 2)
        ss_tot = np.sum((F_valid - np.mean(F_valid)) ** 2)
        r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

        return N, m, r2, slope, intercept

    @staticmethod
    def _regress_unknown_m(
        F: np.ndarray,
        Eo: np.ndarray,
        Eg: np.ndarray,
        Efw: np.ndarray,
    ) -> tuple[float | None, float | None, float, float | None, float | None]:
        """Regression when m is unknown.

        Rearrange:  F = N*(Eo + Efw) + N*m*Eg

        Let y = F,  x1 = (Eo + Efw),  x2 = Eg
        Then y = a*x1 + b*x2  where a = N, b = N*m

        Use multiple linear regression (no intercept).

        Returns (N, m, R^2, slope_for_Et_plot, intercept_for_Et_plot).
        """
        x1 = Eo + Efw
        x2 = Eg

        # Build design matrix [x1, x2] (no intercept -- forced through origin)
        X = np.column_stack([x1, x2])

        # Check for sufficient rank
        if np.linalg.matrix_rank(X) < 2:
            # Fall back to single-variable regression with m = 0
            logger.info(
                "Eg variation insufficient to resolve m; falling back to m = 0."
            )
            Et = Eo + Efw
            mask = Et > 0
            if mask.sum() < 2:
                return None, 0.0, 0.0, None, None
            coeffs = np.polyfit(Et[mask], F[mask], 1)
            slope, intercept = float(coeffs[0]), float(coeffs[1])
            N = slope if slope > 0 else None
            F_pred = np.polyval(coeffs, Et[mask])
            ss_res = np.sum((F[mask] - F_pred) ** 2)
            ss_tot = np.sum((F[mask] - np.mean(F[mask])) ** 2)
            r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
            return N, 0.0, r2, slope, intercept

        # Least-squares without intercept: (X^T X)^-1 X^T y
        try:
            beta, residuals, rank, sv = np.linalg.lstsq(X, F, rcond=None)
        except np.linalg.LinAlgError:
            logger.error("Linear algebra error in H-O regression.")
            return None, None, 0.0, None, None

        a, b = float(beta[0]), float(beta[1])  # a = N, b = N*m

        N = a if a > 0 else None
        m_est: float | None = None
        if N is not None and N > 0:
            m_est = b / N
            if m_est < 0:
                logger.warning(
                    "Estimated m is negative (%.4f); setting to 0.", m_est
                )
                m_est = 0.0

        # Build Et with estimated m for the standard F-vs-Et plot
        m_eff = m_est if m_est is not None else 0.0
        Et = Eo + m_eff * Eg + Efw
        mask = Et > 0
        if mask.sum() >= 2:
            coeffs = np.polyfit(Et[mask], F[mask], 1)
            slope, intercept = float(coeffs[0]), float(coeffs[1])
        else:
            slope, intercept = None, None

        # R-squared for the multi-variate fit
        F_pred = X @ beta
        ss_res = float(np.sum((F - F_pred) ** 2))
        ss_tot = float(np.sum((F - np.mean(F)) ** 2))
        r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

        return N, m_est, r2, slope, intercept

    # --------------------------------------------------------------------- #
    # Drive indices
    # --------------------------------------------------------------------- #

    @staticmethod
    def _compute_drive_indices(
        N: float | None,
        m: float,
        F_last: float,
        Eo_last: float,
        Eg_last: float,
        Efw_last: float,
    ) -> dict:
        """Compute drive-mechanism indices (water influx omitted here).

        For the H-O analysis the water influx is captured by the residual
        We = F - N*Et, so the drive indices here are calculated from the
        expansion terms alone. Any residual is lumped into water drive.
        """
        if N is None or F_last == 0:
            return {
                "solution_gas": 0.0,
                "gas_cap": 0.0,
                "water_drive": 0.0,
                "compaction": 0.0,
            }

        Et_last = Eo_last + m * Eg_last + Efw_last
        net_expansion = N * Et_last

        sdi = N * Eo_last / F_last
        gdi = N * m * Eg_last / F_last
        cdi = N * Efw_last / F_last
        wdi = max(0.0, (F_last - net_expansion) / F_last)

        return {
            "solution_gas": round(sdi, 4),
            "gas_cap": round(gdi, 4),
            "water_drive": round(wdi, 4),
            "compaction": round(cdi, 4),
        }

    @staticmethod
    def _identify_primary_drive(drive_indices: dict) -> str:
        if not drive_indices:
            return "Unknown"
        labels = {
            "solution_gas": "Solution-Gas Drive",
            "gas_cap": "Gas-Cap Drive",
            "water_drive": "Water Drive",
            "compaction": "Compaction / Formation Drive",
        }
        dominant = max(drive_indices, key=drive_indices.get)
        return labels.get(dominant, "Unknown")

    # --------------------------------------------------------------------- #
    # Validation & helpers
    # --------------------------------------------------------------------- #

    @staticmethod
    def _validate_inputs(
        pressure_history: list[PressureStep],
        pvt_data: list[PVTAtPressure],
    ) -> None:
        if len(pressure_history) < 3:
            raise ValueError(
                f"At least 3 pressure/production data points required; "
                f"got {len(pressure_history)}."
            )
        if len(pvt_data) < 2:
            raise ValueError(
                f"At least 2 PVT data points required; got {len(pvt_data)}."
            )
        total_prod = sum(s.np_cum for s in pressure_history)
        if total_prod <= 0:
            raise ValueError(
                "Total cumulative oil production is zero or negative."
            )

    @staticmethod
    def _unpack_pvt(
        pvt_data: list[PVTAtPressure],
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        sorted_data = sorted(pvt_data, key=lambda d: d.pressure)
        pressures = np.array([d.pressure for d in sorted_data])
        bo = np.array([d.bo for d in sorted_data])
        bg = np.array([d.bg for d in sorted_data])
        bw = np.array([d.bw for d in sorted_data])
        rs = np.array([d.rs for d in sorted_data])
        return pressures, bo, bg, bw, rs
