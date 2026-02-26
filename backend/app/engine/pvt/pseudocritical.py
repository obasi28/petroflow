"""
Pseudocritical property correlations for natural gas mixtures.

Reference:
  - Sutton, R.P. (1985). "Compressibility Factors for High-Molecular-Weight
    Reservoir Gases." SPE Annual Technical Conference and Exhibition.
"""


def sutton_pseudocritical(gas_gravity: float) -> tuple[float, float]:
    """
    Sutton (1985) pseudocritical properties for natural gas.

    Uses gas specific gravity to estimate pseudocritical pressure and
    temperature needed for the Dranchuk-Abou-Kassem Z-factor calculation.

    Args:
        gas_gravity: Gas specific gravity (air = 1.0)

    Returns:
        Tuple of (pseudocritical_pressure_psia, pseudocritical_temperature_R)
    """
    ppc = 756.8 - 131.0 * gas_gravity - 3.6 * gas_gravity ** 2
    tpc = 169.2 + 349.5 * gas_gravity - 74.0 * gas_gravity ** 2
    return ppc, tpc
