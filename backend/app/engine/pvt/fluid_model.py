"""
FluidModel: High-level class that orchestrates PVT correlations to generate
complete fluid property tables across a pressure range.

Handles the critical above/below bubble point regime change automatically:
  - Below Pb: gas comes out of solution → Rs decreases, Bo decreases,
    oil viscosity increases, free gas properties become relevant
  - Above Pb: single-phase oil → Rs = Rs@Pb (constant), Bo decreases
    due to compressibility, oil viscosity increases with pressure
"""

import math
import numpy as np
from dataclasses import dataclass, field

from . import correlations as corr


# Available correlation sets for each property
CORRELATION_SETS = {
    "bubble_point": {"standing": corr.standing_bubble_point, "vasquez_beggs": corr.vasquez_beggs_bubble_point},
    "rs": {"standing": corr.standing_rs, "vasquez_beggs": corr.vasquez_beggs_rs},
    "bo": {"standing": corr.standing_bo, "vasquez_beggs": corr.vasquez_beggs_bo},
    "dead_oil_viscosity": {"beal": corr.beal_dead_oil_viscosity, "beggs_robinson": corr.beggs_robinson_dead_oil_viscosity},
    "live_oil_viscosity": {"beggs_robinson": corr.beggs_robinson_live_oil_viscosity},
    "undersaturated_viscosity": {"vasquez_beggs": corr.vasquez_beggs_undersaturated_viscosity},
    "z_factor": {"dranchuk_abou_kassem": corr.dranchuk_abou_kassem_z},
    "gas_viscosity": {"lee_gonzalez_eakin": corr.lee_gonzalez_eakin_gas_viscosity},
    "oil_compressibility": {"vasquez_beggs": corr.vasquez_beggs_oil_compressibility},
}

DEFAULT_CORRELATIONS = {
    "bubble_point": "standing",
    "rs": "standing",
    "bo": "standing",
    "dead_oil_viscosity": "beggs_robinson",
    "live_oil_viscosity": "beggs_robinson",
    "undersaturated_viscosity": "vasquez_beggs",
    "z_factor": "dranchuk_abou_kassem",
    "gas_viscosity": "lee_gonzalez_eakin",
    "oil_compressibility": "vasquez_beggs",
}


@dataclass
class FluidInputs:
    """Input parameters for PVT analysis."""
    api_gravity: float          # API gravity (dimensionless)
    gas_gravity: float          # Gas specific gravity (air = 1.0)
    temperature: float          # Reservoir temperature (°F)
    separator_pressure: float = 100.0   # Separator pressure (psig)
    separator_temperature: float = 60.0  # Separator temperature (°F)
    rs_at_pb: float | None = None       # Known Rs at Pb (scf/stb) — if provided, computes Pb from it


@dataclass
class PVTPoint:
    """PVT properties at a single pressure."""
    pressure: float
    rs: float           # Solution GOR (scf/stb)
    bo: float           # Oil FVF (rb/stb)
    bg: float           # Gas FVF (rb/Mscf)
    mu_o: float         # Oil viscosity (cp)
    mu_g: float         # Gas viscosity (cp)
    z_factor: float     # Gas Z-factor
    co: float           # Oil compressibility (1/psi)
    oil_density: float  # Oil density at condition (lb/ft3)


@dataclass
class PVTResult:
    """Complete PVT analysis result."""
    bubble_point: float
    rs_at_pb: float
    bo_at_pb: float
    mu_o_at_pb: float
    points: list[PVTPoint] = field(default_factory=list)
    inputs: dict = field(default_factory=dict)
    correlations_used: dict = field(default_factory=dict)


class FluidModel:
    """
    Orchestrates PVT correlations for a given fluid system.

    Usage:
        model = FluidModel(FluidInputs(api_gravity=35, gas_gravity=0.75, temperature=200))
        result = model.generate_pvt_table(pressure_range=np.linspace(14.7, 5000, 100))
    """

    def __init__(
        self,
        inputs: FluidInputs,
        correlation_set: dict[str, str] | None = None,
    ):
        self.inputs = inputs
        self.correlations = {**DEFAULT_CORRELATIONS, **(correlation_set or {})}

        # Validate correlation choices
        for prop, choice in self.correlations.items():
            if prop in CORRELATION_SETS and choice not in CORRELATION_SETS[prop]:
                available = list(CORRELATION_SETS[prop].keys())
                raise ValueError(f"Unknown correlation '{choice}' for {prop}. Available: {available}")

    def _get_bubble_point(self) -> float:
        """Calculate bubble point pressure."""
        if self.inputs.rs_at_pb is not None and self.inputs.rs_at_pb > 0:
            # If Rs@Pb is provided, compute Pb from it
            fn = CORRELATION_SETS["bubble_point"][self.correlations["bubble_point"]]
            return fn(
                self.inputs.rs_at_pb,
                self.inputs.gas_gravity,
                self.inputs.api_gravity,
                self.inputs.temperature,
            )
        # Default: estimate Rs from a typical Pb, then iterate
        # Use a reasonable default Rs
        return 14.7  # Will be overridden when rs_at_pb is provided

    def _get_rs(self, pressure: float) -> float:
        """Calculate solution GOR at given pressure."""
        fn = CORRELATION_SETS["rs"][self.correlations["rs"]]
        return fn(pressure, self.inputs.gas_gravity, self.inputs.api_gravity, self.inputs.temperature)

    def _get_bo(self, rs: float) -> float:
        """Calculate oil FVF at given Rs."""
        fn = CORRELATION_SETS["bo"][self.correlations["bo"]]
        return fn(rs, self.inputs.gas_gravity, self.inputs.api_gravity, self.inputs.temperature)

    def _get_dead_oil_viscosity(self) -> float:
        """Calculate dead oil viscosity."""
        fn = CORRELATION_SETS["dead_oil_viscosity"][self.correlations["dead_oil_viscosity"]]
        return fn(self.inputs.api_gravity, self.inputs.temperature)

    def _get_z_factor(self, pressure: float) -> float:
        """Calculate gas Z-factor."""
        fn = CORRELATION_SETS["z_factor"][self.correlations["z_factor"]]
        return fn(pressure, self.inputs.temperature, self.inputs.gas_gravity)

    def _get_gas_viscosity(self, pressure: float, z: float) -> float:
        """Calculate gas viscosity."""
        fn = CORRELATION_SETS["gas_viscosity"][self.correlations["gas_viscosity"]]
        return fn(pressure, self.inputs.temperature, z, self.inputs.gas_gravity)

    def _oil_density(self, rs: float, bo: float) -> float:
        """
        Calculate oil density at reservoir conditions (lb/ft3).

        ρ_o = (350 * γ_o + 0.0764 * γ_g * Rs) / (5.615 * Bo)
        """
        oil_sg = 141.5 / (self.inputs.api_gravity + 131.5)
        rho = (350.0 * oil_sg + 0.0764 * self.inputs.gas_gravity * rs) / (5.615 * bo)
        return rho

    def at_pressure(self, pressure: float, bubble_point: float | None = None) -> PVTPoint:
        """
        Compute all PVT properties at a single pressure.

        Args:
            pressure: Pressure (psia)
            bubble_point: Pre-computed bubble point (psia). If None, uses max pressure as Pb.

        Returns:
            PVTPoint with all fluid properties
        """
        pb = bubble_point or self._get_bubble_point()

        # Z-factor and gas properties (needed at all pressures)
        z = self._get_z_factor(pressure)
        bg = corr.gas_fvf(pressure, self.inputs.temperature, z)
        mu_g = self._get_gas_viscosity(pressure, z)

        # Dead oil viscosity (temperature-dependent only)
        mu_od = self._get_dead_oil_viscosity()

        if pressure <= pb:
            # Below bubble point: gas coming out of solution
            rs = self._get_rs(pressure)
            bo = self._get_bo(rs)
            mu_o = corr.beggs_robinson_live_oil_viscosity(mu_od, rs)
        else:
            # Above bubble point: undersaturated oil
            rs_pb = self._get_rs(pb)
            bo_pb = self._get_bo(rs_pb)

            # Rs is constant above Pb
            rs = rs_pb

            # Bo decreases above Pb due to compressibility
            co = corr.vasquez_beggs_oil_compressibility(
                rs_pb, self.inputs.temperature, self.inputs.gas_gravity,
                self.inputs.api_gravity, pressure
            )
            bo = bo_pb * math.exp(-co * (pressure - pb))
            bo = max(bo, 1.0)

            # Viscosity increases above Pb
            mu_ob = corr.beggs_robinson_live_oil_viscosity(mu_od, rs_pb)
            mu_o = corr.vasquez_beggs_undersaturated_viscosity(mu_ob, pressure, pb)

        co_val = corr.vasquez_beggs_oil_compressibility(
            rs, self.inputs.temperature, self.inputs.gas_gravity,
            self.inputs.api_gravity, pressure
        )

        return PVTPoint(
            pressure=pressure,
            rs=rs,
            bo=bo,
            bg=bg,
            mu_o=mu_o,
            mu_g=mu_g,
            z_factor=z,
            co=co_val,
            oil_density=self._oil_density(rs, bo),
        )

    def generate_pvt_table(
        self,
        pressure_range: np.ndarray | list[float] | None = None,
        num_points: int = 50,
        max_pressure: float = 6000.0,
    ) -> PVTResult:
        """
        Generate a complete PVT table across a pressure range.

        If rs_at_pb is provided in inputs, bubble point is computed from it.
        Otherwise, bubble point is estimated at max_pressure to give reasonable Rs.

        Args:
            pressure_range: Explicit pressure array. If None, auto-generates.
            num_points: Number of pressure points (used when pressure_range is None)
            max_pressure: Maximum pressure for auto-range (psia)

        Returns:
            PVTResult with bubble point and all computed PVT points
        """
        # Step 1: Determine bubble point
        if self.inputs.rs_at_pb is not None and self.inputs.rs_at_pb > 0:
            # Known Rs@Pb → compute Pb
            fn_pb = CORRELATION_SETS["bubble_point"][self.correlations["bubble_point"]]
            pb = fn_pb(
                self.inputs.rs_at_pb,
                self.inputs.gas_gravity,
                self.inputs.api_gravity,
                self.inputs.temperature,
            )
        else:
            # No Rs@Pb given: estimate Pb from max_pressure Rs
            # Use max_pressure as reservoir pressure to get Rs, then compute Pb
            rs_est = self._get_rs(max_pressure)
            fn_pb = CORRELATION_SETS["bubble_point"][self.correlations["bubble_point"]]
            pb = fn_pb(
                rs_est,
                self.inputs.gas_gravity,
                self.inputs.api_gravity,
                self.inputs.temperature,
            )

        # Step 2: Rs at bubble point
        rs_at_pb = self._get_rs(pb)
        bo_at_pb = self._get_bo(rs_at_pb)
        mu_od = self._get_dead_oil_viscosity()
        mu_o_at_pb = corr.beggs_robinson_live_oil_viscosity(mu_od, rs_at_pb)

        # Step 3: Build pressure range
        if pressure_range is None:
            # Create range that includes bubble point
            p_min = 14.7
            p_max = max(max_pressure, pb * 1.3)
            pressures = np.sort(np.unique(np.concatenate([
                np.linspace(p_min, pb, num_points // 2),
                np.array([pb]),
                np.linspace(pb, p_max, num_points // 2),
            ])))
        else:
            pressures = np.array(pressure_range)

        # Step 4: Compute properties at each pressure
        points = []
        for p in pressures:
            try:
                point = self.at_pressure(float(p), bubble_point=pb)
                points.append(point)
            except (ValueError, ZeroDivisionError, OverflowError):
                continue

        return PVTResult(
            bubble_point=pb,
            rs_at_pb=rs_at_pb,
            bo_at_pb=bo_at_pb,
            mu_o_at_pb=mu_o_at_pb,
            points=points,
            inputs={
                "api_gravity": self.inputs.api_gravity,
                "gas_gravity": self.inputs.gas_gravity,
                "temperature": self.inputs.temperature,
                "separator_pressure": self.inputs.separator_pressure,
                "separator_temperature": self.inputs.separator_temperature,
            },
            correlations_used=dict(self.correlations),
        )

    def to_dict(self) -> dict:
        """Serialize the PVT result to a JSON-compatible dict."""
        result = self.generate_pvt_table()
        return {
            "bubble_point": result.bubble_point,
            "rs_at_pb": result.rs_at_pb,
            "bo_at_pb": result.bo_at_pb,
            "mu_o_at_pb": result.mu_o_at_pb,
            "inputs": result.inputs,
            "correlations_used": result.correlations_used,
            "table": [
                {
                    "pressure": pt.pressure,
                    "rs": pt.rs,
                    "bo": pt.bo,
                    "bg": pt.bg,
                    "mu_o": pt.mu_o,
                    "mu_g": pt.mu_g,
                    "z_factor": pt.z_factor,
                    "co": pt.co,
                    "oil_density": pt.oil_density,
                }
                for pt in result.points
            ],
        }
