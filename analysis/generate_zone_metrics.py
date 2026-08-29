"""
CoolCity AI - Track 7 Census Tract Metrics Aggregation Engine
==============================================================
Aggregates tile-level data (48,199 FortyGuard tiles + Census demographics)
into Census Tract level metrics (~230 Census Tracts) fully compatible with
the frontend PriorityZoneModel contract defined in web/src/types/dashboard.ts.

Reads:
  - data/processed/phoenix_risk_scored_tiles.csv  (tile-level pipeline output)

Outputs:
  - data/processed/phoenix_tract_risk.json (compact tract-level handoff)
  - data/processed/phoenix_tract_risk.csv (compact tract-level handoff)

GEOGRAPHIC IDENTIFIER & POPULATION NOTE:
-----------------------------------------
- The primary verified spatial unit is the 11-character U.S. Census Tract (GEOID),
  e.g. '04013113900' (State 04 + County 013 + Tract 113900). Leading zeros are
  strictly preserved and validated as string identifiers.
- affectedPopulation represents the total Census population residing within the
  intersected tract geometries. It is NOT an estimate of patients medically affected by heat.
"""

import sys
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TractMetrics")


def normalize_and_validate_geoid(raw_val: Any) -> str:
    """
    Normalizes and validates a Census Tract GEOID string identifier.
    
    For Arizona (FIPS state code '04'), an 11-character GEOID string starts with '04'.
    If numeric parsing stripped the leading zero resulting in 10 digits starting with '4'
    (e.g., '4013113900'), this function restores the leading '0' to yield '04013113900'.
    
    Raises ValueError if GEOID is null, non-digit, or cannot be normalized to 11 digits.
    """
    if pd.isna(raw_val) or raw_val is None:
        raise ValueError("Encountered null or missing Census Tract GEOID identifier.")
    
    geoid_str = str(raw_val).strip()
    
    # Remove floating point suffix if parsed as float (e.g. "4013113900.0")
    if geoid_str.endswith(".0"):
        geoid_str = geoid_str[:-2]
        
    # Restore Arizona leading zero if stripped (10 digits starting with '4')
    if len(geoid_str) == 10 and geoid_str.startswith("4"):
        geoid_str = "0" + geoid_str
        
    if not geoid_str.isdigit():
        raise ValueError(f"Invalid non-digit Census Tract GEOID identifier: '{geoid_str}'.")
        
    if len(geoid_str) != 11:
        raise ValueError(
            f"Invalid Census Tract GEOID length ({len(geoid_str)} chars): '{geoid_str}'. "
            "U.S. Census Tract GEOIDs must be exactly 11 FIPS characters."
        )
        
    return geoid_str


def classify_risk_status(risk_score: float) -> str:
    """
    Maps a numeric final_risk_score (0-100) to the frontend status enum.
    Matches vulnerability.py risk bands exactly:
      0.00 – 24.99   = 'low'
      25.00 – 49.99  = 'moderate'
      50.00 – 74.99  = 'high'
      75.00 – 100.00 = 'critical'

    Returns lowercase to match PriorityZoneModel.status type.
    """
    if risk_score >= 75.0:
        return "critical"
    elif risk_score >= 50.0:
        return "high"
    elif risk_score >= 25.0:
        return "moderate"
    else:
        return "low"


def generate_tract_zone_metrics(
    tiles_csv_path: Optional[str] = None,
    output_dir: Optional[str] = None
) -> pd.DataFrame:
    """
    Aggregates tile-level data into Census Tract level metrics.

    Tract-Level Aggregation Logic:
      - Primary Unit: 11-character Census Tract GEOID (e.g., '04013113900')
      - riskScore: Mean of final_risk_score across all thermal tiles in the tract
      - avgTemperature: Mean of temperature (°C) across all thermal tiles in the tract
      - total_population: Verified tract-level population (validated constant per GEOID)
      - affectedPopulation: Single verified tract total_population associated with tract geometry
                            (NOTE: Documented as population residing in tract, NOT medical heat cases)
      - status: Classified from tract riskScore using standard risk bands

    Returns
    -------
    pd.DataFrame
        Tract-level metrics DataFrame (one row per unique GEOID).
    """
    # Resolve paths
    project_root = Path(__file__).parent.parent
    if tiles_csv_path is None:
        tiles_csv_path = project_root / "data" / "processed" / "phoenix_risk_scored_tiles.csv"
    else:
        tiles_csv_path = Path(tiles_csv_path)

    if output_dir is None:
        output_dir = project_root / "data" / "processed"
    else:
        output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    if not tiles_csv_path.exists():
        raise FileNotFoundError(f"Input tile dataset not found at {tiles_csv_path}")

    # Load tile-level data with explicit string parsing for geoid
    logger.info(f"Loading tile-level data from {tiles_csv_path}...")
    df = pd.read_csv(tiles_csv_path, dtype={"geoid": str})
    total_tile_rows = len(df)
    
    if "geoid" not in df.columns:
        raise KeyError("Required geographic identifier column 'geoid' missing from input dataset.")

    # Normalize and validate all GEOIDs as 11-character string identifiers
    df["geoid"] = df["geoid"].apply(normalize_and_validate_geoid)

    # Filter out missing GEOIDs
    valid_df = df[df["geoid"].notna() & (df["geoid"] != "")].copy()
    valid_geoid_count = valid_df["geoid"].nunique()
    logger.info(f"Loaded {total_tile_rows} tiles across {valid_geoid_count} unique 11-character Census Tract GEOIDs.")

    # Check temperature column name ('temperature' or 'average_temperature')
    temp_col = "temperature" if "temperature" in valid_df.columns else "average_temperature"

    tract_records = []

    # Group strictly by Census Tract GEOID
    grouped = valid_df.groupby("geoid")

    for geoid_str, group in grouped:
        # Final validation of GEOID string length and format
        if len(geoid_str) != 11 or not geoid_str.isdigit():
            raise ValueError(f"Malformed Census Tract GEOID encountered after grouping: '{geoid_str}'")

        # 1. Demographic & Population Validation
        if "total_population" in group.columns:
            pop_uniques = group["total_population"].dropna().unique()
            if len(pop_uniques) > 1:
                raise ValueError(
                    f"Conflicting total_population values found inside Census Tract GEOID {geoid_str}: {pop_uniques}. "
                    "Demographic attributes must be constant within a GEOID."
                )
            tract_pop = int(pop_uniques[0]) if len(pop_uniques) > 0 else 0
        else:
            tract_pop = 0

        # 2. Tract Name formatting (preserve human-readable census_tract label if present)
        if "census_tract" in group.columns and pd.notna(group["census_tract"].iloc[0]):
            raw_name = str(group["census_tract"].iloc[0]).strip()
            name_str = raw_name if raw_name.startswith("Census Tract") else f"Census Tract {raw_name}"
        else:
            name_str = f"Census Tract {geoid_str}"

        # 3. Aggregated Heat & Risk Metrics
        tract_risk_score = round(float(group["final_risk_score"].mean()), 2)
        tract_avg_temp = round(float(group[temp_col].mean()), 2)
        tract_status = classify_risk_status(tract_risk_score)

        # 4. Clean Frontend PriorityZoneModel contract record (NO private _ debug fields)
        record = {
            "id": f"tract-{geoid_str}",
            "code": geoid_str,
            "name": name_str,
            "geoid": geoid_str,
            "riskScore": tract_risk_score,
            "status": tract_status,
            "avgTemperature": tract_avg_temp,
            "affectedPopulation": tract_pop,
        }

        tract_records.append(record)

    # Sort by riskScore descending (highest risk tract first)
    tract_records.sort(key=lambda r: r["riskScore"], reverse=True)

    # Verify duplicate GEOIDs do not exist in output
    output_geoids = [r["geoid"] for r in tract_records]
    if len(output_geoids) != len(set(output_geoids)):
        raise ValueError("Duplicate GEOIDs detected in tract-level output records.")

    # ---- Export JSON ----
    json_path = output_dir / "phoenix_tract_risk.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(tract_records, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(tract_records)} clean Census Tract records to {json_path}")

    # ---- Export CSV ----
    csv_df = pd.DataFrame(tract_records)
    csv_path = output_dir / "phoenix_tract_risk.csv"
    csv_df.to_csv(csv_path, index=False)
    logger.info(f"Saved {len(csv_df)} clean Census Tract records to {csv_path}")

    # ---- Validation Report ----
    print("\n" + "=" * 80)
    print("CENSUS TRACT AGGREGATION VALIDATION REPORT")
    print("=" * 80)
    print(f"Tile input rows:            {total_tile_rows}")
    print(f"Unique GEOIDs in data:      {valid_geoid_count}")
    print(f"Tract records output:       {len(tract_records)}")
    print(f"Confirm (Output == GEOIDs): {len(tract_records) == valid_geoid_count}")
    print(f"Confirm (All GEOIDs 11-ch): {all(len(r['geoid']) == 11 for r in tract_records)}")
    print()
    print("Risk Status Distribution:")
    status_counts = pd.Series([r["status"] for r in tract_records]).value_counts().to_dict()
    for s_name in ["critical", "high", "moderate", "low"]:
        print(f"  - {s_name.capitalize():<10}: {status_counts.get(s_name, 0)} tracts")

    print()
    print("Temperature & Risk Score Summaries:")
    temps = [r["avgTemperature"] for r in tract_records]
    risks = [r["riskScore"] for r in tract_records]
    print(f"  - avgTemperature range: {min(temps):.2f}°C to {max(temps):.2f}°C (Mean: {np.mean(temps):.2f}°C)")
    print(f"  - riskScore range:      {min(risks):.2f} to {max(risks):.2f} (Mean: {np.mean(risks):.2f})")

    # Population comparison
    wrong_pop = int(df["total_population"].sum()) if "total_population" in df.columns else 0
    correct_pop = sum(r["affectedPopulation"] for r in tract_records)
    print()
    print("Population Aggregations:")
    print(f"  - WRONG (Summed across all 48,199 tiles):               {wrong_pop:,}")
    print(f"  - CORRECT (Deduplicated sum for 230 represented tracts): {correct_pop:,}")
    print("  * Description: sum of Census populations for tracts represented/intersected by the current heat study area.")
    print("=" * 80)

    return csv_df


def generate_zone_metrics(
    tiles_csv_path: Optional[str] = None,
    output_dir: Optional[str] = None
) -> pd.DataFrame:
    """Wrapper function preserving backward compatibility for pipeline callers."""
    return generate_tract_zone_metrics(tiles_csv_path=tiles_csv_path, output_dir=output_dir)


if __name__ == "__main__":
    generate_tract_zone_metrics()


