"""
Oil field unit conversion utilities.
Supports common petroleum engineering unit conversions.
"""


def bbl_to_m3(bbl: float) -> float:
    return bbl * 0.158987

def m3_to_bbl(m3: float) -> float:
    return m3 / 0.158987

def mcf_to_m3(mcf: float) -> float:
    return mcf * 28.3168

def m3_to_mcf(m3: float) -> float:
    return m3 / 28.3168

def psi_to_kpa(psi: float) -> float:
    return psi * 6.89476

def kpa_to_psi(kpa: float) -> float:
    return kpa / 6.89476

def psi_to_mpa(psi: float) -> float:
    return psi * 0.00689476

def fahrenheit_to_celsius(f: float) -> float:
    return (f - 32) * 5 / 9

def celsius_to_fahrenheit(c: float) -> float:
    return c * 9 / 5 + 32

def fahrenheit_to_rankine(f: float) -> float:
    return f + 459.67

def ft_to_m(ft: float) -> float:
    return ft * 0.3048

def m_to_ft(m: float) -> float:
    return m / 0.3048

def md_to_m2(md: float) -> float:
    """Millidarcy to square meters."""
    return md * 9.869233e-16

def acre_to_m2(acres: float) -> float:
    return acres * 4046.86

def acre_ft_to_bbl(acre_ft: float) -> float:
    """Acre-feet to barrels."""
    return acre_ft * 7758.0

def boe_conversion(gas_mcf: float) -> float:
    """Convert gas (Mcf) to BOE using 6:1 ratio."""
    return gas_mcf / 6.0
