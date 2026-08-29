"""
Historical Heat & Temperature Anomaly Engine for CoolCity AI
=============================================================
Calculates baseline climatological temperatures and temperature anomalies
per spatial tile ONLY when an explicit, externally verified climatological
baseline is provided (e.g. from official NOAA/NWS Phoenix Period of Record).

UNVERIFIED BASELINE NOTICE:
---------------------------
The previous default value of 39.5°C (103.1°F) was an unverified heuristic placeholder.
Repository evidence currently lacks a verified NOAA/NWS dataset supporting that number.
To ensure statistical integrity, anomaly computation is disabled by default unless an
externally verified baseline parameter is explicitly passed.
"""

import logging
from typing import Optional
import pandas as pd
import numpy as np
import geopandas as gpd

logger = logging.getLogger("HistoricalHeat")


def compute_historical_baseline(
    gdf: gpd.GeoDataFrame,
    baseline_summer_mean_c: Optional[float] = None,
    temp_col: str = "temperature"
) -> gpd.GeoDataFrame:
    """
    Computes reference temperature and anomaly (°C & °F) for each tile IF a verified baseline is provided.

    Parameters
    ----------
    gdf : gpd.GeoDataFrame
        Spatial tiles with real temperature values.
    baseline_summer_mean_c : Optional[float]
        Long-term summer average baseline for Phoenix metropolitan area (°C).
        Must be provided explicitly from a verified NOAA/NWS source. Default is None.
    temp_col : str
        Column name containing current temperature in Celsius.

    Returns
    -------
    gpd.GeoDataFrame
        Enriched GeoDataFrame with baseline and anomaly columns if baseline is provided,
        or unchanged GeoDataFrame with null anomaly values if disabled.
    """
    df = gdf.copy()

    if baseline_summer_mean_c is None:
        logger.info("No verified NOAA/NWS climatological baseline provided. Historical anomaly computation disabled.")
        df["baseline_temp_c"] = np.nan
        df["baseline_temp_f"] = np.nan
        df["temp_anomaly_c"] = np.nan
        df["temp_anomaly_f"] = np.nan
        return df

    logger.info(f"Computing historical heat anomaly against verified baseline: {baseline_summer_mean_c:.2f}°C")
    df["baseline_temp_c"] = round(float(baseline_summer_mean_c), 2)
    df["baseline_temp_f"] = round(baseline_summer_mean_c * 9.0 / 5.0 + 32.0, 2)

    # Compute anomaly: current temperature minus baseline
    df["temp_anomaly_c"] = (df[temp_col] - df["baseline_temp_c"]).round(2)
    df["temp_anomaly_f"] = (df["temp_anomaly_c"] * 9.0 / 5.0).round(2)

    return df
