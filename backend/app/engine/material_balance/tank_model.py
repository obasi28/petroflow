"""
Tank Model -- Material Balance Orchestrator.

Provides a single entry-point (:class:`TankModel`) that runs both the
Schilthuis general MBE and the Havlena-Odeh straight-line analysis,
combines results, and returns pre-formatted data suitable for frontend
charting.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from .schilthuis import (
    PressureStep,
    PVTAtPressure,
    SchilthiusMBE,
    SchilthiusResult,
)
from .havlena_odeh import HavlenaOdehAnalysis, HavlenaOdehResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Input / Output data classes
# ---------------------------------------------------------------------------

@dataclass
class MBEInputs:
    """Complete input set for a material-balance calculation."""

    pressure_history: list[PressureStep]
    pvt_data: list[PVTAtPressure]
    initial_pressure: float             # pi (psia)
    boi: float                          # Initial Bo (rb/stb)
    bgi: float                          # Initial Bg (rb/scf)
    rsi: float                          # Initial Rs (scf/stb)
    gas_cap_ratio: float | None = None  # m; None = determine from data
    swi: float = 0.2                    # Initial water saturation
    cf: float = 3.0e-6                  # Formation compressibility (1/psi)
    cw: float = 3.0e-6                  # Water compressibility (1/psi)


@dataclass
class MBEResult:
    """Combined result from both material-balance methods."""

    ooip: float | None                              # N (STB)
    ogip: float | None                              # G (scf)
    gas_cap_ratio: float | None                     # m
    water_influx: list[float]                       # We at each step (rb)
    drive_mechanism: str                            # Primary drive mechanism
    drive_indices: dict                             # All drive indices
    schilthuis: SchilthiusResult | None = None
    havlena_odeh: HavlenaOdehResult | None = None
    plot_data: dict = field(default_factory=dict)   # Pre-formatted for charts


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class TankModel:
    """High-level orchestrator for tank (zero-dimensional) material balance.

    Usage::

        model = TankModel()
        result = model.run(inputs, method="both")

    Parameters for :meth:`run`:
        inputs : MBEInputs
        method : ``"schilthuis"``, ``"havlena_odeh"``, or ``"both"``
    """

    def __init__(self) -> None:
        self._schilthuis = SchilthiusMBE()
        self._havlena_odeh = HavlenaOdehAnalysis()

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def run(self, inputs: MBEInputs, method: str = "both") -> MBEResult:
        """Execute material-balance analysis.

        Parameters
        ----------
        inputs : MBEInputs
            All required reservoir / production / PVT data.
        method : str
            One of ``"schilthuis"``, ``"havlena_odeh"``, or ``"both"``.

        Returns
        -------
        MBEResult
        """
        method = method.lower().strip()
        if method not in ("schilthuis", "havlena_odeh", "both"):
            raise ValueError(
                f"method must be 'schilthuis', 'havlena_odeh', or 'both'; "
                f"got '{method}'."
            )

        # Determine m to pass to engines
        m_schilthuis = inputs.gas_cap_ratio if inputs.gas_cap_ratio is not None else 0.0
        m_havlena = inputs.gas_cap_ratio  # None triggers estimation

        sch_result: SchilthiusResult | None = None
        ho_result: HavlenaOdehResult | None = None

        # ---- Schilthuis ------------------------------------------------
        if method in ("schilthuis", "both"):
            sch_result = self._schilthuis.calculate(
                pressure_history=inputs.pressure_history,
                pvt_data=inputs.pvt_data,
                pi=inputs.initial_pressure,
                boi=inputs.boi,
                bgi=inputs.bgi,
                rsi=inputs.rsi,
                m=m_schilthuis,
                swi=inputs.swi,
                cf=inputs.cf,
                cw=inputs.cw,
            )

        # ---- Havlena-Odeh ----------------------------------------------
        if method in ("havlena_odeh", "both"):
            ho_result = self._havlena_odeh.analyze(
                pressure_history=inputs.pressure_history,
                pvt_data=inputs.pvt_data,
                pi=inputs.initial_pressure,
                boi=inputs.boi,
                bgi=inputs.bgi,
                rsi=inputs.rsi,
                m=m_havlena,
                swi=inputs.swi,
                cf=inputs.cf,
                cw=inputs.cw,
            )

        # ---- Combine results -------------------------------------------
        N, m_final, drive_indices, drive_mechanism, water_influx = (
            self._combine_results(sch_result, ho_result, inputs)
        )

        # OGIP: G = N * Rsi + (m * N * Boi) / Bgi
        ogip: float | None = None
        if N is not None:
            m_eff = m_final if m_final is not None else 0.0
            ogip = N * inputs.rsi + (m_eff * N * inputs.boi) / inputs.bgi

        # ---- Build plot data -------------------------------------------
        plot_data = self._build_plot_data(
            inputs=inputs,
            sch=sch_result,
            ho=ho_result,
            N=N,
        )

        return MBEResult(
            ooip=N,
            ogip=ogip,
            gas_cap_ratio=m_final,
            water_influx=water_influx,
            drive_mechanism=drive_mechanism,
            drive_indices=drive_indices,
            schilthuis=sch_result,
            havlena_odeh=ho_result,
            plot_data=plot_data,
        )

    # ------------------------------------------------------------------ #
    # Private helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _combine_results(
        sch: SchilthiusResult | None,
        ho: HavlenaOdehResult | None,
        inputs: MBEInputs,
    ) -> tuple[float | None, float | None, dict, str, list[float]]:
        """Pick the best N, m, drive indices, and water influx.

        Strategy:
            - Prefer Havlena-Odeh N when R^2 >= 0.90 (better statistical basis)
            - Fall back to Schilthuis N
            - Use Schilthuis for water influx (direct calculation)
        """
        N: float | None = None
        m_final: float | None = inputs.gas_cap_ratio
        drive_indices: dict = {}
        drive_mechanism: str = "Unknown"
        water_influx: list[float] = []

        # Havlena-Odeh contribution
        if ho is not None and ho.N_estimate is not None:
            if ho.r_squared >= 0.90:
                N = ho.N_estimate
                if ho.m_estimate is not None:
                    m_final = ho.m_estimate
                drive_indices = ho.drive_indices
                drive_mechanism = ho.drive_mechanism

        # Schilthuis contribution (fallback for N, primary for We)
        if sch is not None:
            water_influx = sch.We
            if N is None and sch.ooip is not None:
                N = sch.ooip
                m_final = sch.gas_cap_ratio
                drive_indices = sch.drive_indices
                drive_mechanism = sch.drive_mechanism
            # If H-O provided N but Schilthuis has drive info, prefer
            # Schilthuis drive indices (they include We directly)
            if N is not None and sch.drive_indices:
                drive_indices = sch.drive_indices
                drive_mechanism = sch.drive_mechanism

        # If only H-O ran, no water influx available
        if not water_influx and ho is not None:
            water_influx = [0.0] * len(ho.F_values)

        return N, m_final, drive_indices, drive_mechanism, water_influx

    @staticmethod
    def _build_plot_data(
        inputs: MBEInputs,
        sch: SchilthiusResult | None,
        ho: HavlenaOdehResult | None,
        N: float | None,
    ) -> dict:
        """Construct a dict of arrays ready for frontend charting.

        Keys:
            pressure_vs_production : { pressures, np_cum }
            f_vs_et                : { F, Et, regression_line }
            campbell               : { np, f_over_et }
            drive_indices          : { labels, values }
        """
        plot: dict = {}

        # Pressure vs cumulative production
        plot["pressure_vs_production"] = {
            "pressures": [s.pressure for s in inputs.pressure_history],
            "np_cum": [s.np_cum for s in inputs.pressure_history],
        }

        # F vs Et (prefer Havlena-Odeh data for the straight-line plot)
        if ho is not None:
            F_vals = ho.F_values
            Et_vals = ho.Et_values
            reg_line: dict | None = None
            if ho.regression_slope is not None and ho.regression_intercept is not None:
                et_min = min(v for v in Et_vals if v > 0) if any(v > 0 for v in Et_vals) else 0.0
                et_max = max(Et_vals)
                reg_line = {
                    "x": [et_min, et_max],
                    "y": [
                        ho.regression_slope * et_min + ho.regression_intercept,
                        ho.regression_slope * et_max + ho.regression_intercept,
                    ],
                    "slope": ho.regression_slope,
                    "intercept": ho.regression_intercept,
                    "r_squared": ho.r_squared,
                }
            plot["f_vs_et"] = {
                "F": F_vals,
                "Et": Et_vals,
                "regression_line": reg_line,
            }
        elif sch is not None:
            plot["f_vs_et"] = {
                "F": sch.F,
                "Et": sch.Et,
                "regression_line": None,
            }

        # Campbell plot
        if ho is not None:
            plot["campbell"] = {
                "np": ho.campbell_x,
                "f_over_et": ho.campbell_y,
            }
        elif sch is not None:
            # Build Campbell from Schilthuis data
            np_vals: list[float] = []
            f_over_et_vals: list[float] = []
            for i, step in enumerate(inputs.pressure_history):
                if sch.Et[i] > 0:
                    np_vals.append(step.np_cum)
                    f_over_et_vals.append(sch.F[i] / sch.Et[i])
            plot["campbell"] = {
                "np": np_vals,
                "f_over_et": f_over_et_vals,
            }

        # Drive indices (pie / bar chart)
        drive: dict = {}
        if sch is not None:
            drive = sch.drive_indices
        elif ho is not None:
            drive = ho.drive_indices
        if drive:
            plot["drive_indices"] = {
                "labels": list(drive.keys()),
                "values": list(drive.values()),
            }
        else:
            plot["drive_indices"] = {"labels": [], "values": []}

        return plot
