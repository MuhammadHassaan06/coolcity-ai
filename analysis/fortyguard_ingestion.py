"""
FortyGuard API Ingestion Engine for CoolCity AI (Phoenix, AZ)
===========================================================
Fetches and ingests REAL ambient & surface temperature data for Phoenix, Arizona
from the FortyGuard tOS Enterprise API.

Features:
- Live API calls to FortyGuard /v1/heatmap endpoint
- Automated API key rotation across primary and backup keys
- Local response caching to conserve daily API credit quotas
- Robust error reporting (NO synthetic or random data generation)
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape, Polygon
from dotenv import load_dotenv

# Ensure UTF-8 output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FortyGuardIngestion")

load_dotenv(override=True)

# Phoenix AOI Polygon Definition (Central Phoenix Heat Island Corridor)
PHOENIX_AOI_POLYGON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"name": "Phoenix Urban Heat Island Corridor AOI"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-112.2200, 33.3800],
                    [-111.9600, 33.3800],
                    [-111.9600, 33.5600],
                    [-112.2200, 33.5600],
                    [-112.2200, 33.3800]
                ]]
            }
        }
    ]
}

def get_fortyguard_api_keys() -> List[str]:
    """Retrieve all available FortyGuard API keys for rotation."""
    keys = []
    primary = os.getenv("FORTYGUARD_API_KEY", "").strip()
    if primary and primary != "your_api_key_here":
        keys.append(primary)

    for i in range(1, 10):
        backup = os.getenv(f"FORTYGUARD_API_KEY_BACKUP_{i}", "").strip()
        if backup and backup not in keys and not backup.startswith("your_backup"):
            keys.append(backup)

    multi = os.getenv("FORTYGUARD_API_KEYS", "").strip()
    if multi:
        for k in multi.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)

    return keys

def assign_phoenix_district(lat: float, lon: float) -> str:
    """
    [LEGACY / HEURISTIC] Classifies coordinates into informal 10-zone bounding boxes.
    NOTE: Track 7 analytics and frontend handoff metrics use official U.S. Census
    Tract GEOIDs (geoid) as the primary spatial unit, not synthetic coordinate boxes.
    """
    if lat < 33.43:
        return "South Mountain / Laveen"
    elif lat < 33.47:
        if lon < -112.10:
            return "Southwest Maryvale / Industrial"
        elif lon < -112.05:
            return "Central City / Downtown Phoenix"
        else:
            return "Sky Harbor / East Lake"
    elif lat < 33.51:
        if lon < -112.10:
            return "Maryvale West / Encanto"
        elif lon < -112.05:
            return "Midtown / Encanto Village"
        else:
            return "Camelback East / Arcadia"
    else:
        if lon < -112.10:
            return "Alhambra / Glendale Border"
        elif lon < -112.05:
            return "North Mountain / Sunnyslope"
        else:
            return "Paradise Valley Border / Camelback"

def fetch_or_generate_fortyguard_data(
    output_dir: str = "data/raw",
    start_date: str = "2024-07-15",
    filter_type: int = 3,
    granularity: int = 100,
    force_refresh: bool = False
) -> gpd.GeoDataFrame:
    """
    Ingests REAL FortyGuard thermal data for Phoenix AOI.

    1. Checks local cache to conserve API credits (30 heatmaps/day limit).
    2. If no cache or force_refresh=True, queries live FortyGuard API.
    3. If API keys fail or are unavailable and no cache exists, raises an error.
       (Never generates synthetic/random temperature data).

    Returns
    -------
    gpd.GeoDataFrame
        GeoDataFrame with real thermal tiles, temperatures, coordinates, and geometries.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    cache_json_path = out_path / "phoenix_fortyguard_cache.json"
    raw_geojson_path = out_path / "phoenix_fortyguard_raw.geojson"
    raw_json_path = out_path / "phoenix_fortyguard_raw.json"

    raw_response = None

    # Check cache first to protect API credit limits
    if not force_refresh and cache_json_path.exists():
        logger.info(f"Loading real FortyGuard thermal data from local cache: {cache_json_path}")
        try:
            with open(cache_json_path, "r", encoding="utf-8") as f:
                raw_response = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cache file ({e}). Will attempt API call.")
            raw_response = None

    if raw_response is None:
        api_keys = get_fortyguard_api_keys()
        if not api_keys:
            raise RuntimeError(
                "No FortyGuard API keys found in .env and no local cache exists at "
                f"{cache_json_path}. Please configure FORTYGUARD_API_KEY in .env."
            )

        logger.info(f"Querying live FortyGuard API for Phoenix AOI ({len(api_keys)} key(s) available)...")
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from fortyguard.client import FortyGuardClient

        last_error = None
        for i, key in enumerate(api_keys):
            try:
                masked_key = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
                logger.info(f"Attempting FortyGuard API call with key #{i+1} ({masked_key})...")
                client = FortyGuardClient(api_key=key)

                raw_response = client.create_heatmap(
                    polygon_aoi=PHOENIX_AOI_POLYGON,
                    start_date=start_date,
                    filter_type=filter_type,
                    granularity=granularity,
                    verbose=True
                )
                logger.info(f"FortyGuard API call succeeded with key #{i+1}!")
                break
            except Exception as e:
                logger.warning(f"FortyGuard API call failed with key #{i+1}: {e}")
                last_error = e
                continue

        if raw_response is None:
            raise RuntimeError(
                f"All FortyGuard API keys failed to return heatmap data: {last_error}. "
                "Aborting pipeline. Real data is required; synthetic fallback is disallowed."
            )

        # Cache successful API response
        logger.info(f"Caching raw FortyGuard API response to {cache_json_path}...")
        with open(cache_json_path, "w", encoding="utf-8") as f:
            json.dump(raw_response, f, indent=2)

    # Parse GeoDataFrame from FortyGuard GeoJSON features
    result = raw_response.get("result", {})
    map_data = result.get("map_data", {})
    features = map_data.get("features", [])

    if not features:
        raise ValueError(
            "FortyGuard response contains 0 features/tiles in result.map_data.features. "
            f"Response structure: {list(raw_response.keys())}"
        )

    gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
    logger.info(f"Successfully loaded {len(gdf)} real FortyGuard thermal tiles.")

    # Calculate projected centroids for geometric accuracy
    gdf_proj = gdf.to_crs(epsg=3857)
    centroids_proj = gdf_proj.geometry.centroid
    centroids_geo = centroids_proj.to_crs(epsg=4326)

    gdf["latitude"] = centroids_geo.y.round(6)
    gdf["longitude"] = centroids_geo.x.round(6)

    # Standardize temperature columns
    # FortyGuard returns 'average_temperature', 'min_temperature', 'max_temperature' in Celsius
    if "average_temperature" in gdf.columns:
        gdf["temperature"] = gdf["average_temperature"].round(2)
    elif "temperature" in gdf.columns:
        gdf["temperature"] = gdf["temperature"].round(2)
    else:
        raise KeyError("Expected 'average_temperature' or 'temperature' in FortyGuard tile properties.")

    gdf["temperature_f"] = (gdf["temperature"] * 9.0 / 5.0 + 32.0).round(2)

    if "min_temperature" in gdf.columns:
        gdf["min_temperature"] = gdf["min_temperature"].round(2)
    if "max_temperature" in gdf.columns:
        gdf["max_temperature"] = gdf["max_temperature"].round(2)

    # Format tile IDs consistently
    if "tile_id" in gdf.columns:
        gdf["tile_id"] = [f"FG-PHX-{int(tid):05d}" if str(tid).isdigit() else f"FG-PHX-{tid}" for tid in gdf["tile_id"]]
    else:
        gdf["tile_id"] = [f"FG-PHX-{i+1:05d}" for i in range(len(gdf))]

    # Assign municipal district
    gdf["district"] = [assign_phoenix_district(lat, lon) for lat, lon in zip(gdf["latitude"], gdf["longitude"])]

    # Save standard raw artifacts
    logger.info(f"Saving raw FortyGuard GeoJSON to {raw_geojson_path}...")
    gdf.to_file(raw_geojson_path, driver="GeoJSON")

    logger.info(f"Saving raw FortyGuard JSON to {raw_json_path}...")
    df_export = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
    df_export.to_json(raw_json_path, orient="records", indent=2)

    return gdf

if __name__ == "__main__":
    gdf = fetch_or_generate_fortyguard_data()
    print(f"Ingested {len(gdf)} tiles.")
    print(gdf[["tile_id", "district", "latitude", "longitude", "temperature", "temperature_f"]].head(10))
