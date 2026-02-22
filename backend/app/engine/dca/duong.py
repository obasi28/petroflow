"""
Duong Decline Model
====================
Developed by Duong (2011) specifically for unconventional reservoirs exhibiting
long-duration linear flow (fracture-dominated flow).

Assumes production is in the fracture-dominated linear flow regime, making it
particularly suitable for tight oil and shale gas wells with multi-stage
hydraulic fractures.

Rate equation:
    q(t) = qi * t^(-m) * exp(a/(1-m) * (t^(1-m) - 1))

Cumulative (Duong's identity):
    Np(t) = q(t) * t / a

Parameters:
    qi = Rate at t=1 month (NOT the peak rate)
    a  = Intercept parameter (controls initial decline severity)
    m  = Slope parameter (controls long-term decline)

Typical ranges:
    a:  0.5 to 4.0
    m:  1.0 to 2.0

For m > 1: rate always decreases with time (physical behavior)
For m = 1: q(t) = qi * exp(-a * ln(t)) = qi * t^(-a), a power law

Reference:
    Duong, A.N. (2011). "Rate-Decline Analysis for Fracture-Dominated Shale
    Reservoirs." SPE 137748.
"""

import numpy as np


def duong_rate(t: np.ndarray, qi: float, a: float, m: float) -> np.ndarray:
    """
    Duong rate: q(t) = qi * t^(-m) * exp(a/(1-m) * (t^(1-m) - 1))

    Note: t must be > 0 (typically starts at t=1 month).
    qi represents the rate at t=1, not the peak rate.
    """
    t_safe = np.maximum(t, 1e-10)  # Avoid log(0) and division by zero
    exponent = (a / (1.0 - m)) * (np.power(t_safe, 1.0 - m) - 1.0)
    return qi * np.power(t_safe, -m) * np.exp(exponent)


def duong_cumulative(t: np.ndarray, qi: float, a: float, m: float) -> np.ndarray:
    """
    Duong cumulative: Np(t) = q(t) * t / a

    This is Duong's key identity — cumulative is directly proportional to
    the product of rate and time, divided by the intercept parameter.
    """
    q_t = duong_rate(t, qi, a, m)
    t_safe = np.maximum(t, 1e-10)
    return q_t * t_safe / a


def duong_time_to_rate(q: float, qi: float, a: float, m: float) -> float:
    """
    Numerical solve for time to reach rate q.

    No closed-form solution exists — use binary search.
    """
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0

    t_low, t_high = 0.01, 10000.0
    for _ in range(100):
        t_mid = (t_low + t_high) / 2.0
        q_mid = duong_rate(np.array([t_mid]), qi, a, m)[0]
        if q_mid > q:
            t_low = t_mid
        else:
            t_high = t_mid
        if abs(t_high - t_low) < 0.001:
            break
    return (t_low + t_high) / 2.0
