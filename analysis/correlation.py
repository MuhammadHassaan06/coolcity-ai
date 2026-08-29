"""
Statistical Correlation Engine for CoolCity AI (Phoenix, AZ)
============================================================
Calculates SciPy Pearson (linear) and Spearman (rank-order) correlation
coefficients and p-values between heat exposure metrics and socioeconomic indicators.

METHODOLOGICAL NOTE ON STATISTICAL UNIT & PSEUDOREPLICATION:
-----------------------------------------------------------
1. Pseudoreplication Warning:
   Demographic indicators (from U.S. Census ACS 5-Year data) are measured at the 
   Census Tract level. FortyGuard thermal tiles are measured at high resolution (~100m).
   Assigning identical tract-level demographic constants to hundreds of thermal tiles within
   that tract and running correlations on tile-level rows (N = 48,199) creates extreme 
   pseudoreplication. It artificially inflates sample size N, driving p-values down to 
   unearned extremes (e.g. p < 1e-150) and violating the independent observation assumption.

2. Tract-Level Aggregation:
   To ensure statistically defensible correlation analysis, tile-level thermal metrics
   (e.g., intensity_score, temperature) are aggregated to the Census Tract level (GEOID)
   FIRST using central summary statistics (mean). Demographic attributes (which are 
   constant within a GEOID) are retained per tract after consistency validation.

3. Spatial Autocorrelation & Causality:
   The statistical unit of analysis is the Census Tract (GEOID). Note that spatial 
   units may still exhibit spatial autocorrelation (neighboring tracts sharing thermal 
   and demographic characteristics). Correlations reported here represent exploratory 
   statistical associations across geographic units, NOT direct causal relationships.
"""

import logging
from typing import List, Optional
import pandas as pd
import numpy as np
from scipy import stats

logger = logging.getLogger("CorrelationEngine")


def validate_and_aggregate_tract_demographics(
    df: pd.DataFrame,
    geoid_col: str = "geoid",
    demo_cols: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Validates demographic consistency within each Census Tract (GEOID) and
    extracts one verified demographic record per GEOID.

    Parameters
    ----------
    df : pd.DataFrame
        Input DataFrame containing GEOID and demographic variables.
    geoid_col : str
        Column name for Census Tract GEOID.
    demo_cols : list, optional
        List of demographic column names to validate and aggregate.

    Returns
    -------
    pd.DataFrame
        DataFrame with one row per unique GEOID containing verified demographic values.

    Raises
    ------
    ValueError
        If a supposedly tract-level demographic variable contains conflicting values
        within the same GEOID group.
    """
    if geoid_col not in df.columns:
        raise KeyError(f"Geographic identifier column '{geoid_col}' not found in DataFrame.")

    if demo_cols is None:
        demo_cols = [
            "poverty_rate", "elderly_rate", "no_vehicle_rate",
            "unemployment_rate", "disability_rate", "minority_rate",
            "total_population", "vulnerability_score"
        ]

    # Filter columns that actually exist in df
    avail_demo_cols = [c for c in demo_cols if c in df.columns]

    valid_df = df[df[geoid_col].notna() & (df[geoid_col] != "")].copy()

    if not avail_demo_cols or valid_df.empty:
        return pd.DataFrame({geoid_col: valid_df[geoid_col].unique()})

    # Check for conflicting demographic values within the same GEOID
    for col in avail_demo_cols:
        unique_counts = valid_df.groupby(geoid_col)[col].nunique(dropna=True)
        conflicts = unique_counts[unique_counts > 1]
        if not conflicts.empty:
            bad_geoids = conflicts.index.tolist()[:5]
            raise ValueError(
                f"Demographic field '{col}' contains inconsistent/conflicting values within "
                f"the same Census Tract GEOID (e.g. GEOIDs: {bad_geoids}). "
                "Tract-level demographic variables must be constant within each GEOID."
            )

    # Extract first non-null demographic value per GEOID
    tract_demo = valid_df.groupby(geoid_col)[avail_demo_cols].first().reset_index()
    return tract_demo


def aggregate_tiles_to_tracts(
    df: pd.DataFrame,
    geoid_col: str = "geoid",
    heat_cols: Optional[List[str]] = None,
    demo_cols: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Converts a tile-level joined dataset into a Census-tract-level analysis table.

    Parameters
    ----------
    df : pd.DataFrame
        Tile-level joined dataset containing GEOID, thermal metrics, and demographics.
    geoid_col : str
        Census Tract identifier column name.
    heat_cols : list, optional
        List of continuous heat metric column names to aggregate via mean.
    demo_cols : list, optional
        List of demographic column names to validate and retain per tract.

    Returns
    -------
    pd.DataFrame
        Tract-level table with exactly one row per unique Census Tract (GEOID).
    """
    if geoid_col not in df.columns:
        raise KeyError(f"Geographic identifier column '{geoid_col}' not found in DataFrame.")

    # Filter out missing or empty GEOIDs
    valid_df = df[df[geoid_col].notna() & (df[geoid_col] != "")].copy()
    if valid_df.empty:
        logger.warning(f"No valid non-null '{geoid_col}' values found in input DataFrame.")
        return pd.DataFrame()

    if heat_cols is None:
        heat_cols = [
            "intensity_score", "temperature", "average_temperature",
            "min_temperature", "max_temperature", "temperature_f",
            "temp_anomaly_c", "temp_anomaly_f", "persistence_score"
        ]

    # Filter heat columns present in df with valid numeric data
    avail_heat_cols = []
    for col in heat_cols:
        if col in valid_df.columns:
            numeric_series = pd.to_numeric(valid_df[col], errors="coerce")
            if numeric_series.notna().any():
                avail_heat_cols.append(col)

    if not avail_heat_cols:
        raise ValueError("No valid numeric heat metric columns found for tract-level aggregation.")

    # 1. Aggregate heat metrics by GEOID (mean)
    tract_heat = valid_df.groupby(geoid_col)[avail_heat_cols].mean(numeric_only=True).reset_index()

    # 2. Extract and validate tract demographics
    tract_demo = validate_and_aggregate_tract_demographics(valid_df, geoid_col=geoid_col, demo_cols=demo_cols)

    # 3. Merge heat and demographics on GEOID
    tract_table = pd.merge(tract_heat, tract_demo, on=geoid_col, how="inner")

    logger.info(
        f"Aggregated {len(valid_df)} thermal tiles into {len(tract_table)} unique Census Tracts (GEOIDs)."
    )
    return tract_table


def analyze_track7_correlations(
    df: pd.DataFrame,
    heat_col: str = "intensity_score",
    demo_cols: Optional[List[str]] = None,
    geoid_col: str = "geoid"
) -> pd.DataFrame:
    """
    Computes Pearson (linear) and Spearman (rank-order) correlation statistics
    between heat exposure metrics and socioeconomic indicators at the CENSUS TRACT level.

    If input `df` contains tile-level data (multiple rows per GEOID), it is automatically
    aggregated to tract level FIRST to eliminate pseudoreplication.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame containing thermal metrics and demographic indicators.
    heat_col : str
        Heat metric column name (e.g. 'intensity_score' or 'temperature').
    demo_cols : list, optional
        List of demographic variable column names to test against `heat_col`.
    geoid_col : str
        Census Tract identifier column name. Default: 'geoid'.

    Returns
    -------
    pd.DataFrame
        Summary table with Pearson r, Pearson p-value, Spearman r, Spearman p-value,
        tract sample size (N), and statistical significance flag (p < 0.05).
    """
    if demo_cols is None:
        demo_cols = [
            "poverty_rate", "elderly_rate", "no_vehicle_rate",
            "unemployment_rate", "disability_rate", "minority_rate"
        ]

    # Check if input is tile-level (multiple rows per GEOID) or already tract-level
    if geoid_col in df.columns:
        unique_geoid_count = df[geoid_col].dropna().nunique()
        total_row_count = len(df)

        if total_row_count > unique_geoid_count:
            logger.info(
                f"Input contains tile-level data ({total_row_count} rows across {unique_geoid_count} unique GEOIDs). "
                "Aggregating heat metrics to Census Tract level (GEOID) to eliminate pseudoreplication..."
            )
            tract_df = aggregate_tiles_to_tracts(
                df, geoid_col=geoid_col, heat_cols=[heat_col], demo_cols=demo_cols
            )
        else:
            tract_df = df.copy()
    else:
        logger.warning(
            f"GEOID column '{geoid_col}' not found. Assuming input DataFrame is already at tract level."
        )
        tract_df = df.copy()

    results = []
    for col in demo_cols:
        if col not in tract_df.columns or heat_col not in tract_df.columns:
            continue

        # Drop rows missing either variable for this specific pair
        clean_data = tract_df[[heat_col, col]].copy()
        clean_data[heat_col] = pd.to_numeric(clean_data[heat_col], errors="coerce")
        clean_data[col] = pd.to_numeric(clean_data[col], errors="coerce")
        clean_data = clean_data.dropna()

        sample_n = len(clean_data)

        # Require at least 3 valid observations for statistical correlation
        if sample_n < 3:
            logger.warning(f"Insufficient valid tract observations (N={sample_n}) for '{col}'. Skipping.")
            results.append({
                "demographic_variable": col,
                "sample_size": sample_n,
                "pearson_r": np.nan,
                "pearson_p_value": np.nan,
                "spearman_r": np.nan,
                "spearman_p_value": np.nan,
                "is_statistically_significant": False
            })
            continue

        # Check for zero variance / constant values
        if clean_data[heat_col].std() == 0 or clean_data[col].std() == 0:
            logger.warning(f"Constant values detected in '{col}' or '{heat_col}'. Cannot compute correlation.")
            results.append({
                "demographic_variable": col,
                "sample_size": sample_n,
                "pearson_r": np.nan,
                "pearson_p_value": np.nan,
                "spearman_r": np.nan,
                "spearman_p_value": np.nan,
                "is_statistically_significant": False
            })
            continue

        # SciPy Pearson and Spearman calculations
        try:
            pearson_r, pearson_p = stats.pearsonr(clean_data[heat_col], clean_data[col])
            spearman_r, spearman_p = stats.spearmanr(clean_data[heat_col], clean_data[col])

            results.append({
                "demographic_variable": col,
                "sample_size": sample_n,
                "pearson_r": round(float(pearson_r), 4),
                "pearson_p_value": float(pearson_p),
                "spearman_r": round(float(spearman_r), 4),
                "spearman_p_value": float(spearman_p),
                "is_statistically_significant": bool(pearson_p < 0.05)
            })
        except Exception as e:
            logger.warning(f"Correlation calculation failed for '{col}': {e}")
            results.append({
                "demographic_variable": col,
                "sample_size": sample_n,
                "pearson_r": np.nan,
                "pearson_p_value": np.nan,
                "spearman_r": np.nan,
                "spearman_p_value": np.nan,
                "is_statistically_significant": False
            })

    return pd.DataFrame(results)


def export_correlation_summary_json(
    df: pd.DataFrame,
    output_path: Optional[str] = None
) -> dict:
    """
    Computes tract-level correlations for key demographic indicators against heat metrics
    and exports a compact, machine-readable JSON summary artifact to data/processed/correlation_summary.json.
    """
    import json
    from pathlib import Path
    
    if output_path is None:
        project_root = Path(__file__).parent.parent
        output_path = project_root / "data" / "processed" / "correlation_summary.json"
    else:
        output_path = Path(output_path)
        
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    demo_vars = ["poverty_rate", "elderly_rate", "no_vehicle_rate", "minority_rate", "unemployment_rate", "disability_rate"]
    available_demo = [c for c in demo_vars if c in df.columns]
    
    heat_cols = []
    if "intensity_score" in df.columns:
        heat_cols.append("intensity_score")
    if "temperature" in df.columns or "average_temperature" in df.columns:
        temp_c = "temperature" if "temperature" in df.columns else "average_temperature"
        heat_cols.append(temp_c)
        
    correlations_list = []
    
    for h_col in heat_cols:
        res_df = analyze_track7_correlations(df, heat_col=h_col, demo_cols=available_demo)
        for _, row in res_df.iterrows():
            correlations_list.append({
                "variable": row["demographic_variable"],
                "heat_metric": h_col,
                "sample_size": int(row["sample_size"]),
                "pearson_r": None if pd.isna(row["pearson_r"]) else float(row["pearson_r"]),
                "pearson_p_value": None if pd.isna(row["pearson_p_value"]) else float(row["pearson_p_value"]),
                "spearman_rho": None if pd.isna(row["spearman_r"]) else float(row["spearman_r"]),
                "spearman_p_value": None if pd.isna(row["spearman_p_value"]) else float(row["spearman_p_value"]),
                "is_statistically_significant": bool(row["is_statistically_significant"])
            })
            
    summary_data = {
        "study_unit": "Census Tract",
        "tract_count": int(df["geoid"].nunique()) if "geoid" in df.columns else len(df),
        "methodology_note": (
            "Pearson and Spearman correlations calculated at the Census Tract level (N=230) "
            "after mean-aggregating tile thermal data. Tile-level analysis (N=48,199) was "
            "superseded to eliminate pseudoreplication and false statistical significance."
        ),
        "heat_metrics_tested": heat_cols,
        "correlations": correlations_list
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)
        
    logger.info(f"Saved correlation summary JSON to {output_path}")
    return summary_data
