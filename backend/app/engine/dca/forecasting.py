"""
DCA Forecast Generation
========================
Generates monthly rate and cumulative production forecasts from fitted DCA parameters.
Supports all 6 model types and respects economic limit cutoff.
"""

import numpy as np
from app.engine.dca.arps import (
    exponential_rate, exponential_cumulative,
    hyperbolic_rate, hyperbolic_cumulative,
    harmonic_rate, harmonic_cumulative,
)
from app.engine.dca.modified_hyp import (
    modified_hyperbolic_rate, modified_hyperbolic_cumulative,
)
from app.engine.dca.sedm import sedm_rate, sedm_cumulative
from app.engine.dca.duong import duong_rate, duong_cumulative


RATE_FUNCTIONS = {
    "exponential": exponential_rate,
    "hyperbolic": hyperbolic_rate,
    "harmonic": harmonic_rate,
    "modified_hyperbolic": modified_hyperbolic_rate,
    "sedm": sedm_rate,
    "duong": duong_rate,
}

CUMULATIVE_FUNCTIONS = {
    "exponential": exponential_cumulative,
    "hyperbolic": hyperbolic_cumulative,
    "harmonic": harmonic_cumulative,
    "modified_hyperbolic": modified_hyperbolic_cumulative,
    "sedm": sedm_cumulative,
    "duong": duong_cumulative,
}


def generate_forecast(
    model_type: str,
    parameters: dict,
    forecast_months: int = 360,
    economic_limit: float = 5.0,
    time_step: float = 1.0,
) -> dict:
    """
    Generate monthly forecast from DCA parameters.

    Args:
        model_type: Decline model type
        parameters: Fitted model parameters
        forecast_months: Maximum forecast duration in months
        economic_limit: Minimum economic rate (bbl/day or Mcf/day)
        time_step: Time step in months (default 1.0 for monthly)

    Returns:
        dict with keys: time (months), rate (bbl/day), cumulative (bbl*days/month)
    """
    rate_func = RATE_FUNCTIONS.get(model_type)
    cum_func = CUMULATIVE_FUNCTIONS.get(model_type)

    if not rate_func or not cum_func:
        raise ValueError(f"Unknown model type: {model_type}")

    # Generate time array
    t = np.arange(time_step, forecast_months + time_step, time_step)

    # For Duong, ensure t starts at 1 (not 0)
    if model_type == "duong":
        t = np.maximum(t, 1.0)

    # Calculate rates
    param_values = _extract_params(model_type, parameters)
    rates = rate_func(t, *param_values)
    cumulative = cum_func(t, *param_values)

    # Apply economic limit cutoff
    above_limit = rates >= economic_limit
    if not np.all(above_limit):
        # Find first point below economic limit
        cutoff_idx = np.argmax(~above_limit)
        if cutoff_idx > 0:
            t = t[:cutoff_idx]
            rates = rates[:cutoff_idx]
            cumulative = cumulative[:cutoff_idx]
        elif not above_limit[0]:
            # Rate is already below economic limit at t=0
            return {"time": [], "rate": [], "cumulative": []}

    # Convert cumulative from rate*time to volume
    # Cumulative is in rate-time units. For monthly data:
    # Volume = rate (bbl/day) * 30.4375 (days/month) for each month increment
    # But our analytical cumulative functions already integrate correctly in rate*months.
    # Multiply by 30.4375 to convert from rate*months to bbl (or Mcf)
    cumulative_volume = cumulative * 30.4375

    return {
        "time": t.tolist(),
        "rate": rates.tolist(),
        "cumulative": cumulative_volume.tolist(),
    }


def _extract_params(model_type: str, parameters: dict) -> list:
    """Extract parameter values in the order expected by model functions."""
    param_order = {
        "exponential": ["qi", "di"],
        "hyperbolic": ["qi", "di", "b"],
        "harmonic": ["qi", "di"],
        "modified_hyperbolic": ["qi", "di", "b", "d_min"],
        "sedm": ["qi", "tau", "n"],
        "duong": ["qi", "a", "m"],
    }
    names = param_order[model_type]
    return [parameters[name] for name in names]
