"""
CoolCity AI - Track 7 Main Analytics Pipeline Orchestrator
===========================================================
Orchestrates real Track 7 analytics pipeline locally using cached data:
1. Loads and validates tile-level dataset (48,199 tiles, 11-character GEOIDs)
2. Summarizes geographic scope (central Phoenix heat island corridor)
3. Aggregates metrics to U.S. Census Tract level (~230 GEOIDs)
4. Exports compact frontend handoff artifacts (phoenix_tract_risk.json & .csv)
5. Executes tract-level correlation analysis & exports correlation_summary.json
6. Executes 2-component weighting sensitivity analysis & exports sensitivity_summary.json
7. Generates comprehensive track7_summary.json metadata artifact

NO network or API calls are made during orchestration.
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

# Add parent directory and analysis directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_zone_metrics import generate_tract_zone_metrics, normalize_and_validate_geoid
from correlation import analyze_track7_correlations, export_correlation_summary_json
from sensitivity_analysis import run_sensitivity_analysis
from vulnerability import calculate_composite_risk

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Track7Pipeline")


def run_track7_pipeline(
    tiles_csv_path: Optional[Path] = None,
    output_dir: Optional[Path] = None
):
    """
    Executes complete offline Track 7 analytics pipeline.
    """
    project_root = Path(__file__).parent.parent
    if tiles_csv_path is None:
        tiles_csv_path = project_root / "data" / "processed" / "phoenix_risk_scored_tiles.csv"
    if output_dir is None:
        output_dir = project_root / "data" / "processed"

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(">> CoolCity AI Track 7 Real Data Analytics Pipeline")
    print("   Location: Phoenix, Arizona (Central Heat Island Corridor)")
    print("   Spatial Unit: U.S. Census Tract (11-character GEOID)")
    print("==========================================================================")

    # 1. Load and Validate Local Dataset
    if not tiles_csv_path.exists():
        raise FileNotFoundError(f"Processed tile dataset not found at {tiles_csv_path}")

    logger.info(f"[1/7] Loading local processed tile dataset from {tiles_csv_path}...")
    df = pd.read_csv(tiles_csv_path, dtype={"geoid": str})
    total_tiles = len(df)

    # GEOID validation
    df["geoid"] = df["geoid"].apply(normalize_and_validate_geoid)
    unique_geoids = df["geoid"].nunique()
    logger.info(f"      - Validated {total_tiles} tiles across {unique_geoids} unique 11-character Census Tract GEOIDs.")

    # 2. Summarize Geographic Scope & Persistence Status
    logger.info("[2/7] Summarizing Geographic Scope & Model Parameters...")
    has_persistence = "persistence_score" in df.columns and df["persistence_score"].notna().any()
    pers_status = "Available" if has_persistence else "Unavailable (Single-snapshot dataset)"
    logger.info(f"      - Study Area: Central Phoenix Urban Heat Island Corridor")
    logger.info(f"      - Coverage Status: Partial Study Area (Full-city data pending Member 1)")
    logger.info(f"      - Model Weighting: Prototype Heuristic (50% Heat Intensity / 50% Vulnerability)")
    logger.info(f"      - Persistence Status: {pers_status}")

    # 3. Aggregate Heat to Census Tracts & Generate Frontend Handoff Artifacts
    logger.info("[3/7] Aggregating Metrics to Census Tract Level...")
    tract_df = generate_tract_zone_metrics(tiles_csv_path=str(tiles_csv_path), output_dir=str(output_dir))
    tract_count = len(tract_df)
    represented_pop = int(tract_df["affectedPopulation"].sum())

    # 4. Statistical Correlation Engine (Tract-Level)
    logger.info("[4/7] Running Tract-Level Statistical Correlation Analysis...")
    corr_summary = export_correlation_summary_json(df, output_path=str(output_dir / "correlation_summary.json"))

    # 5. Sensitivity Analysis
    logger.info("[5/7] Running Weighting Sensitivity Analysis...")
    sens_summary = run_sensitivity_analysis(tiles_csv_path=tiles_csv_path, output_dir=output_dir)

    # 6. Generate Track 7 Master Metadata Summary
    logger.info("[6/7] Generating Track 7 Master Summary (track7_summary.json)...")
    track7_summary_data = {
        "studyArea": "Central Phoenix Heat Corridor",
        "coverageStatus": "partial-study-area",
        "statisticalUnit": "Census Tract",
        "tileCount": total_tiles,
        "tractCount": tract_count,
        "representedTractPopulation": represented_pop,
        "representedTractPopulationNote": "sum of Census populations for tracts represented/intersected by the current heat study area",
        "riskModelStatus": "prototype heuristic weighting",
        "riskFormula": "0.50 * intensity_score + 0.50 * vulnerability_score",
        "persistenceAvailable": False,
        "historicalBaselineVerified": False,
        "canonicalOutputs": [
            "data/processed/phoenix_tract_risk.json",
            "data/processed/phoenix_tract_risk.csv",
            "data/processed/correlation_summary.json",
            "data/processed/sensitivity_summary.json",
            "data/processed/track7_summary.json"
        ]
    }

    track7_summary_path = output_dir / "track7_summary.json"
    with open(track7_summary_path, "w", encoding="utf-8") as f:
        json.dump(track7_summary_data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved master Track 7 summary to {track7_summary_path}")

    # 7. Print Concise Summary
    print("\n" + "=" * 80)
    print("TRACK 7 PIPELINE EXECUTION SUMMARY")
    print("=" * 80)
    print(f"  - Tiles Processed:                {total_tiles:,}")
    print(f"  - Unique Census Tracts:           {tract_count}")
    print(f"  - Represented Tract Population:   {represented_pop:,}")
    print(f"  - Statistical Correlation Unit:   Census Tract (GEOID)")
    print(f"  - Model Weighting:                Prototype Heuristic (50/50)")
    print(f"  - Historical Baseline Anomaly:    Disabled (Unverified baseline)")
    print(f"  - Persistence Status:             Marked Unavailable")
    print()
    print("Canonical Compact Frontend Handoff Artifacts:")
    print(f"  1. {output_dir / 'phoenix_tract_risk.json'}")
    print(f"  2. {output_dir / 'phoenix_tract_risk.csv'}")
    print(f"  3. {output_dir / 'correlation_summary.json'}")
    print(f"  4. {output_dir / 'sensitivity_summary.json'}")
    print(f"  5. {output_dir / 'track7_summary.json'}")
    print("=" * 80)
    print("[SUCCESS] Track 7 Analytics Pipeline Execution Completed Successfully!")


if __name__ == "__main__":
    run_track7_pipeline()
