"""
U.S. Census Bureau Demographic Ingestion Engine for CoolCity AI (Phoenix, AZ)
=============================================================================
Fetches and ingests REAL U.S. Census Bureau ACS 5-Year socioeconomic indicators
for Maricopa County / Phoenix Census Tracts:
  - Poverty Rate: Percentage of population below poverty line (ACS 5-Year)
  - Elderly Population Rate: Population aged 65 and older (ACS 5-Year)
  - No-Vehicle Access Rate: Households with zero vehicles (ACS 5-Year)
  - Unemployment Rate: Civilian labor force unemployed (ACS 5-Year)
  - Disability Rate: Noninstitutionalized population with disability (ACS 5-Year)
  - Minority Rate: Non-white or Hispanic population (ACS 5-Year)
  - Total Population & Households (ACS 5-Year)

Performs a REAL spatial join between FortyGuard thermal tile centroids/geometries
and Census Tract polygons, mapping traceable GEOID and Tract names to every tile.
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import requests
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape, Point, Polygon
from dotenv import load_dotenv

# Ensure UTF-8 output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CensusIngestion")

load_dotenv(override=True)

TIGERWEB_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query"
CDC_SVI_URL = "https://onemap.cdc.gov/OneMapServices/rest/services/SVI/CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/2/query"

def fetch_real_census_tracts_demographics(
    output_dir: str = "data/raw",
    force_refresh: bool = False,
    timeout: int = 40
) -> gpd.GeoDataFrame:
    """
    Fetches real Census Tract boundaries (TIGERweb) and merges with official
    U.S. Census ACS 5-Year socioeconomic data (via CDC SVI Census Tract dataset).

    Caches the merged GeoDataFrame locally under data/raw/ to protect network overhead.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    raw_census_path = out_path / "phoenix_census_tracts_demographics.geojson"

    if not force_refresh and raw_census_path.exists():
        logger.info(f"Loading real Census Tract demographics from local cache: {raw_census_path}")
        try:
            census_gdf = gpd.read_file(raw_census_path)
            if not census_gdf.empty and "poverty_rate" in census_gdf.columns:
                logger.info(f"Loaded {len(census_gdf)} Census Tracts with real ACS indicators from cache.")
                return census_gdf
        except Exception as e:
            logger.warning(f"Failed to read cached Census GeoJSON ({e}). Refetching...")

    # 1. Fetch official TIGERweb Census Tract boundaries for Maricopa County (State: 04, County: 013)
    logger.info("Querying U.S. Census TIGERweb API for Maricopa County Census Tract boundaries...")
    params_tiger = {
        "where": "STATE='04' AND COUNTY='013'",
        "outFields": "GEOID,NAME,CENTLAT,CENTLON,AREALAND",
        "f": "geojson",
        "resultRecordCount": 2000
    }
    resp_tiger = requests.get(TIGERWEB_URL, params=params_tiger, timeout=timeout)
    if not resp_tiger.ok:
        raise RuntimeError(f"Census TIGERweb API query failed: HTTP {resp_tiger.status_code} - {resp_tiger.text[:200]}")

    tiger_json = resp_tiger.json()
    if "features" not in tiger_json or len(tiger_json["features"]) == 0:
        raise RuntimeError("TIGERweb returned 0 features for Maricopa County.")

    tiger_gdf = gpd.GeoDataFrame.from_features(tiger_json["features"], crs="EPSG:4326")
    logger.info(f"Retrieved {len(tiger_gdf)} Census Tract polygons from TIGERweb.")

    # 2. Fetch official U.S. Census ACS 5-Year socioeconomic attributes for Maricopa County tracts
    logger.info("Querying U.S. Census ACS 5-Year indicators from CDC SVI dataset for Maricopa County...")
    params_svi = {
        "where": "ST = '04' AND COUNTY = 'Maricopa County'",
        "outFields": "FIPS,LOCATION,EP_POV150,EP_AGE65,EP_NOVEH,EP_UNEMP,EP_DISABL,EP_MINRTY,E_TOTPOP,E_HH",
        "f": "json",
        "resultRecordCount": 2000
    }
    resp_svi = requests.get(CDC_SVI_URL, params=params_svi, timeout=timeout)
    if not resp_svi.ok:
        raise RuntimeError(f"CDC SVI demographic API query failed: HTTP {resp_svi.status_code} - {resp_svi.text[:200]}")

    svi_json = resp_svi.json()
    svi_features = [f.get("attributes", {}) for f in svi_json.get("features", [])]
    if not svi_features:
        raise RuntimeError("CDC SVI query returned 0 demographic features for Maricopa County.")

    svi_df = pd.DataFrame(svi_features)
    logger.info(f"Retrieved {len(svi_df)} Census Tract demographic records.")

    # Clean numeric fields (-999 represents missing/unpopulated tracts in CDC SVI)
    numeric_cols = ["EP_POV150", "EP_AGE65", "EP_NOVEH", "EP_UNEMP", "EP_DISABL", "EP_MINRTY", "E_TOTPOP", "E_HH"]
    for col in numeric_cols:
        if col in svi_df.columns:
            svi_df[col] = pd.to_numeric(svi_df[col], errors="coerce")
            svi_df.loc[svi_df[col] < 0, col] = np.nan

    # Merge spatial polygons with demographic attributes on 11-digit GEOID (FIPS)
    census_gdf = tiger_gdf.merge(svi_df, left_on="GEOID", right_on="FIPS", how="inner")
    if census_gdf.empty:
        raise RuntimeError("Failed to join TIGERweb boundaries with demographic attributes.")

    # Calculate standardized rate fractions (0.0000 to 1.0000)
    census_gdf["poverty_rate"] = (census_gdf["EP_POV150"] / 100.0).round(4)
    census_gdf["elderly_rate"] = (census_gdf["EP_AGE65"] / 100.0).round(4)
    census_gdf["no_vehicle_rate"] = (census_gdf["EP_NOVEH"] / 100.0).round(4)
    census_gdf["unemployment_rate"] = (census_gdf["EP_UNEMP"] / 100.0).round(4)
    census_gdf["disability_rate"] = (census_gdf["EP_DISABL"] / 100.0).round(4)
    census_gdf["minority_rate"] = (census_gdf["EP_MINRTY"] / 100.0).round(4)
    census_gdf["total_population"] = census_gdf["E_TOTPOP"]

    # Save to local cache
    logger.info(f"Saving enriched Census Tracts GeoJSON to {raw_census_path}...")
    census_gdf.to_file(raw_census_path, driver="GeoJSON")
    return census_gdf

def spatial_join_census_to_tiles(
    tiles_gdf: gpd.GeoDataFrame,
    tracts_gdf: gpd.GeoDataFrame
) -> gpd.GeoDataFrame:
    """
    Spatially joins real Census demographic data onto FortyGuard thermal tiles.

    1. Uses tile centroids in projected CRS (EPSG:3857) to perform exact point-in-polygon
       matching against Census Tract boundaries.
    2. For boundary/edge tiles with no polygon overlap, performs nearest-tract spatial join.
    3. Handles missing tract-level data with median imputation from valid Phoenix tracts
       (never uses random values).
    """
    tiles = tiles_gdf.copy()

    # Calculate projected centroids for geometric precision
    tiles_proj = tiles.to_crs(epsg=3857)
    centroids_proj = tiles_proj.geometry.centroid
    centroids_geo = centroids_proj.to_crs(epsg=4326)

    centroids_gdf = gpd.GeoDataFrame(
        tiles[["tile_id"]],
        geometry=centroids_geo,
        crs="EPSG:4326"
    )

    census_cols = [
        "GEOID", "NAME", "poverty_rate", "elderly_rate", "no_vehicle_rate",
        "unemployment_rate", "disability_rate", "minority_rate", "total_population",
        "geometry"
    ]
    tracts_sub = tracts_gdf[[c for c in census_cols if c in tracts_gdf.columns]].copy()

    # Primary join: point in polygon
    joined = gpd.sjoin(centroids_gdf, tracts_sub, how="left", predicate="within")
    joined = joined[~joined.index.duplicated(keep="first")]

    # Secondary join: nearest neighbor fallback for edge/boundary tiles
    missing_mask = joined["GEOID"].isna()
    if missing_mask.any():
        logger.info(f"Resolving {missing_mask.sum()} boundary edge tiles via nearest-tract spatial join...")
        missing_centroids = centroids_gdf.loc[missing_mask].to_crs(epsg=3857)
        tracts_proj = tracts_sub.to_crs(epsg=3857)
        nearest_match = gpd.sjoin_nearest(missing_centroids, tracts_proj, how="left")
        nearest_match = nearest_match[~nearest_match.index.duplicated(keep="first")]

        for c in ["GEOID", "NAME", "poverty_rate", "elderly_rate", "no_vehicle_rate", "unemployment_rate", "disability_rate", "minority_rate", "total_population"]:
            if c in nearest_match.columns:
                joined.loc[missing_mask, c] = nearest_match[c]

    # Assign joined Census variables to tiles GeoDataFrame
    tiles["geoid"] = joined["GEOID"].values
    tiles["census_tract"] = joined["NAME"].values
    tiles["poverty_rate"] = joined["poverty_rate"].values
    tiles["elderly_rate"] = joined["elderly_rate"].values
    tiles["no_vehicle_rate"] = joined["no_vehicle_rate"].values

    for c in ["unemployment_rate", "disability_rate", "minority_rate", "total_population"]:
        if c in joined.columns:
            tiles[c] = joined[c].values

    # Documented median imputation for unpopulated tracts (e.g. airport/industrial core)
    # NEVER replace missing data with random values
    for c in ["poverty_rate", "elderly_rate", "no_vehicle_rate", "unemployment_rate", "disability_rate", "minority_rate", "total_population"]:
        if c in tiles.columns and tiles[c].isna().any():
            med_val = float(tracts_gdf[c].dropna().median())
            logger.info(f"Imputing {tiles[c].isna().sum()} missing values in '{c}' using Phoenix tract median ({med_val:.4f}).")
            tiles[c] = tiles[c].fillna(med_val).round(4) if c != "total_population" else tiles[c].fillna(med_val)

    return tiles

def ingest_census_demographics_for_tiles(
    tiles_gdf: gpd.GeoDataFrame,
    output_dir: str = "data/raw",
    force_refresh: bool = False
) -> gpd.GeoDataFrame:
    """
    Main entry point: fetches/loads real Census Tract demographics and spatially joins to tiles.
    """
    tracts_gdf = fetch_real_census_tracts_demographics(output_dir=output_dir, force_refresh=force_refresh)
    enriched_tiles_gdf = spatial_join_census_to_tiles(tiles_gdf, tracts_gdf)
    return enriched_tiles_gdf

if __name__ == "__main__":
    from fortyguard_ingestion import fetch_or_generate_fortyguard_data
    tiles = fetch_or_generate_fortyguard_data()
    enriched = ingest_census_demographics_for_tiles(tiles)
    print(f"Enriched {len(enriched)} tiles with real Census data.")
    print(enriched[["tile_id", "district", "geoid", "census_tract", "poverty_rate", "elderly_rate", "no_vehicle_rate"]].head(10))
