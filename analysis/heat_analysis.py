"""
Heat Analysis Engine for CoolCity AI
====================================
Computes min-max normalized heat intensity score (0 - 100) and heat persistence score.
If real multi-temporal/persistence data is not available, clearly records persistence as unavailable.
"""

import pandas as pd
import geopandas as gpd
import numpy as np

def compute_heat_intensity(gdf: gpd.GeoDataFrame, temp_col: str = "temperature") -> gpd.GeoDataFrame:
    """
    Computes min-max normalized heat intensity score (0.00 - 100.00).
    
    Parameters
    ----------
    gdf : gpd.GeoDataFrame
        Spatial tiles with real temperature values.
    temp_col : str
        Column name containing temperature in Celsius.
        
    Returns
    -------
    gpd.GeoDataFrame
        GeoDataFrame with `intensity_score` (0.00 - 100.00).
    """
    gdf = gdf.copy()
    min_temp = gdf[temp_col].min()
    max_temp = gdf[temp_col].max()
    
    if max_temp == min_temp or pd.isna(min_temp) or pd.isna(max_temp):
        gdf["intensity_score"] = 50.0
    else:
        gdf["intensity_score"] = (((gdf[temp_col] - min_temp) / (max_temp - min_temp)) * 100.0).round(2)
        
    return gdf

def compute_heat_persistence(
    gdf: gpd.GeoDataFrame, 
    threshold_temp: float = 40.0, 
    tile_id_col: str = "tile_id",
    hours_col: str = "hours_above_threshold"
) -> gpd.GeoDataFrame:
    """
    Computes heat persistence score (0.00 - 100.00) ONLY when real persistence/exceedance data exists.
    
    If real time-series or exceedance hours are not provided in the source data,
    sets `hours_above_threshold` and `persistence_score` to None / NaN to avoid fabricating data.
    """
    df = gdf.copy()
    
    # If real exceedance hours column is provided with valid numeric data
    if hours_col in df.columns and df[hours_col].notna().any():
        valid_hours = pd.to_numeric(df[hours_col], errors="coerce")
        max_h = valid_hours.max()
        if max_h > 0:
            df["persistence_score"] = ((valid_hours / max_h) * 100.0).round(2)
            return df

    # If full time-series is passed (multiple timestamps per tile)
    if "timestamp" in df.columns and "temperature" in df.columns:
        exceedance = df[df["temperature"] >= threshold_temp]
        persistence = exceedance.groupby(tile_id_col).size().reset_index(name="hours_above_threshold")
        max_hours = persistence["hours_above_threshold"].max() if not persistence.empty else 1
        persistence["persistence_score"] = ((persistence["hours_above_threshold"] / max_hours) * 100.0).round(2)
        return df.merge(persistence, on=tile_id_col, how="left")

    # Real persistence data is unavailable in single daily snapshot
    df["hours_above_threshold"] = None
    df["persistence_score"] = None
    return df