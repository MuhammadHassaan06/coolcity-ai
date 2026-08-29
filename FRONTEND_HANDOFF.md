# Track 7 → Frontend Handoff Document
**From:** Member 2 (Data Analytics / Track 7)
**To:** Member 1 (Frontend / AI Agent)
**Date:** 2026-08-29
**Branch:** `feat/heat-analytics`
**Status:** ✅ Stable & Complete (230 Census Tracts, 11-character GEOIDs, zero synthetic zones)

---

## 1. Canonical Processed Handoff Artifacts

### Core Handoff Files (in `data/processed/`)

| File | Records | Format | Primary Use Case |
|:---|:---:|:---|:---|
| `phoenix_tract_risk.json` | 230 | Array of JSON objects (~57 KB) | **Canonical Frontend Dashboard Priority Zone Input** |
| `phoenix_tract_risk.csv` | 230 | Flat CSV (~20 KB) | Tabular analytics inspection & export |
| `correlation_summary.json` | 12 | JSON summary (~2.5 KB) | Machine-readable tract-level statistical correlations |
| `sensitivity_summary.json` | 3 scenarios | JSON summary (~1.8 KB) | Weighting sensitivity & ranking stability report |
| `track7_summary.json` | Metadata | JSON summary (~1.0 KB) | Track 7 master pipeline status & coverage metadata |

*Note: Legacy synthetic coordinate zone files (`processed_zone_metrics.*`) are deleted and deprecated.*

### Canonical JSON Handoff Contract (`phoenix_tract_risk.json`)

Matches `PriorityZoneModel` in `web/src/types/dashboard.ts`:

```json
[
  {
    "id": "tract-04013113900",
    "code": "04013113900",
    "name": "Census Tract 1139",
    "geoid": "04013113900",
    "riskScore": 72.38,
    "status": "high",
    "avgTemperature": 36.39,
    "affectedPopulation": 1532
  },
  {
    "id": "tract-04013092311",
    "code": "04013092311",
    "name": "Census Tract 923.11",
    "geoid": "04013092311",
    "riskScore": 70.13,
    "status": "high",
    "avgTemperature": 36.63,
    "affectedPopulation": 2750
  }
]
```


---

## 2. Exact Column / Field Names

All 31 fields in the processed dataset:

| # | Field Name | Type |
|:---:|:---|:---:|
| 1 | `tile_id` | `string` |
| 2 | `average_temperature` | `float` |
| 3 | `min_temperature` | `float` |
| 4 | `max_temperature` | `float` |
| 5 | `latitude` | `float` |
| 6 | `longitude` | `float` |
| 7 | `temperature` | `float` |
| 8 | `temperature_f` | `float` |
| 9 | `district` | `string` |
| 10 | `geoid` | `string` |
| 11 | `census_tract` | `string` |
| 12 | `poverty_rate` | `float` |
| 13 | `elderly_rate` | `float` |
| 14 | `no_vehicle_rate` | `float` |
| 15 | `unemployment_rate` | `float` |
| 16 | `disability_rate` | `float` |
| 17 | `minority_rate` | `float` |
| 18 | `total_population` | `float` |
| 19 | `baseline_temp_c` | `float` |
| 20 | `baseline_temp_f` | `float` |
| 21 | `temp_anomaly_c` | `float` |
| 22 | `temp_anomaly_f` | `float` |
| 23 | `intensity_score` | `float` |
| 24 | `hours_above_threshold` | `null` |
| 25 | `persistence_score` | `null` |
| 26 | `poverty_rate_norm` | `float` |
| 27 | `elderly_rate_norm` | `float` |
| 28 | `no_vehicle_rate_norm` | `float` |
| 29 | `vulnerability_score` | `float` |
| 30 | `final_risk_score` | `float` |
| 31 | `risk_level` | `string` |

---

## 3. Har Numeric Field Ki Unit Ya Scale

| Field | Unit | Scale / Range |
|:---|:---|:---|
| `average_temperature` | Celsius (°C) | 34.70 – 36.70 |
| `min_temperature` | Celsius (°C) | 28.42 – 35.70 |
| `max_temperature` | Celsius (°C) | 39.53 – 40.79 |
| `temperature` | Celsius (°C) | 34.70 – 36.70 (alias for `average_temperature`) |
| `temperature_f` | Fahrenheit (°F) | 94.46 – 98.06 |
| `latitude` | Decimal Degrees (°N) | 33.3796 – 33.5605 |
| `longitude` | Decimal Degrees (°W) | -112.2205 – -111.9595 |
| `poverty_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.009 – 0.734) |
| `elderly_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.017 – 0.401) |
| `no_vehicle_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.000 – 0.492) |
| `unemployment_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.000 – 0.231) |
| `disability_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.016 – 0.301) |
| `minority_rate` | Rate fraction | 0.0 – 1.0 (observed: 0.065 – 0.988) |
| `total_population` | Integer count | 0 – 10,482 |
| `baseline_temp_c` | Celsius (°C) | 39.50 (constant — Phoenix summer climatological normal) |
| `baseline_temp_f` | Fahrenheit (°F) | 103.10 (constant) |
| `temp_anomaly_c` | Celsius (°C) | -4.80 – -2.80 |
| `temp_anomaly_f` | Fahrenheit (°F) | -8.64 – -5.04 |
| `intensity_score` | Score | 0.00 – 100.00 (min-max normalized) |
| `poverty_rate_norm` | Normalized | 0.0 – 1.0 (min-max normalized) |
| `elderly_rate_norm` | Normalized | 0.0 – 1.0 (min-max normalized) |
| `no_vehicle_rate_norm` | Normalized | 0.0 – 1.0 (min-max normalized) |
| `vulnerability_score` | Score | 0.00 – 100.00 (observed: 6.23 – 61.15) |
| `final_risk_score` | Score | 0.00 – 100.00 (observed: 6.79 – 78.19) |
| `hours_above_threshold` | Hours | Currently `null` (unavailable from single daily snapshot) |
| `persistence_score` | Score | Currently `null` (unavailable from single daily snapshot) |

> **Note for frontend:** All demographic rates are **fractions (0.0 – 1.0)**, NOT percentages. Multiply by 100 if you want to display as "44.4%".

---

## 4. Final Risk-Score Range

| Metric | Value |
|:---|:---|
| **Theoretical Scale** | `0.00` – `100.00` |
| **Observed Minimum** | `6.79` |
| **Observed Maximum** | `78.19` |
| **Observed Mean** | `45.92` |
| **Formula** | `(intensity_score × 0.50) + (vulnerability_score × 0.50)` |

---

## 5. Risk-Band Definitions

| Score Range | Risk Band | `risk_level` Value | Color Code | Tile Count | % of Total |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0.00 – 24.99** | Low | `"Low"` | 🟢 Green | 792 | 1.6% |
| **25.00 – 49.99** | Moderate | `"Moderate"` | 🟡 Yellow | 27,845 | 57.8% |
| **50.00 – 74.99** | High | `"High"` | 🟠 Orange | 19,475 | 40.4% |
| **75.00 – 100.00** | Critical | `"Critical"` | 🔴 Red | 87 | 0.2% |

> **Frontend implementation:** The `risk_level` field is already a string (`"Low"`, `"Moderate"`, `"High"`, `"Critical"`). You can directly map these to your UI colors.

---

## 6. Correlation Method Used

| Aspect | Detail |
|:---|:---|
| **Library** | SciPy (`scipy.stats`) |
| **Methods** | **Pearson r** (linear correlation) + **Spearman ρ** (rank-order correlation) |
| **Significance Threshold** | p < 0.05 |
| **Heat Variable Correlated** | `intensity_score` (min-max normalized heat exposure) |
| **Demographic Variables** | `poverty_rate`, `elderly_rate`, `no_vehicle_rate`, `unemployment_rate`, `disability_rate`, `minority_rate` |
| **Implementation** | [`analysis/correlation.py`](file:///c:/Users/User/coolcity-ai/analysis/correlation.py) |

---

## 7. Correlation Results

Calculated across **48,199 real Phoenix spatial tiles**:

| Demographic Variable | Field Name | Pearson r | Pearson p-value | Spearman r | Spearman p-value | Significant? |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| Poverty Rate | `poverty_rate` | **-0.1214** | 9.36 × 10⁻¹⁵⁸ | **-0.1386** | 3.01 × 10⁻²⁰⁵ | ✅ Yes |
| No-Vehicle Rate | `no_vehicle_rate` | **+0.1108** | 2.04 × 10⁻¹³¹ | **+0.1510** | 1.33 × 10⁻²⁴³ | ✅ Yes |
| Elderly Rate (65+) | `elderly_rate` | **+0.0525** | 8.36 × 10⁻³¹ | **+0.0871** | 8.13 × 10⁻⁸² | ✅ Yes |
| Unemployment Rate | `unemployment_rate` | **-0.0883** | 2.11 × 10⁻⁸³ | **-0.0757** | 1.07 × 10⁻⁶¹ | ✅ Yes |
| Disability Rate | `disability_rate` | **+0.0267** | 5.54 × 10⁻⁹ | **+0.0492** | 5.04 × 10⁻²⁷ | ✅ Yes |
| Minority Rate | `minority_rate` | **-0.2602** | < 1.0 × 10⁻³⁰⁰ | **-0.3389** | < 1.0 × 10⁻³⁰⁰ | ✅ Yes |

> **All 6 correlations are statistically significant** (p ≪ 0.05). The strongest correlation is between `minority_rate` and heat intensity (Spearman ρ = -0.3389).

---

## 8. Missing-Data Handling

| Scenario | Strategy | Details |
|:---|:---|:---|
| **No synthetic/random data** | Strict policy | `np.random` is never used; all values come from real API/Census sources |
| **Tile-to-tract boundary mismatch** | Spatial nearest-neighbor join | `gpd.sjoin_nearest` on EPSG:3857 projected coords assigns nearest real Census Tract |
| **Unpopulated Census tracts** (e.g., Sky Harbor airport) | Median imputation | Missing socioeconomic vars filled with **median of all valid real Phoenix tracts** |
| **Persistence data unavailable** | Explicit `null` | `hours_above_threshold` and `persistence_score` set to `null` (not 0, not fake). Weights reallocated: 50% intensity + 50% vulnerability |
| **Empty/NaN demographic fields** | `dropna()` before correlation | Correlation engine skips NaN pairs; vulnerability calc treats missing as 0.0 |

> **Frontend note:** Check for `null` values in `hours_above_threshold` and `persistence_score`. These fields will be `null` in the current dataset. Display as "N/A" or hide them from the UI.

---

## 9. Geography / Join Identifier

| Identifier | Field Name | Format | Example | Purpose |
|:---|:---|:---|:---|:---|
| **Tile ID** | `tile_id` | `FG-PHX-XXXXX` | `FG-PHX-00000` | Unique tile identifier (primary key) |
| **Census Tract GEOID** | `geoid` | 11-digit FIPS string | `04013116500` | Join key to U.S. Census data (State 04 = AZ, County 013 = Maricopa) |
| **Census Tract Name** | `census_tract` | Display string | `Census Tract 1165` | Human-readable tract label |
| **District / Neighborhood** | `district` | Display string | `South Mountain / Laveen` | Phoenix neighborhood classification |
| **Latitude** | `latitude` | Decimal degrees (°N) | `33.380007` | WGS84 centroid latitude (EPSG:4326) |
| **Longitude** | `longitude` | Decimal degrees (°W) | `-112.069137` | WGS84 centroid longitude (EPSG:4326) |

> **For map rendering:** Use `latitude` + `longitude` for point markers, or use the GeoJSON file (`phoenix_risk_scored_tiles.geojson`) which has full polygon geometries per tile in EPSG:4326.
>
> **For Census joins:** Use `geoid` (11-digit FIPS code) as the join key.

---

## 10. Raw Data Fields vs Derived Metrics

### 🔵 Raw Fields (directly from APIs/Census)

| Field | Source |
|:---|:---|
| `tile_id` | FortyGuard API (standardized format) |
| `average_temperature` | FortyGuard API `/v1/heatmap` |
| `min_temperature` | FortyGuard API `/v1/heatmap` |
| `max_temperature` | FortyGuard API `/v1/heatmap` |
| `temperature` | FortyGuard API (alias of `average_temperature`) |
| `geoid` | U.S. Census Bureau TIGERweb (spatial join) |
| `census_tract` | U.S. Census Bureau TIGERweb |
| `poverty_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_POV150 / 100`) |
| `elderly_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_AGE65 / 100`) |
| `no_vehicle_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_NOVEH / 100`) |
| `unemployment_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_UNEMP / 100`) |
| `disability_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_DISABL / 100`) |
| `minority_rate` | U.S. Census ACS 5-Yr via CDC SVI (`EP_MINRTY / 100`) |
| `total_population` | U.S. Census ACS 5-Yr via CDC SVI (`E_TOTPOP`) |
| `hours_above_threshold` | FortyGuard API (currently `null`) |

### 🟠 Derived Metrics (calculated by pipeline)

| Field | Formula / Method |
|:---|:---|
| `latitude` | Centroid of tile geometry (EPSG:3857 → 4326) |
| `longitude` | Centroid of tile geometry (EPSG:3857 → 4326) |
| `temperature_f` | `(temperature × 9/5) + 32` |
| `district` | Spatial classification from coordinates |
| `baseline_temp_c` | Phoenix 30-year summer climatological normal = `39.50°C` |
| `baseline_temp_f` | `(39.50 × 9/5) + 32 = 103.10°F` |
| `temp_anomaly_c` | `temperature - baseline_temp_c` |
| `temp_anomaly_f` | `temp_anomaly_c × 9/5` |
| `intensity_score` | `((temp - min_temp) / (max_temp - min_temp)) × 100` |
| `persistence_score` | Currently `null` (requires multi-temporal data) |
| `poverty_rate_norm` | `(poverty_rate - min) / (max - min)` (min-max normalization) |
| `elderly_rate_norm` | `(elderly_rate - min) / (max - min)` |
| `no_vehicle_rate_norm` | `(no_vehicle_rate - min) / (max - min)` |
| `vulnerability_score` | `mean(poverty_norm, elderly_norm, no_vehicle_norm) × 100` |
| `final_risk_score` | `(intensity_score × 0.50) + (vulnerability_score × 0.50)` |
| `risk_level` | Categorical: Low/Moderate/High/Critical based on `final_risk_score` |

---

## Quick Reference for Frontend Integration

```javascript
// Risk level → color mapping
const RISK_COLORS = {
  "Low":      "#22c55e",  // Green
  "Moderate": "#eab308",  // Yellow
  "High":     "#f97316",  // Orange
  "Critical": "#ef4444",  // Red
};

// Score thresholds
const RISK_THRESHOLDS = {
  LOW:      { min: 0,    max: 24.99 },
  MODERATE: { min: 25,   max: 49.99 },
  HIGH:     { min: 50,   max: 74.99 },
  CRITICAL: { min: 75,   max: 100   },
};

// Demographic rates are FRACTIONS (0.0 - 1.0), multiply by 100 for display %
const formatPercent = (rate) => `${(rate * 100).toFixed(1)}%`;

// null check for persistence fields
const formatPersistence = (val) => val === null ? "N/A" : val;
```

---

## File Locations Summary

| What | Path |
|:---|:---|
| Main pipeline script | `analysis/heat_analysis_main.py` |
| Correlation engine | `analysis/correlation.py` |
| Vulnerability/risk engine | `analysis/vulnerability.py` |
| FortyGuard API ingestion | `analysis/fortyguard_ingestion.py` |
| Census data ingestion | `analysis/census_ingestion.py` |
| Data dictionary (full spec) | `analysis/DATA_DICTIONARY.md` |
| CSV output | `data/processed/phoenix_risk_scored_tiles.csv` |
| JSON output | `data/processed/phoenix_risk_scored_tiles.json` |
| GeoJSON output | `data/processed/phoenix_risk_scored_tiles.geojson` |
