"""
Modified Hyperbolic Decline Model
==================================
Industry-standard model that transitions from hyperbolic decline to exponential
decline when the instantaneous decline rate falls to a minimum threshold (d_min).

This prevents the unrealistic EUR overestimation that occurs with pure hyperbolic
decline (especially when b >= 1) by imposing a terminal exponential decline rate.

Switch point:
    t_switch = (Di - d_min) / (b * Di * d_min)
    q_switch = qi / (1 + b * Di * t_switch)^(1/b)

Before switch: Hyperbolic decline
After switch:  Exponential decline at rate d_min

Parameters:
    qi    = Initial production rate
    di    = Initial nominal decline rate (1/month)
    b     = Hyperbolic exponent
    d_min = Minimum (terminal) decline rate (1/month), typically 0.5-2% per month
"""

import numpy as np
from app.engine.dca.arps import (
    hyperbolic_rate,
    hyperbolic_cumulative,
    exponential_rate,
)


def modified_hyperbolic_rate(
    t: np.ndarray, qi: float, di: float, b: float, d_min: float
) -> np.ndarray:
    """
    Modified hyperbolic rate function.

    Uses hyperbolic decline until instantaneous decline rate d(t) <= d_min,
    then switches to exponential decline with constant d_min.

    Instantaneous decline rate for hyperbolic:
        d(t) = Di / (1 + b * Di * t)

    Switch occurs when d(t) = d_min:
        t_switch = (Di - d_min) / (b * Di * d_min)
    """
    if d_min >= di:
        # If d_min >= di, just use exponential from the start
        return qi * np.exp(-d_min * t)

    t_switch = (di - d_min) / (b * di * d_min)
    q_switch = hyperbolic_rate(np.array([t_switch]), qi, di, b)[0]

    rates = np.empty_like(t, dtype=np.float64)
    hyp_mask = t <= t_switch
    exp_mask = ~hyp_mask

    # Hyperbolic phase
    if np.any(hyp_mask):
        rates[hyp_mask] = hyperbolic_rate(t[hyp_mask], qi, di, b)

    # Exponential tail phase
    if np.any(exp_mask):
        t_exp = t[exp_mask] - t_switch
        rates[exp_mask] = q_switch * np.exp(-d_min * t_exp)

    return rates


def modified_hyperbolic_cumulative(
    t: np.ndarray, qi: float, di: float, b: float, d_min: float
) -> np.ndarray:
    """
    Cumulative production for modified hyperbolic.

    Before switch: hyperbolic cumulative
    After switch: hyperbolic cumulative at switch + exponential cumulative from switch
    """
    if d_min >= di:
        return (qi / d_min) * (1.0 - np.exp(-d_min * t))

    t_switch = (di - d_min) / (b * di * d_min)
    q_switch = hyperbolic_rate(np.array([t_switch]), qi, di, b)[0]
    cum_at_switch = hyperbolic_cumulative(np.array([t_switch]), qi, di, b)[0]

    cum = np.empty_like(t, dtype=np.float64)
    hyp_mask = t <= t_switch
    exp_mask = ~hyp_mask

    if np.any(hyp_mask):
        cum[hyp_mask] = hyperbolic_cumulative(t[hyp_mask], qi, di, b)

    if np.any(exp_mask):
        t_exp = t[exp_mask] - t_switch
        cum[exp_mask] = cum_at_switch + (q_switch / d_min) * (1.0 - np.exp(-d_min * t_exp))

    return cum


def modified_hyperbolic_time_to_rate(
    q: float, qi: float, di: float, b: float, d_min: float
) -> float:
    """Time to reach rate q under modified hyperbolic decline."""
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0

    t_switch = (di - d_min) / (b * di * d_min)
    q_switch = qi / np.power(1.0 + b * di * t_switch, 1.0 / b)

    if q >= q_switch:
        # Still in hyperbolic phase
        return (np.power(qi / q, b) - 1.0) / (b * di)
    else:
        # In exponential tail
        t_exp = -np.log(q / q_switch) / d_min
        return t_switch + t_exp
