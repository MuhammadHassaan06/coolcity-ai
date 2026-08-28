"""
Historical Heat & Temperature Anomaly Engine for CoolCity AI
=============================================================
Calculates baseline climatological temperatures and temperature anomalies
per spatial tile relative to NOAA Phoenix summer climatology (39.5°C / 103.1°F).
"""

import pandas as pd
import numpy as np
import geopandas as gpd

def compute_historical_baseline(
    gdf: gpd.GeoDataFrame,
    baseline_summer_mean_c: float = 39.5,
    temp_col: str = "temperature"
) -> gpd.GeoDataFrame:
    """
    Computes baseline reference temperature and real anomaly (°C & °F) for each tile.
    
    Parameters
    ----------
    gdf : gpd.GeoDataFrame
        Spatial tiles with real temperature values.
    baseline_summer_mean_c : float
        Long-term summer average baseline for Phoenix metropolitan area (~39.5°C / 103.1°F).
    temp_col : str
        Column name containing current temperature in Celsius.
        
    Returns
    -------
    gpd.GeoDataFrame
        Enriched GeoDataFrame with `baseline_temp_c`, `baseline_temp_f`, `temp_anomaly_c`, and `temp_anomaly_f`.
    """
    df = gdf.copy()
    
    df["baseline_temp_c"] = round(float(baseline_summer_mean_c), 2)
    df["baseline_temp_f"] = round(baseline_summer_mean_c * 9.0 / 5.0 + 32.0, 2)
    
    # Compute anomaly: current temperature minus baseline
    df["temp_anomaly_c"] = (df[temp_col] - df["baseline_temp_c"]).round(2)
    df["temp_anomaly_f"] = (df["temp_anomaly_c"] * 9.0 / 5.0).round(2)
    
    return df
