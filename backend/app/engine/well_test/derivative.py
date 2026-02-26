"""
Bourdet pressure derivative computation for well test diagnostics.

The Bourdet derivative is the industry-standard tool for identifying flow
regimes from pressure transient data.  It uses a three-point logarithmic
differentiation with an L-factor smoothing window to suppress noise while
preserving the diagnostic shape of the derivative curve.

References:
  - Bourdet, D., Whittle, T.M., Douglas, A.A., and Pirard, Y.M. (1983).
    "A New Set of Type Curves Simplifies Well Test Analysis."  World Oil,
    May 1983.
  - Bourdet, D., Ayoub, J.A., and Pirard, Y.M. (1989). "Use of Pressure
    Derivative in Well-Test Interpretation."  SPE Formation Evaluation,
    June 1989, pp. 293-302.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray


# ─────────────────────────────────────────────────────────────
# Result container
# ─────────────────────────────────────────────────────────────

@dataclass
class DerivativeResult:
    """Container for Bourdet derivative computation results."""

    time: list[float]              # Time values where derivative is computed
    delta_p: list[float]           # Pressure change |p_ref - p|
    derivative: list[float]        # Bourdet derivative values (t * dp'/dt)
    flow_regimes: list[dict]       # Detected flow regimes with metadata
    log_log_plot: dict             # Pre-built plot data for frontend


# ─────────────────────────────────────────────────────────────
# Flow-regime slope tolerances
# ─────────────────────────────────────────────────────────────

_REGIME_DEFS = [
    {"name": "wellbore_storage",     "target_slope": 1.0,  "tol": 0.15},
    {"name": "radial_flow",          "target_slope": 0.0,  "tol": 0.10},
    {"name": "linear_flow",          "target_slope": 0.5,  "tol": 0.10},
    {"name": "spherical_flow",       "target_slope": -0.5, "tol": 0.15},
    {"name": "boundary_effects",     "target_slope": 1.0,  "tol": 0.15},
]


# ─────────────────────────────────────────────────────────────
# Bourdet derivative engine
# ─────────────────────────────────────────────────────────────

class BourdetDerivative:
    """Compute the Bourdet pressure derivative with L-factor smoothing.

    The three-point algorithm selects, for each interior point *i*, a
    backward neighbour *j* and a forward neighbour *k* satisfying:

        ln(t_i) - ln(t_j)  >=  L
        ln(t_k) - ln(t_i)  >=  L

    The derivative at *i* is then the weighted central difference:

        dp'_i = (dp_j * X_k  +  dp_k * X_j) / (X_j + X_k)

    where dp_j = p_i - p_j,  dp_k = p_k - p_i,
          X_j  = ln(t_i / t_j),  X_k = ln(t_k / t_i).

    The result is then multiplied by t_i to give the standard
    "pressure-derivative" used in log-log diagnostics:

        deriv_i = t_i * dp'_i
    """

    # ----------------------------------------------------------
    # Public API
    # ----------------------------------------------------------

    def compute(
        self,
        time: NDArray[np.floating],
        pressure: NDArray[np.floating],
        p_ref: float,
        L: float = 0.1,
    ) -> DerivativeResult:
        """Compute Bourdet derivative and identify flow regimes.

        Args:
            time:     1-D array of elapsed time (hours).  Must be > 0.
            pressure: 1-D array of measured pressures (psi).
            p_ref:    Reference pressure (psi).
                      - Drawdown:  initial reservoir pressure (Pi).
                      - Buildup:   flowing pressure at shut-in (Pwf_dt0).
            L:        Logarithmic smoothing factor (default 0.1).
                      Typical range 0.01 – 0.5.  Larger values give a
                      smoother curve but may obscure sharp features.

        Returns:
            DerivativeResult with derivative values, identified flow
            regimes, and pre-built log-log plot data.

        Raises:
            ValueError: If inputs are invalid (length mismatch, L out of
                        range, etc.).
        """
        time = np.asarray(time, dtype=np.float64)
        pressure = np.asarray(pressure, dtype=np.float64)
        self._validate(time, pressure, L)

        # Sort by time if needed
        order = np.argsort(time)
        if not np.all(order == np.arange(len(order))):
            warnings.warn(
                "Time array is not monotonically increasing; sorting.",
                stacklevel=2,
            )
            time = time[order]
            pressure = pressure[order]

        # Strip any zero-time points (log(0) is undefined)
        mask = time > 0
        time = time[mask]
        pressure = pressure[mask]

        # Pressure change from reference
        delta_p = np.abs(p_ref - pressure)

        # Core derivative computation
        t_deriv, dp_deriv, deriv_vals = self._bourdet_three_point(
            time, delta_p, L,
        )

        # Flow-regime identification
        flow_regimes = self._identify_regimes(t_deriv, deriv_vals, dp_deriv)

        # Build log-log plot data
        log_log_plot = self._build_log_log_plot(t_deriv, dp_deriv, deriv_vals)

        return DerivativeResult(
            time=t_deriv.tolist(),
            delta_p=dp_deriv.tolist(),
            derivative=deriv_vals.tolist(),
            flow_regimes=flow_regimes,
            log_log_plot=log_log_plot,
        )

    # ----------------------------------------------------------
    # Core three-point Bourdet algorithm
    # ----------------------------------------------------------

    @staticmethod
    def _bourdet_three_point(
        time: NDArray[np.floating],
        delta_p: NDArray[np.floating],
        L: float,
    ) -> tuple[NDArray, NDArray, NDArray]:
        """Return (t_out, dp_out, derivative) arrays.

        Points at the very start or end that cannot satisfy the L-window
        are excluded from the output.
        """
        n = len(time)
        ln_t = np.log(time)

        t_out: list[float] = []
        dp_out: list[float] = []
        deriv_out: list[float] = []

        for i in range(1, n - 1):
            # Find backward neighbour j
            j = i - 1
            while j >= 0 and (ln_t[i] - ln_t[j]) < L:
                j -= 1
            if j < 0:
                continue

            # Find forward neighbour k
            k = i + 1
            while k < n and (ln_t[k] - ln_t[i]) < L:
                k += 1
            if k >= n:
                continue

            X_j = ln_t[i] - ln_t[j]
            X_k = ln_t[k] - ln_t[i]
            dp_j = delta_p[i] - delta_p[j]
            dp_k = delta_p[k] - delta_p[i]

            denom = X_j + X_k
            if denom == 0.0:
                continue

            dp_prime = (dp_j * X_k + dp_k * X_j) / denom
            deriv_val = time[i] * dp_prime  # t * dp'/dt in log space

            t_out.append(time[i])
            dp_out.append(delta_p[i])
            deriv_out.append(deriv_val)

        return (
            np.array(t_out, dtype=np.float64),
            np.array(dp_out, dtype=np.float64),
            np.array(deriv_out, dtype=np.float64),
        )

    # ----------------------------------------------------------
    # Flow-regime detection
    # ----------------------------------------------------------

    @staticmethod
    def _identify_regimes(
        time: NDArray[np.floating],
        derivative: NDArray[np.floating],
        delta_p: NDArray[np.floating],
    ) -> list[dict]:
        """Identify flow regimes from the log-log slope of the derivative.

        A sliding window (minimum 4 consecutive points) is used to
        compute local slopes on a log(derivative) vs log(time) plot.
        Regions where the slope is close to a known target are flagged.
        """
        if len(time) < 5:
            return []

        regimes: list[dict] = []

        # Mask out non-positive derivative values for log
        mask = (derivative > 0) & (time > 0)
        if mask.sum() < 5:
            return []

        log_t = np.log10(time[mask])
        log_d = np.log10(derivative[mask])
        idx_map = np.where(mask)[0]  # map back to original indices

        # Compute point-by-point slope using central differences
        slopes = np.zeros(len(log_t))
        for i in range(1, len(log_t) - 1):
            dt = log_t[i + 1] - log_t[i - 1]
            if dt > 0:
                slopes[i] = (log_d[i + 1] - log_d[i - 1]) / dt
        # Forward/backward for endpoints
        if len(log_t) >= 2:
            dt0 = log_t[1] - log_t[0]
            if dt0 > 0:
                slopes[0] = (log_d[1] - log_d[0]) / dt0
            dt_end = log_t[-1] - log_t[-2]
            if dt_end > 0:
                slopes[-1] = (log_d[-1] - log_d[-2]) / dt_end

        # Detect each regime type
        for rdef in _REGIME_DEFS:
            target = rdef["target_slope"]
            tol = rdef["tol"]
            name = rdef["name"]

            in_regime = np.abs(slopes - target) < tol
            # Find contiguous runs of length >= 4
            runs = _contiguous_runs(in_regime, min_length=4)
            for start_local, end_local in runs:
                # Boundary effects must be late-time; wellbore storage early-time
                if name == "wellbore_storage" and start_local > len(log_t) * 0.5:
                    continue
                if name == "boundary_effects" and end_local < len(log_t) * 0.5:
                    continue

                avg_slope = float(np.mean(slopes[start_local:end_local]))
                regimes.append({
                    "name": name,
                    "start_idx": int(idx_map[start_local]),
                    "end_idx": int(idx_map[end_local - 1]),
                    "slope": round(avg_slope, 4),
                })

        # Sort by start index
        regimes.sort(key=lambda r: r["start_idx"])
        return regimes

    # ----------------------------------------------------------
    # Plot data builder
    # ----------------------------------------------------------

    @staticmethod
    def _build_log_log_plot(
        time: NDArray[np.floating],
        delta_p: NDArray[np.floating],
        derivative: NDArray[np.floating],
    ) -> dict:
        """Build log-log plot arrays for the frontend."""
        mask = (time > 0) & (delta_p > 0) & (derivative > 0)
        return {
            "log_t":     np.log10(time[mask]).tolist(),
            "log_dp":    np.log10(delta_p[mask]).tolist(),
            "log_deriv": np.log10(derivative[mask]).tolist(),
        }

    # ----------------------------------------------------------
    # Validation
    # ----------------------------------------------------------

    @staticmethod
    def _validate(
        time: NDArray[np.floating],
        pressure: NDArray[np.floating],
        L: float,
    ) -> None:
        if time.ndim != 1 or pressure.ndim != 1:
            raise ValueError("time and pressure must be 1-D arrays.")
        if len(time) != len(pressure):
            raise ValueError(
                f"time ({len(time)}) and pressure ({len(pressure)}) "
                f"must have the same length."
            )
        if len(time) < 3:
            raise ValueError("Need at least 3 data points for derivative.")
        if not (0.001 <= L <= 1.0):
            raise ValueError(f"L-factor must be in [0.001, 1.0], got {L}.")
        if np.any(pressure < 0):
            raise ValueError("Pressure values must be non-negative.")


# ─────────────────────────────────────────────────────────────
# Utility: contiguous-run finder
# ─────────────────────────────────────────────────────────────

def _contiguous_runs(
    mask: NDArray[np.bool_], min_length: int = 4
) -> list[tuple[int, int]]:
    """Return (start, end) pairs for contiguous True runs of at least
    *min_length* in a boolean array.  *end* is exclusive."""
    runs: list[tuple[int, int]] = []
    n = len(mask)
    i = 0
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            if (j - i) >= min_length:
                runs.append((i, j))
            i = j
        else:
            i += 1
    return runs
