"""
Statistical Correlation Engine for CoolCity AI
================================================
Calculates SciPy Pearson (linear) and Spearman (rank-order) correlation
coefficients and p-values between heat exposure metrics and socioeconomic indicators.
"""

import pandas as pd
import numpy as np
from scipy import stats

def analyze_track7_correlations(
    df: pd.DataFrame, 
    heat_col: str = "intensity_score", 
    demo_cols: list = None
) -> pd.DataFrame:
    """
    Computes Pearson and Spearman correlation statistics.
    
    Parameters
    ----------
    df : pd.DataFrame
        DataFrame with heat intensity and demographic variables.
    heat_col : str
        Heat metric column name (e.g. 'intensity_score' or 'temperature').
    demo_cols : list, optional
        List of demographic variable column names.
        
    Returns
    -------
    pd.DataFrame
        Summary table with Pearson r, Pearson p-value, Spearman r, Spearman p-value,
        and statistical significance flag (p < 0.05).
    """
    if demo_cols is None:
        demo_cols = ["poverty_rate", "elderly_rate", "no_vehicle_rate", "unemployment_rate", "disability_rate", "minority_rate"]
        
    results = []
    for col in demo_cols:
        if col not in df.columns:
            continue
            
        clean_data = df[[heat_col, col]].dropna()
        if len(clean_data) < 3:
            continue
            
        pearson_r, pearson_p = stats.pearsonr(clean_data[heat_col], clean_data[col])
        spearman_r, spearman_p = stats.spearmanr(clean_data[heat_col], clean_data[col])
        
        results.append({
            "demographic_variable": col,
            "sample_size": len(clean_data),
            "pearson_r": round(float(pearson_r), 4),
            "pearson_p_value": float(pearson_p),
            "spearman_r": round(float(spearman_r), 4),
            "spearman_p_value": float(spearman_p),
            "is_statistically_significant": bool(pearson_p < 0.05)
        })
        
    return pd.DataFrame(results)