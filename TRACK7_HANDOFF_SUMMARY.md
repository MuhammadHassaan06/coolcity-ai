# Track 7 — Heat Analytics & Statistical Correlation Handoff Summary
**Project:** CoolCity AI (Phoenix, Arizona)  
**Track:** Track 7 (Data Analysis & Correlation) & Track 6 Integration  
**Lead:** Member 2 (Data Science)  
**Target Roles:** Member 1 (AI Agent / Orchestration) & Member 3 (Dashboard / Frontend)  
**Status:** ✅ Completed & Validated with Real Ingestion Data & Census-Tract Aggregation

---

## 1. Executive Summary & Geographic Scope

- **Study Scope**: Central Phoenix Heat Island Corridor (Partial study area covering 48,199 FortyGuard thermal tiles across 230 U.S. Census Tracts). Full-city coverage is pending Member 1 API expansion.
- **Statistical Unit**: U.S. Census Tract (`geoid` enforced as an 11-character string, e.g., `'04013113900'`).
- **Data Ingestion**:
  - **FortyGuard Thermal Ingestion**: High-resolution thermal data from FortyGuard tOS Enterprise API (`/v1/heatmap`) covering 48,199 spatial tiles (100m resolution).
  - **U.S. Census Bureau ACS 5-Year Demographics**: Real Census Tract boundaries from Census TIGERweb (State FIPS `04`, County FIPS `013`) and official ACS 5-Year socioeconomic indicators across 230 intersected Census Tracts.
- **Composite Risk Formulation (Prototype Heuristic Weighting)**:
  $$\text{Final Risk Score} = (\text{Intensity Score} \times 0.50) + (\text{Vulnerability Score} \times 0.50)$$
  *(When multi-temporal persistence is unavailable from a single daily snapshot, persistence is marked unavailable and weights are allocated 50/50 across active components, preserving the exact 0–100 scale).*

---

## 2. Corrected Census-Tract Correlation Matrix (SciPy Engine)

Statistical unit: **Census Tract ($N = 230$)**. Tile-level correlation ($N = 48,199$) was superseded to eliminate pseudoreplication and false statistical significance.

| Demographic Variable | Field Name | Tract $N$ | Pearson $r$ | Pearson $p$-value | Spearman $\rho$ | Spearman $p$-value | Statistically Significant ($p < 0.05$) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Minority Rate** | `minority_rate` | 230 | **-0.3437** | $8.90 \times 10^{-8}$ | **-0.4047** | $1.78 \times 10^{-10}$ | ✅ **True** |
| **Elderly Rate (65+)** | `elderly_rate` | 230 | **+0.1336** | $4.30 \times 10^{-2}$ | **+0.1347** | $4.12 \times 10^{-2}$ | ✅ **True** |
| **Poverty Rate** | `poverty_rate` | 230 | **-0.1222** | $6.42 \times 10^{-2}$ | **-0.1505** | $2.25 \times 10^{-2}$ | ❌ **False** ($p \ge 0.05$) |
| **No-Vehicle Rate** | `no_vehicle_rate` | 230 | **+0.0896** | $1.76 \times 10^{-1}$ | **+0.1401** | $3.37 \times 10^{-2}$ | ❌ **False** ($p \ge 0.05$) |
| **Disability Rate** | `disability_rate` | 230 | **+0.0415** | $5.31 \times 10^{-1}$ | **+0.0436** | $5.11 \times 10^{-1}$ | ❌ **False** ($p \ge 0.05$) |
| **Unemployment Rate**| `unemployment_rate`| 230 | **+0.0036** | $9.57 \times 10^{-1}$ | **-0.0144** | $8.28 \times 10^{-1}$ | ❌ **False** ($p \ge 0.05$) |

*Exploratory statistical association across geographic units. No causal claim is made, and spatial autocorrelation may remain.*

---

## 3. Weighting Sensitivity Analysis (2-Component Model)

Evaluated across 230 Census Tracts:
- **Scenario A (40% Heat / 60% Vulnerability)**: Spearman $\rho = 0.9862$ with baseline B. 62 tracts (27.0%) shifted risk band. 9/10 top hotspot overlap.
- **Scenario B (50% Heat / 50% Vulnerability)**: Current baseline.
- **Scenario C (60% Heat / 40% Vulnerability)**: Spearman $\rho = 0.9906$ with baseline B. 26 tracts (11.3%) shifted risk band. 8/10 top hotspot overlap.

*Demonstrates high prioritization stability under reasonable heuristic weight changes.*

---

## 4. Key Limitations & Disclaimers

1. **Risk Formula Status**: Prototype heuristic weighting for spatial prioritization testing. Not clinically validated, not official City of Phoenix policy, and does not predict medical outcomes.
2. **Risk Bands**: Equal-width prototype categories (Low < 25, Moderate 25-49.99, High 50-74.99, Critical >= 75), not epidemiological thresholds.
3. **Population Metric**: `affectedPopulation` (964,706 deduplicated across 230 represented tracts) represents total Census population residing within intersected tract boundaries. Not a count of heat-stroke cases or medically affected individuals.
4. **Historical Baseline**: Default 39.5°C anomaly calculation disabled due to lack of a verified NOAA/NWS source dataset in repository evidence.
5. **Persistence Data**: Marked unavailable (`null`) for single snapshot dataset.
6. **Synthetic Zones Deprecated**: Legacy coordinate-based zone boxes (e.g. `PHX-Z01`) are deprecated in favor of official 11-character Census Tract GEOIDs.

---

## 5. Canonical Frontend Handoff Deliverables

The processed data artifacts are saved under `data/processed/`:

1. **`data/processed/phoenix_tract_risk.json`** (230 compact Census Tract records, primary frontend handoff)
2. **`data/processed/phoenix_tract_risk.csv`** (230 compact Census Tract records in flat CSV format)
3. **`data/processed/correlation_summary.json`** (Tract-level Pearson and Spearman correlation results)
4. **`data/processed/sensitivity_summary.json`** (Machine-readable weighting sensitivity summary)
5. **`data/processed/track7_summary.json`** (Master Track 7 metadata and pipeline state summary)

---

## 6. How to Run the Pipeline

```bash
# Run the complete Track 7 analytics & validation orchestrator
.\venv\Scripts\python.exe analysis/heat_analysis_main.py
```

