# CoolCity AI - Track 7 Data Dictionary & Schema Documentation

## 1. Overview & Methodology Scope

This data dictionary details the schemas for all raw and derived datasets produced by the Track 7 Analytics Pipeline for Phoenix, Arizona.

### Key Operational Parameters
- **Geographic Coverage**: Central Phoenix Heat Island Corridor (Partial study area). Full-city data coverage is pending Member 1 API expansion.
- **Statistical Unit**: U.S. Census Tract (`geoid` preserved as an 11-character FIPS string, e.g. `'04013116500'`).
- **Data Sources**:
  - **FortyGuard tOS Enterprise API (`/v1/heatmap`)**: Real surface/ambient thermal readings at 100m spatial resolution across the central Phoenix AOI.
  - **U.S. Census Bureau ACS 5-Year Data via TIGERweb & CDC SVI**: Real socioeconomic indicators and Census Tract polygon boundaries for Maricopa County, Arizona (State FIPS `04`, County FIPS `013`).

---

## 2. Canonical Compact Handoff Artifacts (Frontend Integration)

The canonical machine-readable outputs in `data/processed/` are:

1. `phoenix_tract_risk.json` / `phoenix_tract_risk.csv`: Tract-level heat risk handoff (N = 230).
2. `correlation_summary.json`: Tract-level Pearson and Spearman correlation results.
3. `sensitivity_summary.json`: Weighting sensitivity analysis across 3 prototype scenarios.
4. `track7_summary.json`: Master Track 7 pipeline metadata and execution state summary.

*Note: Legacy synthetic coordinate zone files (`processed_zone_metrics.*`) are deprecated and removed.*

---

## 3. Census-Tract Risk Handoff Schema (`phoenix_tract_risk.json`)

Primary contract for frontend Priority Zone mapping (`PriorityZoneModel` in `web/src/types/dashboard.ts`):

| Field Name | Type | Scale / Range | Description |
|:---|:---:|:---:|:---|
| `id` | `string` | `"tract-04013113900"` | Unique tract string identifier (prefixed with `tract-`) |
| `code` | `string` | `"04013113900"` | 11-character Census Tract GEOID code |
| `name` | `string` | `"Census Tract 1139"` | Human-readable Census Tract name |
| `geoid` | `string` | `"04013113900"` | Verified 11-character U.S. Census Tract GEOID string |
| `riskScore` | `number` | `0.00` – `100.00` | Prototype composite heat risk score |
| `status` | `string` | `"low"`, `"moderate"`, `"high"`, `"critical"` | Prototype equal-width risk band |
| `avgTemperature` | `number` | °C (Observed: `35.35` – `36.66`) | Mean thermal reading across tiles intersecting this tract |
| `affectedPopulation` | `number` | Integer count | Verified Census tract population for tracts represented/intersected by heat study area |

### Population Field Caveat
- `affectedPopulation` is maintained as a frontend compatibility name.
- It contains the **verified Census tract population** for tracts intersected by the study area.
- It is **NOT** a clinical count of heat-stroke patients, medically affected individuals, or pixel-only residential counts.

---

## 4. Risk Model & Band Disclaimers

### Prototype Heuristic Weighting
When persistence data is unavailable (single snapshot dataset):
$$\text{final\_risk\_score} = 0.50 \times \text{intensity\_score} + 0.50 \times \text{vulnerability\_score}$$

### Non-Clinical & Non-Policy Disclaimer
- The 50/50 weighting represents a **prototype heuristic model** for testing spatial prioritization workflows.
- Weights are **NOT clinically validated** or epidemiologically derived.
- Risk scores do **NOT represent official City of Phoenix policy** or predicted medical outcomes.

### Prototype Equal-Width Risk Bands
Risk level classification uses equal-width mathematical tiers (NOT clinical/epidemiological thresholds):
- **Low**: $0.00 \le \text{score} < 25.00$
- **Moderate**: $25.00 \le \text{score} < 50.00$
- **High**: $50.00 \le \text{score} < 75.00$
- **Critical**: $75.00 \le \text{score} \le 100.00$

---

## 5. Statistical Correlation Methodology

- **Statistical Unit**: Census Tract ($N = 230$).
- **Pseudoreplication Correction**: Tile-level correlation ($N = 48,199$) was superseded because assigning constant tract demographics to thousands of sub-tiles artificially inflates sample size and drives $p$-values down to unearned extremes.
- **Methods**: Pearson $r$ (linear) and Spearman $\rho$ (rank-order).
- **Interpretation**: Exploratory spatial association across geographic units. No causal claim is made, and spatial autocorrelation may remain.

---

## 6. Historical Baseline & Persistence Status

1. **Historical Baseline**: Default 39.5°C anomaly computation is **disabled** because repository evidence currently lacks a verified NOAA/NWS Period of Record baseline dataset. Anomaly fields are excluded until an externally verified baseline is supplied.
2. **Persistence Data**: `hours_above_threshold` and `persistence_score` are explicitly marked `null` / unavailable for single snapshot datasets.

---

## 7. Tile-Level Scored Tile Schema (`phoenix_risk_scored_tiles.csv` - Local Ignored Data)

| Field Name | Type | Units | Description |
|:---|:---:|:---:|:---|
| `tile_id` | `string` | ID | Unique FortyGuard thermal tile ID (`FG-PHX-00000`) |
| `latitude` | `float` | °N | Centroid latitude (WGS84) |
| `longitude` | `float` | °W | Centroid longitude (WGS84) |
| `temperature` | `float` | °C | Thermal reading in Celsius |
| `temperature_f` | `float` | °F | Thermal reading in Fahrenheit |
| `geoid` | `string` | 11-char | Verified Census Tract GEOID (State 04, County 013) |
| `census_tract` | `string` | Name | Human-readable Census Tract label |
| `poverty_rate` | `float` | Fraction | Tract poverty rate (0.0 - 1.0) |
| `elderly_rate` | `float` | Fraction | Tract elderly rate 65+ (0.0 - 1.0) |
| `no_vehicle_rate` | `float` | Fraction | Tract zero-vehicle household rate (0.0 - 1.0) |
| `unemployment_rate` | `float` | Fraction | Tract unemployment rate (0.0 - 1.0) |
| `disability_rate` | `float` | Fraction | Tract disability rate (0.0 - 1.0) |
| `minority_rate` | `float` | Fraction | Tract minority rate (0.0 - 1.0) |
| `total_population` | `float` | Count | Tract total population |
| `intensity_score` | `float` | 0–100 | Min-max normalized heat exposure score |
| `vulnerability_score` | `float` | 0–100 | Composite socioeconomic vulnerability index |
| `final_risk_score` | `float` | 0–100 | Prototype composite heat risk score |
| `risk_level` | `string` | Text | Categorical risk band (Low/Moderate/High/Critical) |
