"""
Stretched Exponential Decline Model (SEDM)
===========================================
Proposed by Valkó & Lee (2010) for unconventional reservoirs.

Key advantage: EUR is always finite regardless of parameter values,
unlike hyperbolic decline with b >= 1.

Rate equation:
    q(t) = qi * exp(-(t/tau)^n)

Cumulative equation:
    Np(t) = (qi * tau / n) * gamma_inc(1/n, (t/tau)^n)

EUR (t → ∞):
    EUR = (qi * tau / n) * Gamma(1/n)

Parameters:
    qi  = Initial production rate
    tau = Characteristic time constant (months)
    n   = Exponent (0 < n < 1 for unconventional, n = 1 gives pure exponential)

Reference:
    Valkó, P.P. & Lee, W.J. (2010). "A Better Way to Forecast Production
    from Unconventional Gas Wells." SPE 134231.
"""

import numpy as np
from scipy.special import gamma, gammainc


def sedm_rate(t: np.ndarray, qi: float, tau: float, n: float) -> np.ndarray:
    """
    SEDM rate: q(t) = qi * exp(-(t/tau)^n)

    When n < 1: decline rate decreases over time (like hyperbolic)
    When n = 1: pure exponential decline
    When n > 1: decline rate increases over time (rare in practice)
    """
    return qi * np.exp(-np.power(t / tau, n))


def sedm_cumulative(t: np.ndarray, qi: float, tau: float, n: float) -> np.ndarray:
    """
    SEDM cumulative: Np(t) = EUR * gammainc(1/n, (t/tau)^n)

    Where EUR = (qi * tau / n) * Gamma(1/n)
    and gammainc is the regularized lower incomplete gamma function.
    """
    eur_total = (qi * tau / n) * gamma(1.0 / n)
    return eur_total * gammainc(1.0 / n, np.power(t / tau, n))


def sedm_eur(qi: float, tau: float, n: float) -> float:
    """
    EUR = (qi * tau / n) * Gamma(1/n)

    Always finite — a major advantage over Arps hyperbolic.
    """
    return (qi * tau / n) * gamma(1.0 / n)


def sedm_time_to_rate(q: float, qi: float, tau: float, n: float) -> float:
    """Time to reach rate q: t = tau * (-ln(q/qi))^(1/n)"""
    if q <= 0 or qi <= 0 or q >= qi:
        return 0.0
    return tau * np.power(-np.log(q / qi), 1.0 / n)
