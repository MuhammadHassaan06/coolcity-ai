# CoolCity AI - Track 7 Data Dictionary & Schema Documentation

## 1. Overview & Methodology Scope

This data dictionary details the schemas for all raw and derived datasets produced by the Track 7 Analytics Pipeline for Phoenix, Arizona.

### Key Operational Parameters
- **Geographic Coverage**: Complete City of Phoenix, Arizona (Full-city snapshot inside official municipal boundary).
- **Snapshot Date & Time**: 2024-07-15 at 14:00 (100% complete FortyGuard 23-chunk batch collection).
- **Raw FortyGuard Thermal Features**: 221,420 high-resolution thermal tiles (~100m resolution).
- **Phoenix Boundary Filtered Features**: 121,892 thermal tiles strictly inside the official Phoenix municipal boundary (99,528 edge features outside city limits excluded).
- **Statistical Unit**: U.S. Census Tract (`geoid` preserved as an 11-character FIPS string, e.g. `'04013113900'`).
- **Represented Phoenix Census Tracts**: 359 Census Tracts.
- **Represented Tract Population**: 1,542,520 (sum of Census populations for Phoenix-intersecting represented tracts).
- **Data Sources**:
  - **FortyGuard tOS Enterprise API (`/v1/heatmap`)**: Real surface & ambient thermal snapshot across full-city Phoenix.
  - **U.S. Census Bureau ACS 5-Year Data via TIGERweb & CDC SVI**: Real socioeconomic indicators and Census Tract polygon boundaries for Maricopa County, Arizona (State FIPS `04`, County FIPS `013`).

---

## 2. Canonical Compact Handoff Artifacts (Frontend Integration)

The canonical machine-readable outputs in `data/processed/` (and synced to `web/src/data/track7/`) are:

1. `phoenix_tract_risk.json` / `phoenix_tract_risk.csv`: Tract-level heat risk handoff (N = 359).
2. `correlation_summary.json`: Tract-level Pearson and Spearman correlation results.
3. `sensitivity_summary.json`: Weighting sensitivity analysis across 3 prototype scenarios.
4. `track7_summary.json`: Master Track 7 pipeline metadata and execution state summary.

*Note: Legacy synthetic coordinate zone files (`processed_zone_metrics.*`) are deprecated and removed.*

---

## 3. Census-Tract Risk Handoff Schema (`phoenix_tract_risk.json`)

Primary contract for frontend Priority Zone mapping (`PriorityZoneModel` in `web/src/types/dashboard.ts`):

| Field Name | Type | Scale / Range | Description |
|:---|:---:|:---:|:---|
| `id` | `string` | `"tract-04013114900"` | Unique tract string identifier (prefixed with `tract-`) |
| `code` | `string` | `"04013114900"` | 11-character Census Tract GEOID code |
| `name` | `string` | `"Census Tract 1149"` | Human-readable Census Tract name |
| `geoid` | `string` | `"04013114900"` | Verified 11-character U.S. Census Tract GEOID string |
| `riskScore` | `number` | `0.00` – `100.00` | Prototype composite heat risk score (Observed: `10.48` – `73.15`) |
| `status` | `string` | `"low"`, `"moderate"`, `"high"`, `"critical"` | Prototype equal-width risk band |
| `avgTemperature` | `number` | °C (Observed: `37.51` – `40.06`) | Mean thermal reading across tiles intersecting this tract |
| `affectedPopulation` | `number` | Integer count | Verified Census tract population for tracts represented/intersected by heat study area |

### Population Field Semantics
- `affectedPopulation` contains the **verified Census tract population** for tracts intersected by the Phoenix municipal boundary.
- It is **NOT** a tile-multiplied population count, heat-stroke count, or pixel-only count.

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

- **Statistical Unit**: Census Tract ($N = 359$).
- **Pseudoreplication Correction**: Tile-level correlation ($N = 221,420$) was superseded because assigning constant tract demographics to thousands of sub-tiles artificially inflates sample size and drives $p$-values down to unearned extremes.
- **Methods**: Pearson $r$ (linear) and Spearman $\rho$ (rank-order).
- **Interpretation**: Exploratory spatial association across geographic units. No causal claim is made, and spatial autocorrelation may remain.

---

## 6. Historical Baseline & Persistence Status

1. **Historical Baseline**: Default 39.5°C anomaly computation is **disabled** because repository evidence currently lacks a verified NOAA/NWS Period of Record baseline dataset. Anomaly fields are excluded until an externally verified baseline is supplied.
2. **Persistence Data**: `hours_above_threshold` and `persistence_score` are explicitly marked `null` / unavailable for single snapshot datasets.
