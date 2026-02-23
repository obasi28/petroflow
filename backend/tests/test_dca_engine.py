import numpy as np

from app.engine.dca.arps import exponential_rate
from app.engine.dca.fitting import DCAFitter
from app.engine.dca.forecasting import generate_forecast
from app.engine.dca.monte_carlo import MonteCarloEUR


def test_exponential_fit_recovers_parameters_from_synthetic_data():
    t = np.arange(0.0, 24.0, 1.0)
    qi_true = 1000.0
    di_true = 0.08
    q = exponential_rate(t, qi_true, di_true)

    fitter = DCAFitter()
    result = fitter.fit(t, q, "exponential")

    assert result.success
    assert result.r_squared > 0.999
    assert abs(result.parameters["qi"] - qi_true) / qi_true < 0.05
    assert abs(result.parameters["di"] - di_true) / di_true < 0.1


def test_forecast_respects_economic_limit_cutoff():
    forecast = generate_forecast(
        model_type="exponential",
        parameters={"qi": 900.0, "di": 0.15},
        forecast_months=240,
        economic_limit=30.0,
    )

    rates = forecast["rate"]
    cumulative = forecast["cumulative"]

    assert len(rates) > 0
    assert all(rate >= 30.0 for rate in rates)
    assert len(cumulative) == len(rates)
    assert cumulative[-1] > cumulative[0]


def test_monte_carlo_runs_and_percentiles_are_ordered():
    np.random.seed(42)
    mc = MonteCarloEUR()
    result = mc.run(
        model_type="exponential",
        base_parameters={"qi": 1000.0, "di": 0.1},
        param_distributions={
            "qi": {"type": "normal", "mean": 1000.0, "std": 50.0},
            "di": {"type": "normal", "mean": 0.1, "std": 0.01},
        },
        economic_limit=20.0,
        iterations=300,
        max_time_months=240,
    )

    assert result.iterations == 300
    # SPE/PRMS semantics: P10 >= P50 >= P90 in volume space.
    assert result.eur_p10 >= result.eur_p50 >= result.eur_p90
