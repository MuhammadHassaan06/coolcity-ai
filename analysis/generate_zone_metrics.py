"""
CoolCity AI - Track 7 Zone-Level Metrics Aggregation
=====================================================
Aggregates tile-level real data (48,199 FortyGuard tiles + Census demographics)
into district-level zone metrics compatible with the frontend PriorityZoneModel
contract defined in web/src/types/dashboard.ts.

Reads:
  - data/processed/phoenix_risk_scored_tiles.csv  (tile-level pipeline output)

Outputs:
  - data/processed/processed_zone_metrics.json
  - data/processed/processed_zone_metrics.csv

These files are the Track 7 handoff artifacts for frontend integration.
"""

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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ZoneMetrics")

# Phoenix district-to-zone-code mapping (stable identifiers for frontend)
DISTRICT_ZONE_MAP = {
    "Central City / Downtown Phoenix":      {"code": "PHX-Z01", "zone_id": "z-001"},
    "Midtown / Encanto Village":            {"code": "PHX-Z02", "zone_id": "z-002"},
    "Maryvale West / Encanto":              {"code": "PHX-Z03", "zone_id": "z-003"},
    "Southwest Maryvale / Industrial":      {"code": "PHX-Z04", "zone_id": "z-004"},
    "South Mountain / Laveen":              {"code": "PHX-Z05", "zone_id": "z-005"},
    "Sky Harbor / East Lake":               {"code": "PHX-Z06", "zone_id": "z-006"},
    "Camelback East / Arcadia":             {"code": "PHX-Z07", "zone_id": "z-007"},
    "North Mountain / Sunnyslope":          {"code": "PHX-Z08", "zone_id": "z-008"},
    "Alhambra / Glendale Border":           {"code": "PHX-Z09", "zone_id": "z-009"},
    "Paradise Valley Border / Camelback":   {"code": "PHX-Z10", "zone_id": "z-010"},
}


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


def generate_zone_metrics(
    tiles_csv_path: str = None,
    output_dir: str = None
) -> pd.DataFrame:
    """
    Aggregates tile-level data into zone-level metrics.

    Zone-Level Aggregation Logic:
      - riskScore: Mean of final_risk_score across all tiles in the zone
      - avgTemperature: Mean of temperature (°C) across all tiles
      - affectedPopulation: Sum of unique Census Tract total_population values
                            (de-duplicated by geoid to avoid double-counting)
      - status: Classified from the zone-level riskScore using standard risk bands
      - Additional derived metrics for analytics (not exposed to frontend)

    Returns
    -------
    pd.DataFrame
        Zone-level metrics DataFrame.
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

    # Load tile-level data
    logger.info(f"Loading tile-level data from {tiles_csv_path}...")
    df = pd.read_csv(tiles_csv_path)
    logger.info(f"Loaded {len(df)} tiles across {df['district'].nunique()} districts.")

    zones = []

    for district_name, zone_info in DISTRICT_ZONE_MAP.items():
        district_tiles = df[df["district"] == district_name]

        if district_tiles.empty:
            logger.warning(f"No tiles found for district '{district_name}'. Skipping.")
            continue

        # De-duplicate population by Census Tract GEOID to avoid counting
        # the same tract population multiple times across tiles
        unique_tracts = district_tiles.drop_duplicates(subset=["geoid"])
        affected_pop = int(unique_tracts["total_population"].sum())

        # Zone-level aggregated risk score (mean of tile-level final_risk_score)
        zone_risk_score = round(float(district_tiles["final_risk_score"].mean()), 2)

        # Zone-level average temperature in Celsius
        zone_avg_temp = round(float(district_tiles["temperature"].mean()), 2)

        # Risk status classification
        zone_status = classify_risk_status(zone_risk_score)

        # ---- Frontend PriorityZoneModel fields ----
        zone_record = {
            # PriorityZoneModel contract fields
            "id": zone_info["zone_id"],
            "code": zone_info["code"],
            "name": district_name,
            "riskScore": zone_risk_score,
            "affectedPopulation": affected_pop,
            "avgTemperature": zone_avg_temp,
            "status": zone_status,

            # ---- Additional Track 7 analytics fields (for reference/debugging) ----
            # These are NOT in the current frontend contract.
            # They are included for analytics transparency and future contract extension.
            "_tileCount": int(len(district_tiles)),
            "_uniqueCensusTracts": int(district_tiles["geoid"].nunique()),
            "_avgVulnerabilityScore": round(float(district_tiles["vulnerability_score"].mean()), 2),
            "_avgIntensityScore": round(float(district_tiles["intensity_score"].mean()), 2),
            "_avgTemperatureF": round(float(district_tiles["temperature_f"].mean()), 2),
            "_avgTempAnomalyC": round(float(district_tiles["temp_anomaly_c"].mean()), 2),
            "_avgPovertyRate": round(float(district_tiles["poverty_rate"].mean()), 4),
            "_avgElderlyRate": round(float(district_tiles["elderly_rate"].mean()), 4),
            "_avgNoVehicleRate": round(float(district_tiles["no_vehicle_rate"].mean()), 4),
            "_riskBandDistribution": {
                "critical": int((district_tiles["risk_level"] == "Critical").sum()),
                "high": int((district_tiles["risk_level"] == "High").sum()),
                "moderate": int((district_tiles["risk_level"] == "Moderate").sum()),
                "low": int((district_tiles["risk_level"] == "Low").sum()),
            },
        }

        zones.append(zone_record)

    # Sort zones by riskScore descending (highest risk first)
    zones.sort(key=lambda z: z["riskScore"], reverse=True)

    # ---- Export JSON ----
    json_path = output_dir / "processed_zone_metrics.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(zones, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(zones)} zone records to {json_path}")

    # ---- Export CSV ----
    # For CSV, flatten the _riskBandDistribution dict into separate columns
    csv_records = []
    for z in zones:
        flat = {k: v for k, v in z.items() if k != "_riskBandDistribution"}
        rbd = z.get("_riskBandDistribution", {})
        flat["_riskBand_critical"] = rbd.get("critical", 0)
        flat["_riskBand_high"] = rbd.get("high", 0)
        flat["_riskBand_moderate"] = rbd.get("moderate", 0)
        flat["_riskBand_low"] = rbd.get("low", 0)
        csv_records.append(flat)

    csv_df = pd.DataFrame(csv_records)
    csv_path = output_dir / "processed_zone_metrics.csv"
    csv_df.to_csv(csv_path, index=False)
    logger.info(f"Saved {len(csv_df)} zone records to {csv_path}")

    # ---- Print Summary ----
    print("\n" + "=" * 80)
    print("PROCESSED ZONE METRICS SUMMARY")
    print("=" * 80)
    print(f"Total zones: {len(zones)}")
    print(f"Source tiles: {len(df)}")
    print()

    # Frontend-facing fields only
    frontend_cols = ["id", "code", "name", "riskScore", "affectedPopulation", "avgTemperature", "status"]
    summary_df = pd.DataFrame([{k: z[k] for k in frontend_cols} for z in zones])
    print(summary_df.to_string(index=False))
    print()

    # DashboardSummary helper values
    total_zones = len(zones)
    critical_zones = sum(1 for z in zones if z["status"] == "critical")
    avg_city_temp = round(float(df["temperature"].mean()), 2)
    overall_risk = classify_risk_status(float(df["final_risk_score"].mean()))
    print("DashboardSummary derived values:")
    print(f"  totalZonesMonitored: {total_zones}")
    print(f"  criticalZones: {critical_zones}")
    print(f"  averageCityTemp: {avg_city_temp} deg C")
    print(f"  overallRiskLevel: {overall_risk}")
    print("=" * 80)

    return pd.DataFrame(zones)


if __name__ == "__main__":
    generate_zone_metrics()
