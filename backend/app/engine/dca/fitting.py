"""
DCA Curve Fitting Engine
========================
Orchestrates decline curve fitting across all model types using:
  1. scipy.optimize.curve_fit (Levenberg-Marquardt / Trust Region Reflective)
  2. scipy.optimize.differential_evolution (global optimizer fallback)

Strategy:
  - Generate physics-informed initial parameter guesses from data characteristics
  - Try constrained local optimization first (fast, reliable for good guesses)
  - Fall back to global optimization if local fit diverges
  - Compute comprehensive fit quality metrics (R², RMSE, AIC, BIC)
"""

from dataclasses import dataclass
from typing import Callable
import numpy as np
from scipy.optimize import curve_fit, differential_evolution

from app.engine.dca.arps import (
    exponential_rate, hyperbolic_rate, harmonic_rate,
)
from app.engine.dca.modified_hyp import modified_hyperbolic_rate
from app.engine.dca.sedm import sedm_rate
from app.engine.dca.duong import duong_rate


@dataclass
class FitResult:
    model_type: str
    parameters: dict
    covariance: list  # Serializable form of covariance matrix
    r_squared: float
    rmse: float
    aic: float
    bic: float
    residuals: list
    success: bool
    message: str


class DCAFitter:
    """Orchestrates decline curve fitting across all model types."""

    # Parameter bounds: (lower_bounds, upper_bounds)
    BOUNDS = {
        "exponential": {
            "names": ["qi", "di"],
            "lower": [1.0, 1e-6],
            "upper": [1e6, 5.0],
        },
        "hyperbolic": {
            "names": ["qi", "di", "b"],
            "lower": [1.0, 1e-6, 0.01],
            "upper": [1e6, 5.0, 2.5],
        },
        "harmonic": {
            "names": ["qi", "di"],
            "lower": [1.0, 1e-6],
            "upper": [1e6, 5.0],
        },
        "modified_hyperbolic": {
            "names": ["qi", "di", "b", "d_min"],
            "lower": [1.0, 1e-6, 0.01, 1e-4],
            "upper": [1e6, 5.0, 2.5, 0.5],
        },
        "sedm": {
            "names": ["qi", "tau", "n"],
            "lower": [1.0, 0.1, 0.01],
            "upper": [1e6, 1e5, 2.0],
        },
        "duong": {
            "names": ["qi", "a", "m"],
            "lower": [0.1, 0.1, 0.5],
            "upper": [1e6, 10.0, 3.0],
        },
    }

    # Model function dispatch
    MODEL_FUNCS: dict[str, Callable] = {
        "exponential": exponential_rate,
        "hyperbolic": hyperbolic_rate,
        "harmonic": harmonic_rate,
        "modified_hyperbolic": modified_hyperbolic_rate,
        "sedm": sedm_rate,
        "duong": duong_rate,
    }

    def fit(
        self,
        t: np.ndarray,
        q: np.ndarray,
        model_type: str,
        initial_params: dict | None = None,
    ) -> FitResult:
        """
        Fit a DCA model to production data.

        Args:
            t: Time array in months from start of analysis
            q: Rate array (bbl/day or Mcf/day)
            model_type: One of the supported model types
            initial_params: Optional initial parameter guesses (null = auto-generate)

        Returns:
            FitResult with fitted parameters and quality metrics
        """
        if model_type not in self.BOUNDS:
            return FitResult(
                model_type=model_type, parameters={}, covariance=[],
                r_squared=0, rmse=float("inf"), aic=float("inf"), bic=float("inf"),
                residuals=[], success=False, message=f"Unknown model type: {model_type}",
            )

        # Clean data: remove zeros, negatives, NaN, inf
        valid_mask = np.isfinite(t) & np.isfinite(q) & (q > 0) & (t >= 0)
        t_clean = t[valid_mask]
        q_clean = q[valid_mask]

        if len(t_clean) < 3:
            return FitResult(
                model_type=model_type, parameters={}, covariance=[],
                r_squared=0, rmse=float("inf"), aic=float("inf"), bic=float("inf"),
                residuals=[], success=False,
                message="Insufficient valid data points (need >= 3)",
            )

        # For Duong, time must be > 0 (shift if needed)
        if model_type == "duong" and t_clean[0] == 0:
            t_clean = t_clean + 1.0

        model_func = self.MODEL_FUNCS[model_type]
        bounds_cfg = self.BOUNDS[model_type]

        # Adjust qi bounds based on actual data
        qi_max = max(np.max(q_clean) * 3, bounds_cfg["upper"][0])
        upper = list(bounds_cfg["upper"])
        upper[0] = qi_max
        lower = list(bounds_cfg["lower"])

        # Generate initial guesses
        p0 = self._get_initial_guess(t_clean, q_clean, model_type, initial_params)
        p0_list = [p0[name] for name in bounds_cfg["names"]]

        # Clamp p0 within bounds
        p0_list = [
            max(lo, min(hi, val))
            for val, lo, hi in zip(p0_list, lower, upper)
        ]

        try:
            popt, pcov = curve_fit(
                model_func,
                t_clean,
                q_clean,
                p0=p0_list,
                bounds=(lower, upper),
                maxfev=10000,
                method="trf",
            )
        except (RuntimeError, ValueError):
            # Fall back to global optimization
            try:
                popt, pcov = self._global_fit(model_func, t_clean, q_clean, lower, upper)
            except Exception as e:
                return FitResult(
                    model_type=model_type, parameters={}, covariance=[],
                    r_squared=0, rmse=float("inf"), aic=float("inf"), bic=float("inf"),
                    residuals=[], success=False,
                    message=f"Optimization failed: {str(e)}",
                )

        # Build result
        param_names = bounds_cfg["names"]
        parameters = {name: float(val) for name, val in zip(param_names, popt)}

        q_predicted = model_func(t_clean, *popt)
        residuals = q_clean - q_predicted
        n = len(q_clean)
        k = len(popt)

        r2 = self._r_squared(q_clean, q_predicted)
        rmse = float(np.sqrt(np.mean(residuals**2)))

        # Ensure valid log computation for AIC/BIC
        rss = float(np.sum(residuals**2))
        if rss > 0 and n > 0:
            aic = n * np.log(rss / n) + 2 * k
            bic = n * np.log(rss / n) + k * np.log(n)
        else:
            aic = float("-inf")
            bic = float("-inf")

        return FitResult(
            model_type=model_type,
            parameters=parameters,
            covariance=pcov.tolist() if isinstance(pcov, np.ndarray) else [],
            r_squared=r2,
            rmse=rmse,
            aic=float(aic),
            bic=float(bic),
            residuals=residuals.tolist(),
            success=True,
            message="Fit converged successfully",
        )

    def auto_fit(self, t: np.ndarray, q: np.ndarray) -> list[FitResult]:
        """Fit all model types and return results ranked by AIC (best first)."""
        results = []
        for model_type in self.BOUNDS:
            result = self.fit(t, q, model_type)
            if result.success:
                results.append(result)
        return sorted(results, key=lambda r: r.aic)

    def _get_initial_guess(
        self,
        t: np.ndarray,
        q: np.ndarray,
        model_type: str,
        user_params: dict | None = None,
    ) -> dict:
        """Generate physics-informed initial parameter guesses from data."""
        qi_guess = float(q[0])  # First data point as initial rate

        # Estimate decline rate from first and last points
        if len(q) > 1 and q[-1] > 0 and qi_guess > 0 and t[-1] > t[0]:
            di_guess = max(-np.log(q[-1] / qi_guess) / (t[-1] - t[0]), 1e-6)
        else:
            di_guess = 0.05  # 5% per month default

        guesses = {
            "exponential": {"qi": qi_guess, "di": di_guess},
            "hyperbolic": {"qi": qi_guess, "di": di_guess, "b": 0.8},
            "harmonic": {"qi": qi_guess, "di": di_guess},
            "modified_hyperbolic": {"qi": qi_guess, "di": di_guess, "b": 1.0, "d_min": 0.005},
            "sedm": {"qi": qi_guess, "tau": max(t[-1] / 2.0, 1.0), "n": 0.5},
            "duong": {"qi": qi_guess, "a": 1.5, "m": 1.2},
        }

        guess = guesses.get(model_type, {})

        # Override with user-provided values where available
        if user_params:
            for key, val in user_params.items():
                if val is not None and key in guess:
                    guess[key] = val

        return guess

    def _global_fit(
        self,
        func: Callable,
        t: np.ndarray,
        q: np.ndarray,
        lower: list,
        upper: list,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Fall back to differential evolution for global optimization."""
        bounds_de = list(zip(lower, upper))

        def objective(params):
            try:
                q_pred = func(t, *params)
                return np.sum((q - q_pred) ** 2)
            except Exception:
                return 1e20

        result = differential_evolution(objective, bounds_de, maxiter=1000, tol=1e-8, seed=42)
        popt = result.x

        # Estimate covariance from the Hessian (approximate)
        try:
            _, pcov = curve_fit(func, t, q, p0=popt, bounds=(lower, upper), maxfev=5000)
        except Exception:
            pcov = np.zeros((len(popt), len(popt)))

        return popt, pcov

    @staticmethod
    def _r_squared(y_actual: np.ndarray, y_predicted: np.ndarray) -> float:
        ss_res = np.sum((y_actual - y_predicted) ** 2)
        ss_tot = np.sum((y_actual - np.mean(y_actual)) ** 2)
        return float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
