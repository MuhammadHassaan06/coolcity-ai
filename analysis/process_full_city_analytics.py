"""
CoolCity AI - Track 7 Full-City Phoenix Analytics Processor
===========================================================
Converts completed full-city FortyGuard heat snapshots into canonical
Track 7 Census Tract analytics for the official Phoenix boundary.

Supports snapshot parameters for reproducible multi-snapshot processing:
  - 2024-07-15 14:00 (Historical Baseline)
  - 2026-08-30 14:00 (Aug 30, 2026 Snapshot)
"""

import os
import sys
import json
import math
import time
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from scipy import stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FullCityAnalytics")


def normalize_and_validate_geoid(raw_val: Any) -> str:
    """Ensures 11-character GEOID starting with 04 for Arizona."""
    if pd.isna(raw_val) or raw_val is None:
        raise ValueError("Encountered null or missing Census Tract GEOID identifier.")
    geoid_str = str(raw_val).strip()
    if geoid_str.endswith(".0"):
        geoid_str = geoid_str[:-2]
    if len(geoid_str) == 10 and geoid_str.startswith("4"):
        geoid_str = "0" + geoid_str
    if not geoid_str.isdigit() or len(geoid_str) != 11:
        raise ValueError(f"Invalid Census Tract GEOID format: '{geoid_str}'. Must be 11 digits.")
    return geoid_str


def classify_risk_status(risk_score: float) -> str:
    """Classifies risk_score into standard risk bands."""
    if risk_score >= 75.0:
        return "critical"
    elif risk_score >= 50.0:
        return "high"
    elif risk_score >= 25.0:
        return "moderate"
    else:
        return "low"


def is_point_in_rings(x: float, y: float, rings: List[List[List[float]]]) -> bool:
    """Ray casting point-in-polygon algorithm supporting exterior rings and holes."""
    inside = False
    exterior = rings[0]
    n = len(exterior)
    p1x, p1y = exterior[0]
    for i in range(n + 1):
        p2x, p2y = exterior[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    if not inside:
        return False

    for hole in rings[1:]:
        in_hole = False
        hn = len(hole)
        hp1x, hp1y = hole[0]
        for i in range(hn + 1):
            hp2x, hp2y = hole[i % hn]
            if y > min(hp1y, hp2y):
                if y <= max(hp1y, hp2y):
                    if x <= max(hp1x, hp2x):
                        if hp1y != hp2y:
                            hxinters = (y - hp1y) * (hp2x - hp1x) / (hp2y - hp1y) + hp1x
                        if hp1x == hp2x or x <= hxinters:
                            in_hole = not in_hole
            hp1x, hp1y = hp2x, hp2y
        if in_hole:
            return False

    return True


def parse_args():
    parser = argparse.ArgumentParser(description="Process full-city heat snapshot into Track 7 analytics.")
    parser.add_argument("--snapshot-date", type=str, default="2026-08-30", help="Snapshot date (YYYY-MM-DD)")
    parser.add_argument("--snapshot-time", type=str, default="14:00", help="Snapshot time (HH:mm)")
    parser.add_argument("--heat-file", type=str, default=None, help="Path to combined heat JSON file")
    parser.add_argument("--manifest-file", type=str, default=None, help="Path to run manifest.json")
    parser.add_argument("--col-summary-file", type=str, default=None, help="Path to collection summary JSON")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory for processed analytics")
    return parser.parse_args()


def run_full_city_processing():
    args = parse_args()
    snapshot_date = args.snapshot_date
    snapshot_time = args.snapshot_time
    clean_time = snapshot_time.replace(":", "")
    snapshot_id = f"{snapshot_date}-{clean_time}"

    project_root = Path(__file__).parent.parent
    web_dir = project_root / "web"
    data_dir = project_root / "data"

    if args.heat_file:
        combined_heat_path = Path(args.heat_file)
    else:
        combined_heat_path = web_dir / "data" / "snapshots" / snapshot_id / "combined" / "phoenix_full_city_heat.json"

    if args.manifest_file:
        manifest_path = Path(args.manifest_file)
    else:
        manifest_path = web_dir / "data" / "snapshots" / snapshot_id / "manifest.json"

    if args.col_summary_file:
        col_summary_path = Path(args.col_summary_file)
    else:
        col_summary_path = web_dir / "data" / "snapshots" / snapshot_id / "combined" / "full_city_collection_summary.json"

    if args.output_dir:
        processed_dir = Path(args.output_dir)
    else:
        processed_dir = data_dir / "processed" / "snapshots" / snapshot_id

    processed_dir.mkdir(parents=True, exist_ok=True)

    boundary_path = web_dir / "public" / "data" / "phoenix-city-boundary.geojson"
    census_path = data_dir / "raw" / "phoenix_census_tracts_demographics.geojson"

    logger.info(f"Processing Track 7 Analytics for Snapshot [{snapshot_id}] ({snapshot_date} {snapshot_time})...")

    # 1. VERIFY FULL-CITY BATCH MANIFEST & SUMMARY
    logger.info("[Step 1/8] Verifying full-city collection status from manifest...")
    if not manifest_path.exists() or not col_summary_path.exists():
        raise FileNotFoundError(f"Collection manifest or summary missing for {snapshot_id}.")

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    with open(col_summary_path, "r", encoding="utf-8") as f:
        col_summary = json.load(f)

    planned_chunks = manifest.get("totalPlannedChunks", 0)
    chunks_dict = manifest.get("chunks", {})
    completed_chunks = sum(1 for c in chunks_dict.values() if c.get("status") == "completed")
    failed_chunks = sum(1 for c in chunks_dict.values() if c.get("status") == "failed")
    timed_out_chunks = sum(1 for c in chunks_dict.values() if c.get("status") == "timed_out")
    reused_chunks = sum(1 for c in chunks_dict.values() if c.get("creationRequestCount", 1) == 0)
    raw_feature_count = col_summary.get("totalRawFeatures", 0)
    coverage_status = col_summary.get("coverageStatus", "")

    if completed_chunks != planned_chunks or failed_chunks > 0 or timed_out_chunks > 0 or "complete coverage" not in coverage_status:
        raise ValueError(
            f"Collection verification failed: completed {completed_chunks}/{planned_chunks}, "
            f"failed={failed_chunks}, timed_out={timed_out_chunks}, status='{coverage_status}'."
        )

    logger.info(
        f"Manifest Verified: Planned={planned_chunks}, Completed={completed_chunks}, "
        f"Reused={reused_chunks}, Raw Features={raw_feature_count:,}"
    )

    # 2. LOAD PHOENIX CITY BOUNDARY
    logger.info("[Step 2/8] Loading official Phoenix municipal boundary...")
    with open(boundary_path, "r", encoding="utf-8") as f:
        boundary_data = json.load(f)

    phx_polygons = []
    for feat in boundary_data.get("features", []):
        geom = feat.get("geometry", {})
        gtype = geom.get("type")
        coords = geom.get("coordinates", [])
        if gtype == "Polygon":
            phx_polygons.append(coords)
        elif gtype == "MultiPolygon":
            phx_polygons.extend(coords)

    phx_bboxes = []
    for poly in phx_polygons:
        ext = poly[0]
        min_x = min(pt[0] for pt in ext)
        max_x = max(pt[0] for pt in ext)
        min_y = min(pt[1] for pt in ext)
        max_y = max(pt[1] for pt in ext)
        phx_bboxes.append((min_x, min_y, max_x, max_y, poly))

    GRID_SIZE = 0.05
    phx_grid = {}
    for idx, (min_x, min_y, max_x, max_y, poly) in enumerate(phx_bboxes):
        min_gx, max_gx = int(min_x / GRID_SIZE), int(max_x / GRID_SIZE)
        min_gy, max_gy = int(min_y / GRID_SIZE), int(max_y / GRID_SIZE)
        for gx in range(min_gx, max_gx + 1):
            for gy in range(min_gy, max_gy + 1):
                cell = (gx, gy)
                if cell not in phx_grid:
                    phx_grid[cell] = []
                phx_grid[cell].append(idx)

    def is_in_phoenix_boundary(x: float, y: float) -> bool:
        gx, gy = int(x / GRID_SIZE), int(y / GRID_SIZE)
        for idx in phx_grid.get((gx, gy), []):
            min_x, min_y, max_x, max_y, poly = phx_bboxes[idx]
            if min_x <= x <= max_x and min_y <= y <= max_y:
                if is_point_in_rings(x, y, poly):
                    return True
        return False

    # 3. FILTER COMBINED THERMAL SNAPSHOT STRICTLY TO PHOENIX BOUNDARY
    logger.info(f"[Step 3/8] Loading and filtering thermal snapshot ({combined_heat_path})...")
    t0 = time.time()
    with open(combined_heat_path, "r", encoding="utf-8") as f:
        heat_json = json.load(f)

    raw_features = heat_json.get("features", [])
    retained_phoenix_features = []
    excluded_outside_features = []

    for feat in raw_features:
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [])
        gtype = geom.get("type")
        all_pts = []
        if gtype == "Polygon":
            for ring in coords:
                all_pts.extend(ring)
        elif gtype == "MultiPolygon":
            for poly in coords:
                for ring in poly:
                    all_pts.extend(ring)

        if all_pts:
            cx = sum(p[0] for p in all_pts) / len(all_pts)
            cy = sum(p[1] for p in all_pts) / len(all_pts)
            props = feat.get("properties", {})
            temp_c = props.get("averageTemperatureC")
            if temp_c is None:
                temp_c = props.get("average_temperature", props.get("temperature", 0.0))

            feat_item = {
                "cx": cx,
                "cy": cy,
                "temp_c": float(temp_c),
                "properties": props
            }

            if is_in_phoenix_boundary(cx, cy):
                retained_phoenix_features.append(feat_item)
            else:
                excluded_outside_features.append(feat_item)

    logger.info(
        f"Spatial Boundary Filter Completed in {time.time()-t0:.2f}s:\n"
        f"  - Total Raw Features:       {len(raw_features):,}\n"
        f"  - Retained Inside Phoenix:  {len(retained_phoenix_features):,}\n"
        f"  - Excluded Outside Phoenix: {len(excluded_outside_features):,}"
    )

    # 4. LOAD CENSUS TRACT DEMOGRAPHICS & BUILD SPATIAL INDEX
    logger.info("[Step 4/8] Loading Census Tract demographics and building spatial index...")
    with open(census_path, "r", encoding="utf-8") as f:
        census_data = json.load(f)

    tract_list = []
    tract_grid = {}

    for idx, feat in enumerate(census_data.get("features", [])):
        props = feat.get("properties", {})
        raw_geoid = props.get("GEOID")
        if not raw_geoid:
            continue
        geoid = normalize_and_validate_geoid(raw_geoid)

        geom = feat.get("geometry", {})
        gtype = geom.get("type")
        coords = geom.get("coordinates", [])
        polys = []
        if gtype == "Polygon":
            polys.append(coords)
        elif gtype == "MultiPolygon":
            polys.extend(coords)

        for poly in polys:
            ext = poly[0]
            min_x = min(pt[0] for pt in ext)
            max_x = max(pt[0] for pt in ext)
            min_y = min(pt[1] for pt in ext)
            max_y = max(pt[1] for pt in ext)
            centroid_x = (min_x + max_x) / 2.0
            centroid_y = (min_y + max_y) / 2.0

            tract_entry = {
                "geoid": geoid,
                "props": props,
                "poly": poly,
                "bbox": (min_x, min_y, max_x, max_y),
                "centroid": (centroid_x, centroid_y)
            }
            t_idx = len(tract_list)
            tract_list.append(tract_entry)

            min_gx, max_gx = int(min_x / GRID_SIZE), int(max_x / GRID_SIZE)
            min_gy, max_gy = int(min_y / GRID_SIZE), int(max_y / GRID_SIZE)
            for gx in range(min_gx, max_gx + 1):
                for gy in range(min_gy, max_gy + 1):
                    cell = (gx, gy)
                    if cell not in tract_grid:
                        tract_grid[cell] = []
                    tract_grid[cell].append(t_idx)

    def find_tract_for_point(x: float, y: float) -> Tuple[str, Dict[str, Any]]:
        gx, gy = int(x / GRID_SIZE), int(y / GRID_SIZE)
        candidate_indices = tract_grid.get((gx, gy), [])
        for t_idx in candidate_indices:
            entry = tract_list[t_idx]
            min_x, min_y, max_x, max_y = entry["bbox"]
            if min_x <= x <= max_x and min_y <= y <= max_y:
                if is_point_in_rings(x, y, entry["poly"]):
                    return entry["geoid"], entry["props"]

        # Nearest neighbor fallback for edge boundary points
        best_dist = float("inf")
        best_geoid = None
        best_props = None
        for entry in tract_list:
            min_x, min_y, max_x, max_y = entry["bbox"]
            dx = max(min_x - x, 0, x - max_x)
            dy = max(min_y - y, 0, y - max_y)
            dist_sq = dx*dx + dy*dy
            if dist_sq < best_dist:
                best_dist = dist_sq
                best_geoid = entry["geoid"]
                best_props = entry["props"]

        return best_geoid, best_props

    # 5. SPATIAL JOIN THERMAL FEATURES TO CENSUS TRACTS
    logger.info("[Step 5/8] Performing spatial join between Phoenix thermal tiles and Census Tracts...")
    t1 = time.time()
    tract_tiles_map: Dict[str, List[float]] = {}
    tract_props_map: Dict[str, Dict[str, Any]] = {}
    join_failures = 0

    for feat in retained_phoenix_features:
        geoid, props = find_tract_for_point(feat["cx"], feat["cy"])
        if not geoid:
            join_failures += 1
            continue
        if geoid not in tract_tiles_map:
            tract_tiles_map[geoid] = []
            tract_props_map[geoid] = props
        tract_tiles_map[geoid].append(feat["temp_c"])

    represented_tract_count = len(tract_tiles_map)
    logger.info(
        f"Spatial Join Completed in {time.time()-t1:.2f}s across {represented_tract_count} Phoenix Census Tracts. Join failures={join_failures}."
    )

    # 6. AGGREGATE HEAT, COMPUTE VULNERABILITY, & COMPOSITE RISK MODEL
    logger.info("[Step 6/8] Aggregating heat metrics & computing vulnerability & composite risk scores...")

    all_phoenix_temps = [f["temp_c"] for f in retained_phoenix_features]
    city_min_temp = min(all_phoenix_temps)
    city_max_temp = max(all_phoenix_temps)
    city_mean_temp = float(np.mean(all_phoenix_temps))

    logger.info(f"Full-City Temperature Range: {city_min_temp:.2f}°C to {city_max_temp:.2f}°C (Mean: {city_mean_temp:.2f}°C)")

    tract_rows = []
    for geoid, temps in tract_tiles_map.items():
        props = tract_props_map[geoid]
        avg_temp = float(np.mean(temps))

        # Recomputed Heat Intensity Score using THIS SNAPSHOT's min/max scaling
        intensity_score = round(((avg_temp - city_min_temp) / (city_max_temp - city_min_temp)) * 100.0, 2)
        intensity_score = max(0.0, min(100.0, intensity_score))

        pov_rate = float(props.get("poverty_rate", 0.0) or 0.0)
        eld_rate = float(props.get("elderly_rate", 0.0) or 0.0)
        veh_rate = float(props.get("no_vehicle_rate", 0.0) or 0.0)
        unemp_rate = float(props.get("unemployment_rate", 0.0) or 0.0)
        disab_rate = float(props.get("disability_rate", 0.0) or 0.0)
        minority_rate = float(props.get("minority_rate", 0.0) or 0.0)
        total_pop = int(props.get("total_population", 0) or 0)

        name_raw = str(props.get("NAME", f"Census Tract {geoid}")).strip()
        name_str = name_raw if name_raw.startswith("Census Tract") else f"Census Tract {name_raw}"

        tract_rows.append({
            "geoid": geoid,
            "name": name_str,
            "tile_count": len(temps),
            "avg_temp": round(avg_temp, 2),
            "intensity_score": intensity_score,
            "poverty_rate": pov_rate,
            "elderly_rate": eld_rate,
            "no_vehicle_rate": veh_rate,
            "unemployment_rate": unemp_rate,
            "disability_rate": disab_rate,
            "minority_rate": minority_rate,
            "total_population": total_pop
        })

    tract_df = pd.DataFrame(tract_rows)

    # Min-Max Normalize Vulnerability Indicators across represented Phoenix Tracts
    for col in ["poverty_rate", "elderly_rate", "no_vehicle_rate"]:
        min_v = tract_df[col].min()
        max_v = tract_df[col].max()
        norm_col = f"{col}_norm"
        if max_v > min_v:
            tract_df[norm_col] = (tract_df[col] - min_v) / (max_v - min_v)
        else:
            tract_df[norm_col] = 0.0

    tract_df["vulnerability_score"] = (
        tract_df[["poverty_rate_norm", "elderly_rate_norm", "no_vehicle_rate_norm"]].mean(axis=1) * 100.0
    ).round(2)

    # Prototype Heuristic Weighting (50% Intensity / 50% Vulnerability)
    tract_df["riskScore"] = (
        0.50 * tract_df["intensity_score"] + 0.50 * tract_df["vulnerability_score"]
    ).round(2).clip(0.0, 100.0)

    tract_df["status"] = tract_df["riskScore"].apply(classify_risk_status)

    # Sort descending by riskScore
    tract_df = tract_df.sort_values(by="riskScore", ascending=False).reset_index(drop=True)

    tract_records = []
    for _, r in tract_df.iterrows():
        tract_records.append({
            "id": f"tract-{r['geoid']}",
            "code": r["geoid"],
            "name": r["name"],
            "geoid": r["geoid"],
            "riskScore": float(r["riskScore"]),
            "status": r["status"],
            "avgTemperature": float(r["avg_temp"]),
            "affectedPopulation": int(r["total_population"])
        })

    total_represented_pop = int(tract_df["total_population"].sum())

    # Export phoenix_tract_risk.json & .csv
    json_risk_path = processed_dir / "phoenix_tract_risk.json"
    csv_risk_path = processed_dir / "phoenix_tract_risk.csv"

    with open(json_risk_path, "w", encoding="utf-8") as f:
        json.dump(tract_records, f, indent=2, ensure_ascii=False)

    csv_risk_df = pd.DataFrame(tract_records)
    csv_risk_df.to_csv(csv_risk_path, index=False)

    logger.info(f"Saved {len(tract_records)} clean tract records to {json_risk_path} and {csv_risk_path}.")

    # 7. STATISTICAL CORRELATION ANALYSIS
    logger.info("[Step 7/8] Running tract-level statistical correlations...")
    demo_vars = ["poverty_rate", "elderly_rate", "no_vehicle_rate", "minority_rate", "unemployment_rate", "disability_rate"]
    correlations_list = []

    for h_col in ["intensity_score", "avg_temp"]:
        for d_col in demo_vars:
            clean = tract_df[[h_col, d_col]].dropna()
            n = len(clean)
            if n >= 3 and clean[h_col].std() > 0 and clean[d_col].std() > 0:
                p_r, p_p = stats.pearsonr(clean[h_col], clean[d_col])
                s_r, s_p = stats.spearmanr(clean[h_col], clean[d_col])
                correlations_list.append({
                    "variable": d_col,
                    "heat_metric": "intensity_score" if h_col == "intensity_score" else "average_temperature",
                    "sample_size": n,
                    "pearson_r": round(float(p_r), 4),
                    "pearson_p_value": float(p_p),
                    "spearman_rho": round(float(s_r), 4),
                    "spearman_p_value": float(s_p),
                    "is_statistically_significant": bool(p_p < 0.05)
                })

    corr_summary_data = {
        "study_unit": "Census Tract",
        "snapshotId": snapshot_id,
        "snapshotDate": snapshot_date,
        "snapshotTime": snapshot_time,
        "tract_count": represented_tract_count,
        "methodology_note": (
            f"Pearson and Spearman correlations calculated at the Census Tract level (N={represented_tract_count}) "
            f"for snapshot {snapshot_id}. "
            "Tile-level analysis was avoided to eliminate pseudoreplication and unearned statistical significance."
        ),
        "heat_metrics_tested": ["intensity_score", "average_temperature"],
        "correlations": correlations_list
    }

    corr_json_path = processed_dir / "correlation_summary.json"
    with open(corr_json_path, "w", encoding="utf-8") as f:
        json.dump(corr_summary_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved correlation summary to {corr_json_path}.")

    # 8. SENSITIVITY ANALYSIS (3 SCENARIOS)
    logger.info("[Step 8/8] Running weighting sensitivity analysis across 3 scenarios...")
    score_A = (0.40 * tract_df["intensity_score"] + 0.60 * tract_df["vulnerability_score"]).round(2)
    score_B = (0.50 * tract_df["intensity_score"] + 0.50 * tract_df["vulnerability_score"]).round(2)
    score_C = (0.60 * tract_df["intensity_score"] + 0.40 * tract_df["vulnerability_score"]).round(2)

    status_A = score_A.apply(classify_risk_status)
    status_B = score_B.apply(classify_risk_status)
    status_C = score_C.apply(classify_risk_status)

    rho_A_B, p_A_B = stats.spearmanr(score_A, score_B)
    rho_C_B, p_C_B = stats.spearmanr(score_C, score_B)

    shifts_A = int((status_A != status_B).sum())
    shifts_C = int((status_C != status_B).sum())

    top10_A = tract_df.assign(score_A=score_A).sort_values(by="score_A", ascending=False).head(10)["geoid"].tolist()
    top10_B = tract_df.assign(score_B=score_B).sort_values(by="score_B", ascending=False).head(10)["geoid"].tolist()
    top10_C = tract_df.assign(score_C=score_C).sort_values(by="score_C", ascending=False).head(10)["geoid"].tolist()

    overlap_A = len(set(top10_A).intersection(set(top10_B)))
    overlap_C = len(set(top10_C).intersection(set(top10_B)))

    sens_summary_data = {
        "analysis_type": "Census-Tract Level Weighting Sensitivity Analysis",
        "snapshotId": snapshot_id,
        "snapshotDate": snapshot_date,
        "snapshotTime": snapshot_time,
        "statistical_unit": "Census Tract",
        "tract_count": represented_tract_count,
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
            "Scenario_A_vs_B": {"tracts_changed": shifts_A, "percentage": round((shifts_A / represented_tract_count) * 100.0, 1)},
            "Scenario_C_vs_B": {"tracts_changed": shifts_C, "percentage": round((shifts_C / represented_tract_count) * 100.0, 1)}
        },
        "top_10_prioritization_stability": {
            "top_10_baseline_geoids": top10_B,
            "top_10_scenario_A_geoids": top10_A,
            "top_10_scenario_C_geoids": top10_C,
            "overlap_A_with_baseline": f"{overlap_A} / 10",
            "overlap_C_with_baseline": f"{overlap_C} / 10"
        },
        "disclaimer": (
            "Sensitivity analysis demonstrates prioritization stability under heuristic weight shifts. "
            "It does NOT imply clinical or epidemiological validation of any weight choice."
        )
    }

    sens_json_path = processed_dir / "sensitivity_summary.json"
    with open(sens_json_path, "w", encoding="utf-8") as f:
        json.dump(sens_summary_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved sensitivity summary to {sens_json_path}.")

    # 9. MASTER TRACK 7 SUMMARY
    track7_summary_data = {
        "studyArea": "City of Phoenix (Full-City Snapshot)",
        "snapshotId": snapshot_id,
        "coverageStatus": "full-city",
        "boundary": "City of Phoenix",
        "snapshotDate": snapshot_date,
        "snapshotTime": snapshot_time,
        "thermalFeatureCount": len(retained_phoenix_features),
        "rawThermalFeatureCount": len(raw_features),
        "excludedOutsideFeatures": len(excluded_outside_features),
        "statisticalUnit": "Census Tract",
        "tractCount": represented_tract_count,
        "representedTractPopulation": total_represented_pop,
        "representedTractPopulationNote": "sum of Census populations for Phoenix-intersecting represented tracts",
        "temperatureSummary": {
            "minC": round(city_min_temp, 2),
            "maxC": round(city_max_temp, 2),
            "meanC": round(city_mean_temp, 2)
        },
        "riskScoreSummary": {
            "minScore": round(float(tract_df["riskScore"].min()), 2),
            "maxScore": round(float(tract_df["riskScore"].max()), 2),
            "meanScore": round(float(tract_df["riskScore"].mean()), 2)
        },
        "riskModelStatus": "prototype heuristic weighting",
        "riskFormula": "0.50 * intensity_score + 0.50 * vulnerability_score",
        "persistenceAvailable": False,
        "historicalBaselineVerified": False,
        "canonicalOutputs": [
            f"data/processed/snapshots/{snapshot_id}/phoenix_tract_risk.json",
            f"data/processed/snapshots/{snapshot_id}/phoenix_tract_risk.csv",
            f"data/processed/snapshots/{snapshot_id}/correlation_summary.json",
            f"data/processed/snapshots/{snapshot_id}/sensitivity_summary.json",
            f"data/processed/snapshots/{snapshot_id}/track7_summary.json"
        ]
    }

    t7_json_path = processed_dir / "track7_summary.json"
    with open(t7_json_path, "w", encoding="utf-8") as f:
        json.dump(track7_summary_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved master Track 7 summary to {t7_json_path}.")

    # 10. PRINT SUMMARY REPORT
    print("\n" + "=" * 80)
    print(f"FULL-CITY PHOENIX TRACK 7 ANALYTICS COMPLETE [{snapshot_id}]")
    print("=" * 80)
    print(f"  - Snapshot ID:                   {snapshot_id}")
    print(f"  - Snapshot Date/Time:            {snapshot_date} {snapshot_time}")
    print(f"  - Coverage Status:               full-city")
    print(f"  - Boundary:                      City of Phoenix Municipal Boundary")
    print(f"  - Raw Thermal Features:          {len(raw_features):,}")
    print(f"  - Retained Inside Phoenix:       {len(retained_phoenix_features):,}")
    print(f"  - Excluded Outside Boundary:     {len(excluded_outside_features):,}")
    print(f"  - Represented Census Tracts:     {represented_tract_count}")
    print(f"  - Total Represented Population:  {total_represented_pop:,}")
    print(f"  - Temperature Range (C):        {city_min_temp:.2f}°C to {city_max_temp:.2f}°C (Mean: {city_mean_temp:.2f}°C)")
    print(f"  - Risk Score Range (0-100):      {tract_df['riskScore'].min():.2f} to {tract_df['riskScore'].max():.2f} (Mean: {tract_df['riskScore'].mean():.2f})")
    print(f"  - Top Ranked Hotspot GEOID:      {tract_records[0]['geoid']} ({tract_records[0]['name']}) - Score: {tract_records[0]['riskScore']}")
    print("=" * 80)


if __name__ == "__main__":
    run_full_city_processing()
