"""
CoolCity AI - Track 7 Main Analytics Pipeline
==============================================
Orchestrates real data ingestion (FortyGuard tOS API + U.S. Census Bureau ACS 5-Year),
spatial join onto Phoenix thermal tiles, climatological anomaly calculation,
demographic vulnerability scoring, composite risk scoring, and SciPy statistical
correlation analysis.

Outputs:
  - data/processed/phoenix_risk_scored_tiles.csv
  - data/processed/phoenix_risk_scored_tiles.json
  - data/processed/phoenix_risk_scored_tiles.geojson
"""

import os
import sys
import json
import logging
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd
import geopandas as gpd

# Add parent directory and analysis directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from fortyguard_ingestion import fetch_or_generate_fortyguard_data
from census_ingestion import ingest_census_demographics_for_tiles
from historical_heat import compute_historical_baseline
from heat_analysis import compute_heat_intensity, compute_heat_persistence
from vulnerability import calculate_composite_risk
from correlation import analyze_track7_correlations

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HeatAnalysisMain")

def run_track7_pipeline():
    print("==========================================================================")
    print(">> Starting CoolCity AI Track 7 Real Data Analytics Pipeline")
    print("   Location: Phoenix, Arizona (Urban Heat Island AOI)")
    print("   Data Sources: Real FortyGuard Thermal Ingestion + Real U.S. Census ACS")
    print("==========================================================================")
    
    # 1. FortyGuard Thermal Data Ingestion (REAL API / Cache)
    print("\n[Step 1/6] Ingesting FortyGuard Real Surface/Ambient Heat Data...")
    raw_tiles_gdf = fetch_or_generate_fortyguard_data(output_dir="data/raw")
    print(f"  [+] Ingested {len(raw_tiles_gdf)} real FortyGuard thermal tiles across Phoenix AOI.")
    print(f"  [+] Temperature range: {raw_tiles_gdf['temperature'].min():.2f} deg C ({raw_tiles_gdf['temperature_f'].min():.2f} deg F) to {raw_tiles_gdf['temperature'].max():.2f} deg C ({raw_tiles_gdf['temperature_f'].max():.2f} deg F)")
    
    # 2. U.S. Census ACS Demographics Ingestion & Spatial Join (REAL ACS / TIGERweb)
    print("\n[Step 2/6] Ingesting U.S. Census ACS 5-Year Demographics & Spatially Joining...")
    census_tiles_gdf = ingest_census_demographics_for_tiles(raw_tiles_gdf, output_dir="data/raw")
    print(f"  [+] Real spatial join complete: {len(census_tiles_gdf)} tiles mapped to Census Tracts.")
    print(f"  [+] Traceable Census Tracts: {census_tiles_gdf['geoid'].nunique()} unique tracts joined.")
    
    # 3. Historical Baseline & Heat Anomaly Calculation
    print("\n[Step 3/6] Computing Climatological Baseline & Heat Anomaly...")
    anomaly_gdf = compute_historical_baseline(census_tiles_gdf, baseline_summer_mean_c=39.5)
    mean_anomaly = anomaly_gdf['temp_anomaly_c'].mean()
    print(f"  [+] Climatological baseline: 39.50 deg C (103.10 deg F)")
    print(f"  [+] Mean temperature anomaly: {mean_anomaly:+.2f} deg C ({mean_anomaly * 9.0 / 5.0:+.2f} deg F)")
    
    # 4. Heat Intensity & Persistence Scoring
    print("\n[Step 4/6] Computing Heat Intensity & Persistence Scores...")
    intensity_gdf = compute_heat_intensity(anomaly_gdf, temp_col="temperature")
    persistence_gdf = compute_heat_persistence(intensity_gdf)
    has_pers = persistence_gdf["persistence_score"].notna().any()
    pers_status = "Available" if has_pers else "Marked Unavailable (Single daily aggregate snapshot)"
    print(f"  [+] Heat intensity scored (0-100 scale).")
    print(f"  [+] Heat persistence status: {pers_status}")
    
    # 5. Composite Risk & Vulnerability Scoring
    print("\n[Step 5/6] Calculating Demographic Vulnerability & Final Composite Risk...")
    scored_gdf = calculate_composite_risk(persistence_gdf)
    print(f"  [+] Final risk score range: {scored_gdf['final_risk_score'].min():.2f} to {scored_gdf['final_risk_score'].max():.2f}")
    print("  [+] Risk Band Distribution:")
    for band, count in scored_gdf["risk_level"].value_counts().items():
        pct = (count / len(scored_gdf)) * 100.0
        print(f"      - {band:10s}: {count:5d} tiles ({pct:5.1f}%)")
    
    # 6. Statistical Correlation Analysis (SciPy Engine)
    print("\n[Step 6/6] Running SciPy Statistical Correlation Engine...")
    demo_vars_to_test = ["poverty_rate", "elderly_rate", "no_vehicle_rate", "unemployment_rate", "disability_rate", "minority_rate"]
    corr_df = analyze_track7_correlations(
        scored_gdf,
        heat_col="intensity_score",
        demo_cols=[c for c in demo_vars_to_test if c in scored_gdf.columns]
    )
    
    print("\n" + "="*80)
    print("TRACK 7 STATISTICAL CORRELATION RESULTS (Heat Intensity vs. Real Demographics):")
    print("="*80)
    print(corr_df.to_string(index=False))
    print("="*80)
    
    # Hotspot summary
    print("\nTOP 5 HIGHEST RISK URBAN HEAT ISLAND HOTSPOTS (Phoenix, AZ):")
    cols_to_show = ["tile_id", "district", "census_tract", "temperature", "poverty_rate", "elderly_rate", "no_vehicle_rate", "vulnerability_score", "final_risk_score", "risk_level"]
    available_cols = [c for c in cols_to_show if c in scored_gdf.columns]
    top_hotspots = scored_gdf.sort_values(by="final_risk_score", ascending=False).head(5)
    print(top_hotspots[available_cols].to_string(index=False))
    
    # Export Outputs to data/processed/
    output_dir = Path(__file__).parent.parent / "data" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    csv_path = output_dir / "phoenix_risk_scored_tiles.csv"
    json_path = output_dir / "phoenix_risk_scored_tiles.json"
    geojson_path = output_dir / "phoenix_risk_scored_tiles.geojson"
    
    # Save CSV (without geometry object)
    df_export = pd.DataFrame(scored_gdf.drop(columns="geometry", errors="ignore"))
    df_export.to_csv(csv_path, index=False)
    print(f"\n[+] Saved Processed CSV: {csv_path} ({len(df_export)} records)")
    
    # Save JSON
    df_export.to_json(json_path, orient="records", indent=2)
    print(f"[+] Saved Processed JSON: {json_path} ({len(df_export)} records)")
    
    # Save GeoJSON with polygon boundaries
    scored_gdf.to_file(geojson_path, driver="GeoJSON")
    print(f"[+] Saved Processed GeoJSON: {geojson_path} ({len(scored_gdf)} spatial features)")
    
    print("\n[SUCCESS] Track 7 Real Data Analytics Pipeline Execution Successfully Completed!")
    return scored_gdf, corr_df

if __name__ == "__main__":
    run_track7_pipeline()