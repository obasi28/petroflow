from app.tasks.celery_app import celery


@celery.task(bind=True, name="dca.monte_carlo")
def run_monte_carlo(self, analysis_config: dict):
    """Run Monte Carlo simulation for probabilistic EUR estimation."""
    from app.engine.dca.monte_carlo import MonteCarloEUR

    mc = MonteCarloEUR()
    result = mc.run(
        model_type=analysis_config["model_type"],
        base_parameters=analysis_config["parameters"],
        param_distributions=analysis_config["param_distributions"],
        economic_limit=analysis_config["economic_limit"],
        cum_to_date=analysis_config.get("cum_to_date", 0.0),
        iterations=analysis_config.get("iterations", 10000),
        max_time_months=analysis_config.get("max_time_months", 600),
    )

    return {
        "eur_p10": result.eur_p10,
        "eur_p50": result.eur_p50,
        "eur_p90": result.eur_p90,
        "eur_mean": result.eur_mean,
        "eur_std": result.eur_std,
        "iterations": result.iterations,
    }
