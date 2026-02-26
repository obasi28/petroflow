"""
Well test analysis orchestrator.

Provides a single entry point (``WellTestAnalyzer.analyze``) that:
1. Validates and preprocesses the input data.
2. Computes the Bourdet pressure derivative for diagnostics.
3. Delegates to the appropriate analysis module (drawdown or buildup).
4. Assembles a unified ``WellTestResult`` with a frontend-ready summary.

Usage:

    >>> from app.engine.well_test import WellTestAnalyzer, WellTestData, WellParams
    >>> data = WellTestData(time=[...], pressure=[...], rate=500.0, test_type="drawdown")
    >>> params = WellParams(mu=0.8, bo=1.2, h=50, phi=0.15, ct=1e-5, rw=0.35, pi=5000)
    >>> result = WellTestAnalyzer().analyze(data, params)
    >>> print(result.summary)
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass

import numpy as np

from .derivative import BourdetDerivative, DerivativeResult
from .drawdown import DrawdownAnalysis, DrawdownResult
from .buildup import BuildupAnalysis, BuildupResult


# ─────────────────────────────────────────────────────────────
# Input containers
# ─────────────────────────────────────────────────────────────

@dataclass
class WellTestData:
    """Raw well-test measurements."""

    time: list[float]                   # hours
    pressure: list[float]               # psi
    rate: float                         # STB/d (oil) or Mscf/d (gas)
    test_type: str                      # "drawdown" or "buildup"
    tp: float | None = None             # producing time before shut-in (hours)
    pwf_at_shutin: float | None = None  # Pwf at dt=0 (psi)


@dataclass
class WellParams:
    """Reservoir and fluid properties required for analysis."""

    mu: float          # Viscosity (cp)
    bo: float          # Oil FVF (rb/stb)
    h: float           # Net pay thickness (ft)
    phi: float         # Porosity (fraction, 0-1)
    ct: float          # Total compressibility (1/psi)
    rw: float          # Wellbore radius (ft)
    pi: float | None = None  # Initial reservoir pressure (psi)


# ─────────────────────────────────────────────────────────────
# Unified result
# ─────────────────────────────────────────────────────────────

@dataclass
class WellTestResult:
    """Unified result combining derivative diagnostics and analysis."""

    test_type: str
    permeability: float             # md
    skin_factor: float
    flow_capacity: float            # kh (md-ft)
    p_star: float | None            # Extrapolated pressure (buildup only)
    flow_efficiency: float | None   # Buildup only
    dp_skin: float | None           # Pressure drop due to skin (psi)
    radius_investigation: float | None  # Drawdown only
    drawdown: DrawdownResult | None
    buildup: BuildupResult | None
    derivative: DerivativeResult
    summary: dict                   # Pre-formatted for frontend display


# ─────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────

class WellTestAnalyzer:
    """Top-level well test analysis orchestrator.

    Accepts raw test data and reservoir parameters and produces a
    complete ``WellTestResult`` with derivative diagnostics, analysis
    results, and a frontend-ready summary dictionary.
    """

    def __init__(self, L: float = 0.1):
        """
        Args:
            L: Bourdet derivative smoothing factor (default 0.1).
        """
        self._L = L
        self._deriv_engine = BourdetDerivative()
        self._drawdown = DrawdownAnalysis(L=L)
        self._buildup = BuildupAnalysis(L=L)

    # ----------------------------------------------------------
    # Public API
    # ----------------------------------------------------------

    def analyze(self, data: WellTestData, params: WellParams) -> WellTestResult:
        """Run well test analysis.

        Args:
            data:   Raw measurements and metadata.
            params: Reservoir and fluid properties.

        Returns:
            WellTestResult with derivative diagnostics, specific
            analysis results, and a formatted summary.

        Raises:
            ValueError: If inputs are invalid or insufficient.
        """
        self._validate_inputs(data, params)

        time_arr = np.array(data.time, dtype=np.float64)
        pres_arr = np.array(data.pressure, dtype=np.float64)

        # Always compute derivative for diagnostics
        if data.test_type == "drawdown":
            if params.pi is None:
                raise ValueError(
                    "Initial pressure (pi) is required for drawdown analysis."
                )
            p_ref = params.pi
        else:
            if data.pwf_at_shutin is None:
                raise ValueError(
                    "pwf_at_shutin is required for buildup analysis."
                )
            p_ref = data.pwf_at_shutin

        deriv_result = self._deriv_engine.compute(
            time_arr, pres_arr, p_ref, L=self._L,
        )

        # Route to specific analysis
        if data.test_type == "drawdown":
            return self._run_drawdown(data, params, time_arr, pres_arr,
                                       deriv_result)
        else:
            return self._run_buildup(data, params, time_arr, pres_arr,
                                      deriv_result)

    # ----------------------------------------------------------
    # Drawdown path
    # ----------------------------------------------------------

    def _run_drawdown(
        self,
        data: WellTestData,
        params: WellParams,
        time_arr: np.ndarray,
        pres_arr: np.ndarray,
        deriv_result: DerivativeResult,
    ) -> WellTestResult:
        dd = self._drawdown.analyze(
            time=time_arr,
            pressure=pres_arr,
            rate=data.rate,
            mu=params.mu,
            bo=params.bo,
            h=params.h,
            phi=params.phi,
            ct=params.ct,
            rw=params.rw,
            pi=params.pi,  # type: ignore[arg-type]
        )

        dp_skin = 0.87 * abs(dd.slope) * dd.skin_factor

        summary = self._build_summary(
            test_type="drawdown",
            k=dd.permeability,
            s=dd.skin_factor,
            kh=dd.flow_capacity,
            p_star=None,
            fe=None,
            dp_skin=dp_skin,
            ri=dd.radius_investigation,
            slope=dd.slope,
            flow_regimes=deriv_result.flow_regimes,
        )

        return WellTestResult(
            test_type="drawdown",
            permeability=dd.permeability,
            skin_factor=dd.skin_factor,
            flow_capacity=dd.flow_capacity,
            p_star=None,
            flow_efficiency=None,
            dp_skin=round(dp_skin, 2),
            radius_investigation=dd.radius_investigation,
            drawdown=dd,
            buildup=None,
            derivative=deriv_result,
            summary=summary,
        )

    # ----------------------------------------------------------
    # Buildup path
    # ----------------------------------------------------------

    def _run_buildup(
        self,
        data: WellTestData,
        params: WellParams,
        time_arr: np.ndarray,
        pres_arr: np.ndarray,
        deriv_result: DerivativeResult,
    ) -> WellTestResult:
        bu = self._buildup.analyze(
            delta_t=time_arr,
            pressure=pres_arr,
            tp=data.tp,  # type: ignore[arg-type]
            rate=data.rate,
            pwf_at_shutin=data.pwf_at_shutin,  # type: ignore[arg-type]
            mu=params.mu,
            bo=params.bo,
            h=params.h,
            phi=params.phi,
            ct=params.ct,
            rw=params.rw,
            pi=params.pi,
        )

        summary = self._build_summary(
            test_type="buildup",
            k=bu.permeability,
            s=bu.skin_factor,
            kh=bu.flow_capacity,
            p_star=bu.p_star,
            fe=bu.flow_efficiency,
            dp_skin=bu.dp_skin,
            ri=None,
            slope=bu.horner_slope,
            flow_regimes=deriv_result.flow_regimes,
        )

        return WellTestResult(
            test_type="buildup",
            permeability=bu.permeability,
            skin_factor=bu.skin_factor,
            flow_capacity=bu.flow_capacity,
            p_star=bu.p_star,
            flow_efficiency=bu.flow_efficiency,
            dp_skin=bu.dp_skin,
            radius_investigation=None,
            drawdown=None,
            buildup=bu,
            derivative=deriv_result,
            summary=summary,
        )

    # ----------------------------------------------------------
    # Summary builder
    # ----------------------------------------------------------

    @staticmethod
    def _build_summary(
        test_type: str,
        k: float,
        s: float,
        kh: float,
        p_star: float | None,
        fe: float | None,
        dp_skin: float | None,
        ri: float | None,
        slope: float,
        flow_regimes: list[dict],
    ) -> dict:
        """Build a frontend-friendly summary dictionary."""

        # Skin interpretation
        if s < -1:
            skin_desc = "Stimulated (acidized / fractured)"
        elif s < 0:
            skin_desc = "Mildly stimulated"
        elif s < 5:
            skin_desc = "Low damage"
        elif s < 20:
            skin_desc = "Moderate damage"
        else:
            skin_desc = "Severe damage"

        # Permeability classification
        if k < 1:
            perm_class = "Tight"
        elif k < 10:
            perm_class = "Low"
        elif k < 100:
            perm_class = "Moderate"
        elif k < 1000:
            perm_class = "Good"
        else:
            perm_class = "Excellent"

        # Detected regime names
        regime_names = [r["name"] for r in flow_regimes]
        iarf_detected = "radial_flow" in regime_names

        summary: dict = {
            "test_type":          test_type,
            "permeability_md":    k,
            "perm_class":         perm_class,
            "skin_factor":        s,
            "skin_description":   skin_desc,
            "flow_capacity_mdft": kh,
            "slope_psi_cycle":    slope,
            "iarf_detected":      iarf_detected,
            "flow_regimes":       regime_names,
        }

        if dp_skin is not None:
            summary["dp_skin_psi"] = dp_skin

        if test_type == "buildup":
            summary["p_star_psi"] = p_star
            summary["flow_efficiency"] = fe
            if fe is not None:
                summary["fe_percent"] = round(fe * 100, 1)
        else:
            summary["radius_investigation_ft"] = ri

        return summary

    # ----------------------------------------------------------
    # Input validation
    # ----------------------------------------------------------

    @staticmethod
    def _validate_inputs(data: WellTestData, params: WellParams) -> None:
        """Validate WellTestData and WellParams before analysis."""

        # Type / shape checks
        if not isinstance(data.time, (list, tuple)):
            raise TypeError("data.time must be a list of floats.")
        if not isinstance(data.pressure, (list, tuple)):
            raise TypeError("data.pressure must be a list of floats.")
        if len(data.time) != len(data.pressure):
            raise ValueError(
                f"time ({len(data.time)}) and pressure "
                f"({len(data.pressure)}) must have the same length."
            )
        if len(data.time) < 10:
            raise ValueError(
                f"Need at least 10 data points, got {len(data.time)}."
            )

        # Test type
        if data.test_type not in ("drawdown", "buildup"):
            raise ValueError(
                f"test_type must be 'drawdown' or 'buildup', "
                f"got '{data.test_type}'."
            )

        # Buildup-specific
        if data.test_type == "buildup":
            if data.tp is None or data.tp <= 0:
                raise ValueError(
                    "Producing time (tp) must be positive for buildup."
                )
            if data.pwf_at_shutin is None:
                raise ValueError(
                    "pwf_at_shutin is required for buildup analysis."
                )

        # Rate
        if data.rate <= 0:
            raise ValueError("Flow rate must be positive.")

        # Params
        if params.mu <= 0:
            raise ValueError("Viscosity (mu) must be positive.")
        if params.bo <= 0:
            raise ValueError("FVF (bo) must be positive.")
        if params.h <= 0:
            raise ValueError("Net pay (h) must be positive.")
        if not (0 < params.phi <= 1):
            raise ValueError("Porosity must be in (0, 1].")
        if params.ct <= 0:
            raise ValueError("Compressibility (ct) must be positive.")
        if params.rw <= 0:
            raise ValueError("Wellbore radius (rw) must be positive.")

        # Pressure positivity
        if any(p < 0 for p in data.pressure):
            raise ValueError("Pressure values must be non-negative.")
