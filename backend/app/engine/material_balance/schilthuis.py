"""
Schilthuis General Material Balance Equation (MBE) Engine.

Implements the classical zero-dimensional (tank) material balance:

    F = N * [Eo + m*Eg + Efw] + We

Where:
    F   = Underground withdrawal (rb)
    N   = Original oil in place, OOIP (STB)
    Eo  = Oil + dissolved-gas expansion (rb/stb)
    Eg  = Gas-cap expansion (rb/stb)
    Efw = Formation + connate-water expansion (rb/stb)
    We  = Cumulative water influx (rb)
    m   = Ratio of initial gas-cap volume to initial oil-zone volume

References:
    - Schilthuis, R.J., "Active Oil and Reservoir Energy", Trans. AIME, 1936.
    - Dake, L.P., "Fundamentals of Reservoir Engineering", Ch. 3.
    - Craft, B.C., Hawkins, M.F., "Applied Petroleum Reservoir Engineering".
"""

from __future__ import annotations

import logging
import warnings
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PressureStep:
    """Production and pressure data at a given time step."""

    pressure: float          # Current reservoir pressure (psia)
    np_cum: float            # Cumulative oil produced (STB)
    gp_cum: float            # Cumulative gas produced (Mscf) -- converted to scf internally
    wp_cum: float            # Cumulative water produced (STB)
    wi_cum: float = 0.0      # Cumulative water injected (STB)
    gi_cum: float = 0.0      # Cumulative gas injected (Mscf) -- converted to scf internally


@dataclass
class PVTAtPressure:
    """PVT properties at a specific pressure.

    Convention:
        bo  -- Oil formation volume factor (rb/stb)
        bg  -- Gas formation volume factor (rb/scf)  NOTE: per scf, NOT per Mscf
        bw  -- Water formation volume factor (rb/stb)
        rs  -- Solution gas-oil ratio (scf/stb)
    """

    pressure: float          # psia
    bo: float                # rb/stb
    bg: float                # rb/scf
    bw: float                # rb/stb
    rs: float                # scf/stb


@dataclass
class SchilthiusResult:
    """Result container for the Schilthuis MBE calculation."""

    pressures: list[float]
    F: list[float]           # Underground withdrawal at each step (rb)
    Eo: list[float]          # Oil expansion term (rb/stb)
    Eg: list[float]          # Gas-cap expansion term (rb/stb)
    Efw: list[float]         # Formation + connate-water expansion term (rb/stb)
    Et: list[float]          # Total expansion = Eo + m*Eg + Efw (rb/stb)
    We: list[float]          # Water influx at each step (rb)
    ooip: float | None       # Estimated N (STB)
    gas_cap_ratio: float | None  # m used / estimated
    drive_indices: dict = field(default_factory=dict)
    drive_mechanism: str = ""


# ---------------------------------------------------------------------------
# Schilthuis MBE Engine
# ---------------------------------------------------------------------------

class SchilthiusMBE:
    """General Material Balance Equation solver (Schilthuis formulation).

    Usage::

        mbe = SchilthiusMBE()
        result = mbe.calculate(
            pressure_history=[...],
            pvt_data=[...],
            pi=4000.0, boi=1.35, bgi=0.00065, rsi=750.0,
            m=0.0,
        )
    """

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #

    def calculate(
        self,
        pressure_history: list[PressureStep],
        pvt_data: list[PVTAtPressure],
        pi: float,
        boi: float,
        bgi: float,
        rsi: float,
        m: float = 0.0,
        swi: float = 0.2,
        cf: float = 3.0e-6,
        cw: float = 3.0e-6,
    ) -> SchilthiusResult:
        """Run the Schilthuis general MBE.

        Parameters
        ----------
        pressure_history : list[PressureStep]
            Time-ordered production / pressure data.
        pvt_data : list[PVTAtPressure]
            PVT properties at discrete pressures (will be interpolated).
        pi : float
            Initial reservoir pressure (psia).
        boi : float
            Initial oil FVF (rb/stb).
        bgi : float
            Initial gas FVF (rb/scf).
        rsi : float
            Initial solution GOR (scf/stb).
        m : float
            Gas-cap to oil-zone volume ratio.  ``0`` = no gas cap.
        swi : float
            Initial water saturation (fraction).
        cf : float
            Formation compressibility (1/psi).
        cw : float
            Connate-water compressibility (1/psi).

        Returns
        -------
        SchilthiusResult
        """
        self._validate_inputs(pressure_history, pvt_data)

        # Build interpolation arrays from PVT data
        pvt_pressures, bo_arr, bg_arr, bw_arr, rs_arr = self._unpack_pvt(pvt_data)

        n_steps = len(pressure_history)
        F_arr = np.zeros(n_steps)
        Eo_arr = np.zeros(n_steps)
        Eg_arr = np.zeros(n_steps)
        Efw_arr = np.zeros(n_steps)

        for i, step in enumerate(pressure_history):
            p = step.pressure

            # Interpolate PVT at this pressure
            bo = float(np.interp(p, pvt_pressures, bo_arr))
            bg = float(np.interp(p, pvt_pressures, bg_arr))
            bw = float(np.interp(p, pvt_pressures, bw_arr))
            rs = float(np.interp(p, pvt_pressures, rs_arr))

            # Convert Mscf -> scf for cumulative gas
            gp_scf = step.gp_cum * 1_000.0
            gi_scf = step.gi_cum * 1_000.0

            # Underground withdrawal: F
            # F = Np*Bo + (Gp - Np*Rs)*Bg + Wp*Bw - Wi*Bw - Gi*Bg
            F_val = (
                step.np_cum * bo
                + (gp_scf - step.np_cum * rs) * bg
                + step.wp_cum * bw
                - step.wi_cum * bw
                - gi_scf * bg
            )
            F_arr[i] = F_val

            # Expansion terms ------------------------------------------
            # Eo = (Bo - Boi) + (Rsi - Rs)*Bg
            Eo_val = (bo - boi) + (rsi - rs) * bg
            Eo_arr[i] = Eo_val

            # Eg = Boi * (Bg/Bgi - 1)
            Eg_val = boi * (bg / bgi - 1.0)
            Eg_arr[i] = Eg_val

            # Efw = Boi * [(cf + cw*Swi) / (1 - Swi)] * (pi - p)
            delta_p = pi - p
            Efw_val = boi * ((cf + cw * swi) / (1.0 - swi)) * delta_p
            Efw_arr[i] = Efw_val

        # Total expansion: Et = Eo + m*Eg + Efw
        Et_arr = Eo_arr + m * Eg_arr + Efw_arr

        # Warn about negative expansion terms (noisy data)
        if np.any(Eo_arr < 0):
            warnings.warn(
                "Negative oil expansion (Eo) detected at some pressure steps. "
                "This may indicate noisy or inconsistent data.",
                stacklevel=2,
            )

        # ---- Solve for N ------------------------------------------------
        # Least-squares: F = N * Et  -->  N = sum(F*Et) / sum(Et^2)
        # Only use steps where Et > 0 to avoid division issues.
        mask = Et_arr > 0
        if mask.sum() < 2:
            logger.warning(
                "Fewer than 2 valid expansion steps; cannot solve for N reliably."
            )
            N = None
        else:
            Et_valid = Et_arr[mask]
            F_valid = F_arr[mask]
            N = float(np.sum(F_valid * Et_valid) / np.sum(Et_valid ** 2))
            if N < 0:
                logger.warning("Estimated N is negative (%.2e); data may be inconsistent.", N)
                N = None

        # ---- Water influx: We = F - N * Et  (if N solved) ---------------
        if N is not None:
            We_arr = F_arr - N * Et_arr
        else:
            We_arr = np.zeros(n_steps)

        # ---- Drive indices (at last step) --------------------------------
        drive_indices = self._compute_drive_indices(
            N=N, m=m,
            F_last=float(F_arr[-1]),
            Eo_last=float(Eo_arr[-1]),
            Eg_last=float(Eg_arr[-1]),
            Efw_last=float(Efw_arr[-1]),
            We_last=float(We_arr[-1]),
        )
        drive_mechanism = self._identify_primary_drive(drive_indices)

        return SchilthiusResult(
            pressures=[s.pressure for s in pressure_history],
            F=F_arr.tolist(),
            Eo=Eo_arr.tolist(),
            Eg=Eg_arr.tolist(),
            Efw=Efw_arr.tolist(),
            Et=Et_arr.tolist(),
            We=We_arr.tolist(),
            ooip=N,
            gas_cap_ratio=m,
            drive_indices=drive_indices,
            drive_mechanism=drive_mechanism,
        )

    # --------------------------------------------------------------------- #
    # Private helpers
    # --------------------------------------------------------------------- #

    @staticmethod
    def _validate_inputs(
        pressure_history: list[PressureStep],
        pvt_data: list[PVTAtPressure],
    ) -> None:
        if len(pressure_history) < 3:
            raise ValueError(
                f"At least 3 pressure/production data points are required; "
                f"got {len(pressure_history)}."
            )
        if len(pvt_data) < 2:
            raise ValueError(
                f"At least 2 PVT data points are required for interpolation; "
                f"got {len(pvt_data)}."
            )

        total_prod = sum(s.np_cum for s in pressure_history)
        if total_prod <= 0:
            raise ValueError(
                "Total cumulative oil production is zero or negative. "
                "Cannot perform material balance with no production."
            )

    @staticmethod
    def _unpack_pvt(
        pvt_data: list[PVTAtPressure],
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Sort PVT data by pressure and return arrays for interpolation.

        numpy.interp requires the x-array (pressure) to be *increasing*.
        """
        sorted_data = sorted(pvt_data, key=lambda d: d.pressure)
        pressures = np.array([d.pressure for d in sorted_data])
        bo = np.array([d.bo for d in sorted_data])
        bg = np.array([d.bg for d in sorted_data])
        bw = np.array([d.bw for d in sorted_data])
        rs = np.array([d.rs for d in sorted_data])
        return pressures, bo, bg, bw, rs

    @staticmethod
    def _compute_drive_indices(
        N: float | None,
        m: float,
        F_last: float,
        Eo_last: float,
        Eg_last: float,
        Efw_last: float,
        We_last: float,
    ) -> dict:
        """Compute drive-mechanism indices at the last pressure step.

        Drive indices:
            SDI  = N * Eo  / F   (solution-gas drive)
            GDI  = N * m * Eg / F (gas-cap drive)
            WDI  = We / F         (water drive)
            CDI  = N * Efw / F    (compaction / formation drive)

        They should sum to approximately 1.0.
        """
        if N is None or F_last == 0:
            return {
                "solution_gas": 0.0,
                "gas_cap": 0.0,
                "water_drive": 0.0,
                "compaction": 0.0,
            }

        sdi = N * Eo_last / F_last
        gdi = N * m * Eg_last / F_last
        wdi = We_last / F_last if We_last != 0 else 0.0
        cdi = N * Efw_last / F_last

        return {
            "solution_gas": round(sdi, 4),
            "gas_cap": round(gdi, 4),
            "water_drive": round(wdi, 4),
            "compaction": round(cdi, 4),
        }

    @staticmethod
    def _identify_primary_drive(drive_indices: dict) -> str:
        """Return a human-readable label for the dominant drive mechanism."""
        if not drive_indices:
            return "Unknown"

        labels = {
            "solution_gas": "Solution-Gas Drive",
            "gas_cap": "Gas-Cap Drive",
            "water_drive": "Water Drive",
            "compaction": "Compaction / Formation Drive",
        }
        dominant = max(drive_indices, key=drive_indices.get)
        return labels.get(dominant, "Unknown")
