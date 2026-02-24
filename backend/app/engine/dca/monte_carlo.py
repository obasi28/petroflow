"""
Monte Carlo EUR Estimation
===========================
Probabilistic estimation of Estimated Ultimate Recovery (EUR) using Monte Carlo
simulation with parameter uncertainty distributions.

Generates P10/P50/P90 estimates following SPE/PRMS conventions:
  - P90: High confidence (90% probability of exceeding) — conservative estimate
  - P50: Best estimate (median)
  - P10: Low confidence (10% probability of exceeding) — optimistic estimate

Supports parameter distributions: normal, lognormal, uniform, triangular.
"""

from dataclasses import dataclass
import numpy as np
from app.engine.dca.forecasting import RATE_FUNCTIONS, CUMULATIVE_FUNCTIONS, _extract_params


@dataclass
class MonteCarloResult:
    eur_p10: float
    eur_p50: float
    eur_p90: float
    eur_mean: float
    eur_std: float
    eur_distribution: np.ndarray
    iterations: int
    parameter_samples: dict


class MonteCarloEUR:
    """Probabilistic EUR estimation via Monte Carlo simulation."""

    def run(
        self,
        model_type: str,
        base_parameters: dict,
        param_distributions: dict,
        economic_limit: float,
        cum_to_date: float = 0.0,
        iterations: int = 10000,
        max_time_months: int = 600,
        param_bounds: dict[str, tuple[float, float]] | None = None,
    ) -> MonteCarloResult:
        """
        Run Monte Carlo simulation.

        Args:
            model_type: DCA model type
            base_parameters: Best-fit parameters (used as defaults for non-varied params)
            param_distributions: Distribution config for each parameter to vary.
                Example: {
                    "qi": {"type": "lognormal", "mean": 500, "std": 100},
                    "di": {"type": "uniform", "min": 0.01, "max": 0.15},
                    "b":  {"type": "triangular", "min": 0.3, "max": 1.5, "mode": 0.8}
                }
            economic_limit: Rate cutoff (bbl/day or Mcf/day)
            cum_to_date: Already-produced cumulative volume
            iterations: Number of simulation iterations
            max_time_months: Maximum forecast time in months

        Returns:
            MonteCarloResult with P10/P50/P90 and full distribution
        """
        rate_func = RATE_FUNCTIONS.get(model_type)
        cum_func = CUMULATIVE_FUNCTIONS.get(model_type)

        if not rate_func or not cum_func:
            raise ValueError(f"Unknown model type: {model_type}")

        eur_samples = np.empty(iterations)
        param_samples = {k: np.empty(iterations) for k in param_distributions}

        for i in range(iterations):
            # Build parameter set: start with base, override with sampled values
            params = dict(base_parameters)
            for param_name, dist_config in param_distributions.items():
                sample = self._sample_parameter(dist_config)
                if param_bounds and param_name in param_bounds:
                    low, high = param_bounds[param_name]
                    sample = float(np.clip(sample, low, high))
                params[param_name] = sample
                param_samples[param_name][i] = sample

            try:
                param_values = _extract_params(model_type, params)

                # Find time to economic limit via binary search
                t_econ = self._time_to_economic_limit(
                    rate_func, param_values, economic_limit, max_time_months
                )

                # Calculate cumulative at economic limit
                if t_econ > 0:
                    t_arr = np.array([t_econ])
                    cum = cum_func(t_arr, *param_values)[0] * 30.4375  # Convert to volume
                    eur = cum + cum_to_date
                else:
                    eur = cum_to_date
            except Exception:
                eur = cum_to_date

            eur_samples[i] = eur

        # SPE/PRMS convention:
        # P90 = 10th percentile of EUR (conservative, high confidence)
        # P50 = 50th percentile (median/best estimate)
        # P10 = 90th percentile (optimistic, low confidence)
        return MonteCarloResult(
            eur_p10=float(np.percentile(eur_samples, 90)),
            eur_p50=float(np.percentile(eur_samples, 50)),
            eur_p90=float(np.percentile(eur_samples, 10)),
            eur_mean=float(np.mean(eur_samples)),
            eur_std=float(np.std(eur_samples)),
            eur_distribution=eur_samples,
            iterations=iterations,
            parameter_samples=param_samples,
        )

    def _sample_parameter(self, config: dict) -> float:
        """Sample a single value from a configured distribution."""
        dist_type = config["type"]
        if dist_type == "normal":
            return float(np.random.normal(config["mean"], max(config.get("std", 0), 1e-12)))
        elif dist_type == "lognormal":
            mu = config["mean"]
            sigma = config["std"]
            mu = max(mu, 1e-12)
            sigma = max(sigma, 1e-12)
            sigma_ln = np.sqrt(np.log(1 + (sigma / mu) ** 2))
            mu_ln = np.log(mu) - 0.5 * sigma_ln**2
            return float(np.random.lognormal(mu_ln, sigma_ln))
        elif dist_type == "uniform":
            lower = config["min"]
            upper = config["max"]
            if upper < lower:
                lower, upper = upper, lower
            return float(np.random.uniform(lower, upper))
        elif dist_type == "triangular":
            lower = config["min"]
            mode = config["mode"]
            upper = config["max"]
            if upper < lower:
                lower, upper = upper, lower
            mode = min(max(mode, lower), upper)
            return float(np.random.triangular(lower, mode, upper))
        else:
            raise ValueError(f"Unknown distribution type: {dist_type}")

    def _time_to_economic_limit(
        self,
        rate_func,
        param_values: list,
        economic_limit: float,
        max_months: int,
    ) -> float:
        """Binary search for time when rate drops below economic limit."""
        # Quick check: is initial rate already below limit?
        t_start = np.array([0.01])
        try:
            q_start = rate_func(t_start, *param_values)[0]
        except Exception:
            return 0.0

        if q_start < economic_limit:
            return 0.0

        # Check if rate is still above limit at max time
        t_end = np.array([float(max_months)])
        try:
            q_end = rate_func(t_end, *param_values)[0]
        except Exception:
            return float(max_months)

        if q_end >= economic_limit:
            return float(max_months)

        # Binary search
        t_low, t_high = 0.01, float(max_months)
        for _ in range(60):
            t_mid = (t_low + t_high) / 2.0
            try:
                q_mid = rate_func(np.array([t_mid]), *param_values)[0]
            except Exception:
                t_high = t_mid
                continue

            if q_mid > economic_limit:
                t_low = t_mid
            else:
                t_high = t_mid

            if abs(t_high - t_low) < 0.01:
                break

        return (t_low + t_high) / 2.0
