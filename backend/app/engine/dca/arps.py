"""
Arps Decline Curve Models
=========================
Classical decline curve equations from J.J. Arps (1945).

Three fundamental models:
  - Exponential (b = 0): Constant fractional decline
  - Hyperbolic (0 < b < 1 typically, up to 2 for unconventionals): Decreasing fractional decline
  - Harmonic (b = 1): Special case of hyperbolic

General Arps equation:
    q(t) = qi / (1 + b * Di * t)^(1/b)

Where:
    q(t) = production rate at time t
    qi   = initial production rate at t=0 of the analysis period
    Di   = initial nominal decline rate (1/time)
    b    = hyperbolic exponent (dimensionless)
    t    = time from start of decline

Units convention:
    - Time in months (t)
    - Rate in bbl/day or Mcf/day (q)
    - Decline rate in 1/month (Di)
"""

import numpy as np


# ==============================================================================
# EXPONENTIAL DECLINE (b = 0)
# ==============================================================================

def exponential_rate(t: np.ndarray, qi: float, di: float) -> np.ndarray:
    """
    Exponential decline: q(t) = qi * exp(-Di * t)

    Represents constant percentage decline per unit time. Most conservative
    model — often used for the terminal phase of decline.
    """
    return qi * np.exp(-di * t)


def exponential_cumulative(t: np.ndarray, qi: float, di: float) -> np.ndarray:
    """
    Cumulative production: Np(t) = (qi / Di) * (1 - exp(-Di * t))

    The EUR (t → ∞) is always finite: EUR = qi / Di
    """
    return (qi / di) * (1.0 - np.exp(-di * t))


def exponential_time_to_rate(q: float, qi: float, di: float) -> float:
    """Time to reach rate q: t = -ln(q/qi) / Di"""
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0
    return -np.log(q / qi) / di


def exponential_eur(qi: float, di: float) -> float:
    """EUR = qi / Di (always finite for exponential decline)"""
    return qi / di


# ==============================================================================
# HYPERBOLIC DECLINE (0 < b, typically b < 2)
# ==============================================================================

def hyperbolic_rate(t: np.ndarray, qi: float, di: float, b: float) -> np.ndarray:
    """
    Hyperbolic decline: q(t) = qi / (1 + b * Di * t)^(1/b)

    For b < 1: EUR is finite (converges)
    For b >= 1: EUR is infinite without an economic limit cutoff
    Unconventional wells often exhibit b > 1 during transient flow.
    """
    return qi / np.power(1.0 + b * di * t, 1.0 / b)


def hyperbolic_cumulative(t: np.ndarray, qi: float, di: float, b: float) -> np.ndarray:
    """
    Cumulative production for hyperbolic decline.

    Np(t) = (qi^b / ((1-b) * Di)) * (qi^(1-b) - q(t)^(1-b))

    Simplified form: Np(t) = (qi / ((1-b)*Di)) * ((1+b*Di*t)^((b-1)/b) - 1) ... wait
    Actually: Np(t) = (qi / ((1-b)*Di)) * (1 - (1+b*Di*t)^((b-1)/b))  for b != 1
    """
    q_t = hyperbolic_rate(t, qi, di, b)
    if abs(b - 1.0) < 1e-10:
        # Harmonic case
        return (qi / di) * np.log(1.0 + di * t)
    return (np.power(qi, b) / ((1.0 - b) * di)) * (
        np.power(qi, 1.0 - b) - np.power(q_t, 1.0 - b)
    )


def hyperbolic_time_to_rate(q: float, qi: float, di: float, b: float) -> float:
    """Time to reach rate q: t = ((qi/q)^b - 1) / (b * Di)"""
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0
    return (np.power(qi / q, b) - 1.0) / (b * di)


# ==============================================================================
# HARMONIC DECLINE (b = 1)
# ==============================================================================

def harmonic_rate(t: np.ndarray, qi: float, di: float) -> np.ndarray:
    """
    Harmonic decline: q(t) = qi / (1 + Di * t)

    Special case of hyperbolic with b = 1.
    EUR is infinite — always requires economic limit.
    """
    return qi / (1.0 + di * t)


def harmonic_cumulative(t: np.ndarray, qi: float, di: float) -> np.ndarray:
    """
    Cumulative production: Np(t) = (qi / Di) * ln(1 + Di * t)

    Diverges as t → ∞ (EUR is infinite without cutoff).
    """
    return (qi / di) * np.log(1.0 + di * t)


def harmonic_time_to_rate(q: float, qi: float, di: float) -> float:
    """Time to reach rate q: t = (qi/q - 1) / Di"""
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0
    return (qi / q - 1.0) / di


# ==============================================================================
# MODEL DISPATCH
# ==============================================================================

MODEL_FUNCTIONS = {
    "exponential": {
        "rate": exponential_rate,
        "cumulative": exponential_cumulative,
        "time_to_rate": exponential_time_to_rate,
        "params": ["qi", "di"],
    },
    "hyperbolic": {
        "rate": hyperbolic_rate,
        "cumulative": hyperbolic_cumulative,
        "time_to_rate": hyperbolic_time_to_rate,
        "params": ["qi", "di", "b"],
    },
    "harmonic": {
        "rate": harmonic_rate,
        "cumulative": harmonic_cumulative,
        "time_to_rate": harmonic_time_to_rate,
        "params": ["qi", "di"],
    },
}
