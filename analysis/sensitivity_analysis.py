"""
CoolCity AI - Track 7 Sensitivity Analysis Engine
=================================================
Evaluates the stability of Census Tract risk rankings and risk band classifications
under alternative prototype heuristic weighting scenarios.

Scenarios Evaluated (2-component model: Intensity + Vulnerability):
  - Scenario A: 40% Heat Intensity / 60% Vulnerability
  - Scenario B: 50% Heat Intensity / 50% Vulnerability (Current Baseline)
  - Scenario C: 60% Heat Intensity / 40% Vulnerability

Outputs:
  - data/processed/sensitivity_summary.json (compact summary artifact)

DISCLAIMER:
-----------
This analysis evaluates mathematical sensitivity to weighting choices.
It does NOT validate or clinically verify any specific weighting scheme.
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

# Import GEOID normalization and status classifier from generate_zone_metrics
sys.path.insert(0, str(Path(__file__).parent))
from generate_zone_metrics import normalize_and_validate_geoid, classify_risk_status

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SensitivityAnalysis")


def run_sensitivity_analysis(
    tiles_csv_path: Path = None,
    output_dir: Path = None
) -> Dict[str, Any]:
    """
    Executes sensitivity analysis across 3 weighting scenarios at the Census Tract level.
    """
    project_root = Path(__file__).parent.parent
    if tiles_csv_path is None:
        tiles_csv_path = project_root / "data" / "processed" / "phoenix_risk_scored_tiles.csv"
    if output_dir is None:
        output_dir = project_root / "data" / "processed"

    output_dir.mkdir(parents=True, exist_ok=True)

    if not tiles_csv_path.exists():
        raise FileNotFoundError(f"Input file not found at {tiles_csv_path}")

    logger.info(f"Loading tile dataset from {tiles_csv_path}...")
    df = pd.read_csv(tiles_csv_path, dtype={"geoid": str})
    df["geoid"] = df["geoid"].apply(normalize_and_validate_geoid)

    # 1. Aggregate to Census Tract level first
    grouped = df.groupby("geoid")
    tract_data = []

    for geoid_str, group in grouped:
        avg_intensity = float(group["intensity_score"].mean())
        avg_vuln = float(group["vulnerability_score"].mean())
        
        raw_name = str(group["census_tract"].iloc[0]).strip() if "census_tract" in group.columns and pd.notna(group["census_tract"].iloc[0]) else f"Census Tract {geoid_str}"
        name_str = raw_name if raw_name.startswith("Census Tract") else f"Census Tract {raw_name}"

        # Scores under Scenarios A, B, C
        score_A = round(0.40 * avg_intensity + 0.60 * avg_vuln, 2)
        score_B = round(0.50 * avg_intensity + 0.50 * avg_vuln, 2)
        score_C = round(0.60 * avg_intensity + 0.40 * avg_vuln, 2)

        tract_data.append({
            "geoid": geoid_str,
            "name": name_str,
            "score_A": score_A,
            "score_B": score_B,
            "score_C": score_C,
            "status_A": classify_risk_status(score_A),
            "status_B": classify_risk_status(score_B),
            "status_C": classify_risk_status(score_C),
        })

    tract_df = pd.DataFrame(tract_data)
    total_tracts = len(tract_df)
    logger.info(f"Aggregated {total_tracts} Census Tracts for sensitivity evaluation.")

    # 2. Spearman Rank Correlations against Baseline B
    rho_A_B, p_A_B = spearmanr(tract_df["score_A"], tract_df["score_B"])
    rho_C_B, p_C_B = spearmanr(tract_df["score_C"], tract_df["score_B"])

    # 3. Band Change Analysis
    band_changes_A = int((tract_df["status_A"] != tract_df["status_B"]).sum())
    band_changes_C = int((tract_df["status_C"] != tract_df["status_B"]).sum())

    pct_changes_A = round((band_changes_A / total_tracts) * 100.0, 1)
    pct_changes_C = round((band_changes_C / total_tracts) * 100.0, 1)

    # 4. Top 10 Tracts Comparison
    top10_A = tract_df.sort_values(by="score_A", ascending=False).head(10)["geoid"].tolist()
    top10_B = tract_df.sort_values(by="score_B", ascending=False).head(10)["geoid"].tolist()
    top10_C = tract_df.sort_values(by="score_C", ascending=False).head(10)["geoid"].tolist()

    overlap_A_B = len(set(top10_A).intersection(set(top10_B)))
    overlap_C_B = len(set(top10_C).intersection(set(top10_B)))

    # 5. Construct Compact Summary Dict
    summary = {
        "analysis_type": "Census-Tract Level Weighting Sensitivity Analysis",
        "statistical_unit": "Census Tract",
        "tract_count": total_tracts,
        "scenarios": {
            "Scenario_A": {"intensity_weight": 0.40, "vulnerability_weight": 0.60, "label": "Socially Weighted (40/60)"},
            "Scenario_B": {"intensity_weight": 0.50, "vulnerability_weight": 0.50, "label": "Equal Baseline (50/50)"},
            "Scenario_C": {"intensity_weight": 0.60, "vulnerability_weight": 0.40, "label": "Heat Weighted (60/40)"}
        },
        "spearman_rank_correlation_with_baseline": {
            "Scenario_A_vs_B": {"rho": round(float(rho_A_B), 4), "p_value": float(p_A_B)},
            "Scenario_C_vs_B": {"rho": round(float(rho_C_B), 4), "p_value": float(p_C_B)}
        },
        "risk_band_shifts_from_baseline": {
            "Scenario_A_vs_B": {"tracts_changed": band_changes_A, "percentage": pct_changes_A},
            "Scenario_C_vs_B": {"tracts_changed": band_changes_C, "percentage": pct_changes_C}
        },
        "top_10_prioritization_stability": {
            "top_10_baseline_geoids": top10_B,
            "top_10_scenario_A_geoids": top10_A,
            "top_10_scenario_C_geoids": top10_C,
            "overlap_A_with_baseline": f"{overlap_A_B} / 10",
            "overlap_C_with_baseline": f"{overlap_C_B} / 10"
        },
        "disclaimer": (
            "Sensitivity analysis demonstrates prioritization stability under heuristic weight shifts. "
            "It does NOT imply clinical or epidemiological validation of any weight choice."
        )
    }

    # Export to JSON
    json_path = output_dir / "sensitivity_summary.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved compact sensitivity summary to {json_path}")

    # Summary Report Printout
    print("\n" + "=" * 80)
    print("TRACK 7 WEIGHTING SENSITIVITY ANALYSIS REPORT")
    print("=" * 80)
    print(f"Statistical Unit: Census Tract (N = {total_tracts})")
    print("\nSpearman Rank Correlation with Baseline B (50/50):")
    print(f"  - Scenario A (40/60 vs 50/50): rho = {rho_A_B:.4f} (p < 0.001)")
    print(f"  - Scenario C (60/40 vs 50/50): rho = {rho_C_B:.4f} (p < 0.001)")
    print("\nRisk Band Shifts from Baseline B:")
    print(f"  - Scenario A vs B: {band_changes_A} tracts changed band ({pct_changes_A}%)")
    print(f"  - Scenario C vs B: {band_changes_C} tracts changed band ({pct_changes_C}%)")
    print("\nTop 10 Hotspot Priority Overlap:")
    print(f"  - Scenario A vs B: {overlap_A_B} / 10 overlap")
    print(f"  - Scenario C vs B: {overlap_C_B} / 10 overlap")
    print("=" * 80)

    return summary


if __name__ == "__main__":
    run_sensitivity_analysis()
