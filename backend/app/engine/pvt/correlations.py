"""
Industry-standard PVT correlations for petroleum fluid properties.

References:
  - Standing, M.B. (1947). "A Pressure-Volume-Temperature Correlation for
    Mixtures of California Oils and Gases." Drilling and Production Practice, API.
  - Vasquez, M. and Beggs, H.D. (1980). "Correlations for Fluid Physical
    Property Prediction." JPT, June 1980.
  - Beggs, H.D. and Robinson, J.R. (1975). "Estimating the Viscosity of
    Crude Oil Systems." JPT, September 1975.
  - Beal, C. (1946). "The Viscosity of Air, Water, Natural Gas, Crude Oil
    and its Associated Gases at Oil Field Temperatures and Pressures."
    Trans. AIME 165, 94-115.
  - Lee, A.L., Gonzalez, M.H., and Eakin, B.E. (1966). "The Viscosity of
    Natural Gases." JPT, August 1966.
  - Dranchuk, P.M. and Abou-Kassem, J.H. (1975). "Calculation of Z Factors
    for Natural Gases Using Equations of State." JCPT, July-September 1975.
"""

import math
import numpy as np
from .pseudocritical import sutton_pseudocritical


# ─────────────────────────────────────────────────────────────
# BUBBLE POINT PRESSURE (Pb)
# ─────────────────────────────────────────────────────────────

def standing_bubble_point(
    rs: float, gas_gravity: float, api_gravity: float, temperature: float
) -> float:
    """
    Standing (1947) bubble point pressure correlation.

    Args:
        rs: Solution GOR at bubble point (scf/stb)
        gas_gravity: Gas specific gravity (air = 1.0)
        api_gravity: API gravity of stock-tank oil
        temperature: Temperature (°F)

    Returns:
        Bubble point pressure (psia)
    """
    if rs <= 0 or gas_gravity <= 0:
        return 14.7

    a = 0.00091 * temperature - 0.0125 * api_gravity
    pb = 18.2 * ((rs / gas_gravity) ** 0.83 * 10 ** a - 1.4)
    return max(pb, 14.7)


def vasquez_beggs_bubble_point(
    rs: float, gas_gravity: float, api_gravity: float, temperature: float,
    separator_pressure: float = 100.0,
) -> float:
    """
    Vasquez-Beggs (1980) bubble point pressure correlation.

    Args:
        rs: Solution GOR at bubble point (scf/stb)
        gas_gravity: Gas specific gravity (air = 1.0)
        api_gravity: API gravity of stock-tank oil
        temperature: Temperature (°F)
        separator_pressure: Separator pressure (psig)

    Returns:
        Bubble point pressure (psia)
    """
    if rs <= 0 or gas_gravity <= 0:
        return 14.7

    # Corrected gas gravity (Vasquez-Beggs separator correction)
    gg_corr = gas_gravity * (
        1.0 + 5.912e-5 * api_gravity * (temperature - 460.0)
        * math.log10(max(separator_pressure + 14.7, 14.7) / 114.7)
    )
    # Note: temperature in the V-B correction is sometimes reservoir T (°F).
    # The original paper uses °F directly; the 460 offset handles Rankine if
    # that variant is chosen. We keep °F consistent here.
    gg_corr = gas_gravity  # Simplified: use uncorrected for robustness

    if api_gravity <= 30:
        c1, c2, c3 = 0.0362, 1.0937, 25.724
    else:
        c1, c2, c3 = 0.0178, 1.187, 23.931

    pb = (rs / (c1 * gg_corr * math.exp(c3 * api_gravity / (temperature + 459.67)))) ** (1.0 / c2)
    return max(pb, 14.7)


# ─────────────────────────────────────────────────────────────
# SOLUTION GAS-OIL RATIO (Rs)
# ─────────────────────────────────────────────────────────────

def standing_rs(
    pressure: float, gas_gravity: float, api_gravity: float, temperature: float
) -> float:
    """
    Standing (1947) solution GOR correlation.

    Args:
        pressure: Pressure (psia)
        gas_gravity: Gas specific gravity
        api_gravity: API gravity
        temperature: Temperature (°F)

    Returns:
        Solution GOR (scf/stb)
    """
    if pressure <= 14.7:
        return 0.0

    a = 0.00091 * temperature - 0.0125 * api_gravity
    rs = gas_gravity * ((pressure / 18.2 + 1.4) * 10 ** (-a)) ** 1.2048
    return max(rs, 0.0)


def vasquez_beggs_rs(
    pressure: float, gas_gravity: float, api_gravity: float, temperature: float,
    separator_pressure: float = 100.0,
) -> float:
    """
    Vasquez-Beggs (1980) solution GOR correlation.

    Args:
        pressure: Pressure (psia)
        gas_gravity: Gas specific gravity
        api_gravity: API gravity
        temperature: Temperature (°F)
        separator_pressure: Separator pressure (psig)

    Returns:
        Solution GOR (scf/stb)
    """
    if pressure <= 14.7:
        return 0.0

    if api_gravity <= 30:
        c1, c2, c3 = 0.0362, 1.0937, 25.724
    else:
        c1, c2, c3 = 0.0178, 1.187, 23.931

    rs = c1 * gas_gravity * pressure ** c2 * math.exp(c3 * api_gravity / (temperature + 459.67))
    return max(rs, 0.0)


# ─────────────────────────────────────────────────────────────
# OIL FORMATION VOLUME FACTOR (Bo)
# ─────────────────────────────────────────────────────────────

def standing_bo(
    rs: float, gas_gravity: float, api_gravity: float, temperature: float
) -> float:
    """
    Standing (1947) oil FVF correlation.

    Args:
        rs: Solution GOR (scf/stb)
        gas_gravity: Gas specific gravity
        api_gravity: API gravity
        temperature: Temperature (°F)

    Returns:
        Oil FVF (rb/stb)
    """
    oil_gravity = 141.5 / (api_gravity + 131.5)  # API → specific gravity
    a = rs * (gas_gravity / oil_gravity) ** 0.5 + 1.25 * temperature
    bo = 0.9759 + 12e-5 * a ** 1.2
    return max(bo, 1.0)


def vasquez_beggs_bo(
    rs: float, gas_gravity: float, api_gravity: float, temperature: float,
    separator_pressure: float = 100.0,
) -> float:
    """
    Vasquez-Beggs (1980) oil FVF correlation.

    Args:
        rs: Solution GOR (scf/stb)
        gas_gravity: Gas specific gravity
        api_gravity: API gravity
        temperature: Temperature (°F)
        separator_pressure: Separator pressure (psig)

    Returns:
        Oil FVF (rb/stb)
    """
    if api_gravity <= 30:
        c1, c2, c3 = 4.677e-4, 1.751e-5, -1.811e-8
    else:
        c1, c2, c3 = 4.670e-4, 1.100e-5, 1.337e-9

    bo = 1.0 + c1 * rs + (temperature - 60) * (api_gravity / gas_gravity) * (c2 + c3 * rs)
    return max(bo, 1.0)


# ─────────────────────────────────────────────────────────────
# OIL VISCOSITY (μo)
# ─────────────────────────────────────────────────────────────

def beal_dead_oil_viscosity(api_gravity: float, temperature: float) -> float:
    """
    Beal (1946) dead oil viscosity correlation.

    Args:
        api_gravity: API gravity
        temperature: Temperature (°F)

    Returns:
        Dead oil viscosity (cp)
    """
    a = 10 ** (0.43 + (8.33 / api_gravity))
    mu_od = (0.32 + (1.8e7 / api_gravity ** 4.53)) * (360.0 / (temperature + 200.0)) ** a
    return max(mu_od, 0.01)


def beggs_robinson_dead_oil_viscosity(api_gravity: float, temperature: float) -> float:
    """
    Beggs-Robinson (1975) dead oil viscosity correlation.

    Args:
        api_gravity: API gravity
        temperature: Temperature (°F)

    Returns:
        Dead oil viscosity (cp)
    """
    z = 3.0324 - 0.02023 * api_gravity
    y = 10 ** z
    x = y * temperature ** (-1.163)
    mu_od = 10 ** x - 1.0
    return max(mu_od, 0.01)


def beggs_robinson_live_oil_viscosity(mu_od: float, rs: float) -> float:
    """
    Beggs-Robinson (1975) live (saturated) oil viscosity.

    Args:
        mu_od: Dead oil viscosity (cp)
        rs: Solution GOR (scf/stb)

    Returns:
        Live oil viscosity (cp)
    """
    if rs <= 0:
        return mu_od

    a = 10.715 * (rs + 100) ** (-0.515)
    b = 5.44 * (rs + 150) ** (-0.338)
    mu_o = a * mu_od ** b
    return max(mu_o, 0.01)


def vasquez_beggs_undersaturated_viscosity(
    mu_ob: float, pressure: float, bubble_point: float
) -> float:
    """
    Vasquez-Beggs (1980) undersaturated oil viscosity.

    Args:
        mu_ob: Oil viscosity at bubble point (cp)
        pressure: Current pressure (psia)
        bubble_point: Bubble point pressure (psia)

    Returns:
        Undersaturated oil viscosity (cp)
    """
    if pressure <= bubble_point:
        return mu_ob

    m = 2.6 * pressure ** 1.187 * math.exp(-11.513 - 8.98e-5 * pressure)
    mu_o = mu_ob * (pressure / bubble_point) ** m
    return max(mu_o, 0.01)


# ─────────────────────────────────────────────────────────────
# GAS Z-FACTOR (Dranchuk-Abou-Kassem)
# ─────────────────────────────────────────────────────────────

def dranchuk_abou_kassem_z(
    pressure: float, temperature: float, gas_gravity: float,
    max_iter: int = 50, tol: float = 1e-8,
) -> float:
    """
    Dranchuk-Abou-Kassem (1975) Z-factor using Newton-Raphson iteration.

    This 11-constant equation is one of the most widely used gas compressibility
    correlations in the petroleum industry.

    Args:
        pressure: Pressure (psia)
        temperature: Temperature (°F)
        gas_gravity: Gas specific gravity
        max_iter: Maximum Newton-Raphson iterations
        tol: Convergence tolerance

    Returns:
        Gas compressibility factor (Z)
    """
    if pressure <= 14.7:
        return 1.0

    ppc, tpc = sutton_pseudocritical(gas_gravity)
    ppr = pressure / ppc
    tpr = (temperature + 459.67) / tpc

    # DAK constants
    A1, A2, A3, A4, A5 = 0.3265, -1.0700, -0.5339, 0.01569, -0.05165
    A6, A7, A8, A9, A10, A11 = 0.5475, -0.7361, 0.1844, 0.1056, 0.6134, 0.7210

    # Newton-Raphson on reduced density (rho_r)
    rho_r = 0.27 * ppr / tpr  # initial guess

    for _ in range(max_iter):
        rho_r2 = rho_r * rho_r
        rho_r5 = rho_r ** 5

        c1 = A1 + A2 / tpr + A3 / tpr ** 3 + A4 / tpr ** 4 + A5 / tpr ** 5
        c2 = A6 + A7 / tpr + A8 / tpr ** 2
        c3 = A9 * (A7 / tpr + A8 / tpr ** 2)
        c4 = A10 * (1 + A11 * rho_r2) * (rho_r2 / tpr ** 3) * math.exp(-A11 * rho_r2)

        f = (
            0.27 * ppr / (rho_r * tpr)
            - 1.0
            - c1 * rho_r
            - c2 * rho_r2
            + c3 * rho_r5
            - c4
        )

        # Derivative df/d(rho_r) for Newton step
        dc4_drho = (
            A10 / tpr ** 3
            * rho_r
            * (2.0 + 2.0 * A11 * rho_r2 * (1.0 - A11 * rho_r2 + (A11 * rho_r2) ** 0)
               - 2.0 * A11 * rho_r2)
            * math.exp(-A11 * rho_r2)
        )
        # Simplified derivative
        dc4_drho = (
            A10 * (2 * rho_r / tpr ** 3)
            * (1 + A11 * rho_r2 - A11 ** 2 * rho_r ** 4)
            * math.exp(-A11 * rho_r2)
        )

        df = (
            -0.27 * ppr / (rho_r2 * tpr)
            - c1
            - 2 * c2 * rho_r
            + 5 * c3 * rho_r ** 4
            - dc4_drho
        )

        if abs(df) < 1e-30:
            break

        rho_r_new = rho_r - f / df

        if rho_r_new <= 0:
            rho_r = rho_r * 0.5
            continue

        if abs(rho_r_new - rho_r) < tol:
            rho_r = rho_r_new
            break

        rho_r = rho_r_new

    z = 0.27 * ppr / (rho_r * tpr)
    return max(z, 0.1)


# ─────────────────────────────────────────────────────────────
# GAS PROPERTIES
# ─────────────────────────────────────────────────────────────

def gas_fvf(pressure: float, temperature: float, z_factor: float) -> float:
    """
    Gas formation volume factor from real gas law.

    Bg = 0.00504 * Z * T / P  (in rb/Mscf when T in °R, P in psia)

    Args:
        pressure: Pressure (psia)
        temperature: Temperature (°F)
        z_factor: Gas compressibility factor

    Returns:
        Gas FVF (rb/Mscf)
    """
    if pressure <= 0:
        return 999.0

    t_rankine = temperature + 459.67
    bg = 0.00504 * z_factor * t_rankine / pressure
    return bg


def lee_gonzalez_eakin_gas_viscosity(
    pressure: float, temperature: float, z_factor: float, gas_gravity: float
) -> float:
    """
    Lee-Gonzalez-Eakin (1966) gas viscosity correlation.

    Args:
        pressure: Pressure (psia)
        temperature: Temperature (°F)
        z_factor: Gas compressibility factor
        gas_gravity: Gas specific gravity

    Returns:
        Gas viscosity (cp)
    """
    t_rankine = temperature + 459.67
    mg = 28.97 * gas_gravity  # molecular weight of gas

    # Gas density (lb/ft3)
    rho_g = pressure * mg / (z_factor * 10.73 * t_rankine)

    k = (9.4 + 0.02 * mg) * t_rankine ** 1.5 / (209 + 19 * mg + t_rankine)
    x = 3.5 + 986.0 / t_rankine + 0.01 * mg
    y = 2.4 - 0.2 * x

    mu_g = 1e-4 * k * math.exp(x * (rho_g / 62.4) ** y)
    return max(mu_g, 1e-5)


# ─────────────────────────────────────────────────────────────
# OIL COMPRESSIBILITY (co)
# ─────────────────────────────────────────────────────────────

def vasquez_beggs_oil_compressibility(
    rs: float, temperature: float, gas_gravity: float,
    api_gravity: float, pressure: float
) -> float:
    """
    Vasquez-Beggs (1980) undersaturated oil compressibility.

    Args:
        rs: Solution GOR at bubble point (scf/stb)
        temperature: Temperature (°F)
        gas_gravity: Gas specific gravity
        api_gravity: API gravity
        pressure: Pressure (psia)

    Returns:
        Oil compressibility (1/psi)
    """
    if pressure <= 0:
        return 0.0

    co = (-1433.0 + 5 * rs + 17.2 * temperature - 1180 * gas_gravity + 12.61 * api_gravity) / (1e5 * pressure)
    return max(co, 1e-7)
