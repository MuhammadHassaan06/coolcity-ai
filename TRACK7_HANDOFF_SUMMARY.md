# Track 7 — Heat Analytics & Statistical Correlation Handoff Summary
**Project:** CoolCity AI (Phoenix, Arizona)
**Track:** Track 7 (Data Analysis & Correlation) & Track 6 Integration
**Lead:** Member 2 (Data Science)
**Target Roles:** Member 1 (AI Agent / Orchestration) & Member 3 (Dashboard / Frontend)
**Status:** ✅ Completed & Validated with Full-City Ingestion Data & Official Phoenix Boundary Filtering

---

## 1. Executive Summary & Geographic Scope

- **Study Scope**: Complete City of Phoenix, Arizona (Full-city snapshot covering 221,420 FortyGuard thermal tiles; 121,892 retained strictly inside official Phoenix municipal boundary across 359 U.S. Census Tracts).
- **Snapshot Date & Time**: 2024-07-15 at 14:00 (100% complete FortyGuard 23-chunk batch collection).
- **Statistical Unit**: U.S. Census Tract (`geoid` enforced as an 11-character string, e.g., `'04013114900'`).
- **Data Ingestion**:
  - **FortyGuard Thermal Ingestion**: High-resolution thermal snapshot from FortyGuard tOS Enterprise API (`/v1/heatmap`) covering 221,420 raw spatial tiles (100m resolution).
  - **Spatial Boundary Filter**: Tiles clipped against `web/public/data/phoenix-city-boundary.geojson`. 121,892 features inside Phoenix; 99,528 edge features outside Phoenix excluded.
  - **U.S. Census Bureau ACS 5-Year Demographics**: Real Census Tract boundaries from Census TIGERweb (State FIPS `04`, County FIPS `013`) and official ACS 5-Year socioeconomic indicators across 359 intersected Census Tracts.
- **Composite Risk Formulation (Prototype Heuristic Weighting)**:
  $$\text{Final Risk Score} = (\text{Intensity Score} \times 0.50) + (\text{Vulnerability Score} \times 0.50)$$

---

## 2. Full-City Census-Tract Correlation Matrix (SciPy Engine)

Statistical unit: **Census Tract ($N = 359$)**.

| Demographic Variable | Field Name | Tract $N$ | Pearson $r$ | Pearson $p$-value | Spearman $\rho$ | Spearman $p$-value | Statistically Significant ($p < 0.05$) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Minority Rate** | `minority_rate` | 359 | **+0.5425** | $7.31 \times 10^{-29}$ | **+0.5335** | $8.40 \times 10^{-28}$ | ✅ **True** |
| **Poverty Rate** | `poverty_rate` | 359 | **+0.4738** | $1.75 \times 10^{-21}$ | **+0.5700** | $2.54 \times 10^{-32}$ | ✅ **True** |
| **No-Vehicle Rate** | `no_vehicle_rate` | 359 | **+0.3541** | $4.80 \times 10^{-12}$ | **+0.4134** | $2.96 \times 10^{-16}$ | ✅ **True** |
| **Elderly Rate (65+)** | `elderly_rate` | 359 | **-0.4101** | $5.44 \times 10^{-16}$ | **-0.4016** | $2.38 \times 10^{-15}$ | ✅ **True** |
| **Disability Rate** | `disability_rate` | 359 | **+0.2204** | $2.51 \times 10^{-5}$ | **+0.1746** | $8.95 \times 10^{-4}$ | ✅ **True** |
| **Unemployment Rate**| `unemployment_rate`| 359 | **+0.1975** | $1.66 \times 10^{-4}$ | **+0.1661** | $1.59 \times 10^{-3}$ | ✅ **True** |

---

## 3. Full-City Weighting Sensitivity Analysis (2-Component Model)

Evaluated across 359 Census Tracts:
- **Scenario A (40% Heat / 60% Vulnerability)**: Spearman $\rho = 0.9895$ with baseline B. 52 tracts (14.5%) shifted risk band. 9/10 top hotspot overlap.
- **Scenario B (50% Heat / 50% Vulnerability)**: Current baseline.
- **Scenario C (60% Heat / 40% Vulnerability)**: Spearman $\rho = 0.9880$ with baseline B. 113 tracts (31.5%) shifted risk band. 9/10 top hotspot overlap.

---

## 4. Key Limitations & Disclaimers

1. **Risk Formula Status**: Prototype heuristic weighting for spatial prioritization testing. Not clinically validated, not official City of Phoenix policy, and does not predict medical outcomes.
2. **Risk Bands**: Equal-width prototype categories (Low < 25, Moderate 25-49.99, High 50-74.99, Critical >= 75), not epidemiological thresholds.
3. **Population Metric**: `affectedPopulation` (1,542,520 deduplicated across 359 represented tracts) represents total Census population residing within intersected tract boundaries.
4. **Historical Baseline**: Default 39.5°C anomaly calculation disabled due to lack of a verified NOAA/NWS source dataset in repository evidence.
5. **Persistence Data**: Marked unavailable (`null`) for single snapshot dataset.

---

## 5. Canonical Handoff Deliverables

The processed data artifacts are saved under `data/processed/` and synced to `web/src/data/track7/`:

1. **`phoenix_tract_risk.json`** (359 compact Census Tract records, primary frontend handoff)
2. **`phoenix_tract_risk.csv`** (359 compact Census Tract records in flat CSV format)
3. **`correlation_summary.json`** (Tract-level Pearson and Spearman correlation results)
4. **`sensitivity_summary.json`** (Machine-readable weighting sensitivity summary)
5. **`track7_summary.json`** (Master Track 7 metadata and pipeline state summary)

---

## 6. How to Run the Pipeline

```bash
# Run the complete full-city Track 7 analytics & validation orchestrator
python analysis/process_full_city_analytics.py

# Sync to web runtime
node web/scripts/sync-track7-data.mjs
```
