"""Physical constants used in reservoir engineering calculations."""

# Gas constant
R_UNIVERSAL = 10.7316  # psia·ft³/(lb-mol·°R)

# Standard conditions
P_SC = 14.696  # psia (standard pressure)
T_SC = 520.0   # °R (60°F in Rankine)

# Water properties at standard conditions
WATER_DENSITY_SC = 62.4  # lb/ft³
WATER_COMPRESSIBILITY = 3.0e-6  # 1/psi (typical)
WATER_VISCOSITY = 1.0  # cp at reservoir conditions (approximate)

# Oil properties (typical ranges for reference)
OIL_API_LIGHT = 31.1  # API gravity boundary: light oil
OIL_API_HEAVY = 22.3  # API gravity boundary: heavy oil

# Conversion factors
BBL_PER_ACRE_FT = 7758.0
MCF_PER_BOE = 6.0

# Gravitational acceleration
G = 32.174  # ft/s²

# Pi
PI = 3.14159265358979323846
