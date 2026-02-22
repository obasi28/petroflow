"""
DCA Fit Diagnostics
====================
Comprehensive goodness-of-fit metrics for evaluating decline curve model quality.

Metrics:
  - R² and Adjusted R²: Coefficient of determination
  - RMSE and NRMSE: Root Mean Square Error (normalized)
  - MAE: Mean Absolute Error
  - MAPE: Mean Absolute Percentage Error
  - AIC/BIC: Information criteria for model comparison
  - Durbin-Watson: Residual autocorrelation test
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class DiagnosticMetrics:
    r_squared: float
    adjusted_r_squared: float
    rmse: float
    nrmse: float
    mae: float
    mape: float
    aic: float
    bic: float
    durbin_watson: float
    n_points: int
    n_parameters: int


def compute_diagnostics(
    y_actual: np.ndarray,
    y_predicted: np.ndarray,
    n_params: int,
) -> DiagnosticMetrics:
    """
    Compute comprehensive fit diagnostics.

    Args:
        y_actual: Observed production rates
        y_predicted: Model-predicted rates
        n_params: Number of model parameters (k)

    Returns:
        DiagnosticMetrics with all computed metrics
    """
    n = len(y_actual)
    residuals = y_actual - y_predicted

    # Sum of squares
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((y_actual - np.mean(y_actual)) ** 2))

    # R-squared
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    # Adjusted R-squared: penalizes overfitting
    if n > n_params + 1:
        adj_r2 = 1.0 - (1.0 - r2) * (n - 1) / (n - n_params - 1)
    else:
        adj_r2 = r2

    # RMSE
    rmse = float(np.sqrt(np.mean(residuals**2)))

    # Normalized RMSE (by range of data)
    data_range = float(np.max(y_actual) - np.min(y_actual))
    nrmse = rmse / data_range if data_range > 0 else float("inf")

    # MAE
    mae = float(np.mean(np.abs(residuals)))

    # MAPE (exclude zero actual values)
    nonzero_mask = y_actual != 0
    if np.any(nonzero_mask):
        mape = float(
            np.mean(np.abs(residuals[nonzero_mask] / y_actual[nonzero_mask])) * 100
        )
    else:
        mape = float("inf")

    # AIC and BIC
    if ss_res > 0 and n > 0:
        log_likelihood = -n / 2 * (np.log(2 * np.pi) + np.log(ss_res / n) + 1)
        aic = -2 * log_likelihood + 2 * n_params
        bic = -2 * log_likelihood + n_params * np.log(n)
    else:
        aic = float("-inf")
        bic = float("-inf")

    # Durbin-Watson statistic
    # DW ≈ 2: no autocorrelation
    # DW < 2: positive autocorrelation (systematic under/overfitting)
    # DW > 2: negative autocorrelation
    if ss_res > 0 and len(residuals) > 1:
        diff_residuals = np.diff(residuals)
        dw = float(np.sum(diff_residuals**2) / ss_res)
    else:
        dw = 2.0

    return DiagnosticMetrics(
        r_squared=r2,
        adjusted_r_squared=adj_r2,
        rmse=rmse,
        nrmse=nrmse,
        mae=mae,
        mape=mape,
        aic=float(aic),
        bic=float(bic),
        durbin_watson=dw,
        n_points=n,
        n_parameters=n_params,
    )
