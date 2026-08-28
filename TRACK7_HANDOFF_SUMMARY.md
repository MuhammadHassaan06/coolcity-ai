# Track 7 — Heat Analytics & Statistical Correlation Handoff Summary
**Project:** CoolCity AI (Phoenix, Arizona)  
**Track:** Track 7 (Data Analysis & Correlation) & Track 6 Integration  
**Lead:** Member 2 (Data Science)  
**Target Roles:** Member 1 (AI Agent / Orchestration) & Member 3 (Dashboard / Frontend)  
**Status:** ✅ Completed & Validated with 100% Real Ingestion Data (Zero Synthetic/Random Data)

---

## 1. Executive Summary & Real Data Findings

Track 7 has been updated to use **100% real empirical data** with zero synthetic or random values:
1. **FortyGuard Real Thermal Ingestion**: High-resolution thermal data from FortyGuard tOS Enterprise API (`/v1/heatmap`) covering **48,199 spatial tiles** (100m resolution) across the Phoenix Urban Heat Island (UHI) Corridor (Maryvale, Downtown Phoenix / Central City, South Mountain, Encanto, Alhambra, Camelback East, Sky Harbor).
2. **U.S. Census Bureau ACS 5-Year Demographics**: Real Census Tract boundaries from Census TIGERweb (State FIPS `04`, County FIPS `013`) and official ACS 5-Year socioeconomic indicators (Poverty Rate, Elderly 65+ Share, Households with Zero Vehicle Access, Unemployment, Disability, Minority rates) across 230 intersected Census Tracts.
3. **Climatological Baseline & Anomalies**: Anomaly calculation relative to the Phoenix multi-year summer climatological baseline ($39.50^\circ\text{C} / 103.10^\circ\text{F}$).
4. **Composite Risk Formulation**:
   $$\text{Final Risk Score} = (\text{Intensity Score} \times 0.50) + (\text{Vulnerability Score} \times 0.50)$$
   *(When real multi-temporal persistence is unavailable from a single daily snapshot, persistence is honestly marked unavailable and weights are allocated across active components, preserving the exact 0–100 scale).*

---

## 2. Statistical Correlation Matrix (SciPy Engine)

Calculated across **48,199 real Phoenix spatial tiles**:

| Demographic Variable | Sample Size | Pearson $r$ | Pearson $p$-value | Spearman $r$ | Spearman $p$-value | Statistically Significant ($p < 0.05$) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Poverty Rate** (`poverty_rate`) | 48,199 | **-0.1214** | $9.36 \times 10^{-158}$ | **-0.1386** | $3.01 \times 10^{-205}$ | ✅ **True** |
| **No-Vehicle Rate** (`no_vehicle_rate`) | 48,199 | **+0.1108** | $2.04 \times 10^{-131}$ | **+0.1510** | $1.33 \times 10^{-243}$ | ✅ **True** |
| **Elderly Rate (65+)** (`elderly_rate`) | 48,199 | **+0.0525** | $8.36 \times 10^{-31}$ | **+0.0871** | $8.13 \times 10^{-82}$ | ✅ **True** |
| **Unemployment Rate** (`unemployment_rate`)| 48,199 | **-0.0883** | $2.11 \times 10^{-83}$ | **-0.0757** | $1.07 \times 10^{-61}$ | ✅ **True** |
| **Disability Rate** (`disability_rate`) | 48,199 | **+0.0267** | $5.54 \times 10^{-9}$ | **+0.0492** | $5.04 \times 10^{-27}$ | ✅ **True** |
| **Minority Rate** (`minority_rate`) | 48,199 | **-0.2602** | $< 1.0 \times 10^{-300}$ | **-0.3389** | $< 1.0 \times 10^{-300}$ | ✅ **True** |

---

## 3. Real Metric Ranges & Distribution

- **Total Real Spatial Tiles**: `48,199`
- **Area of Interest (AOI)**: Phoenix Heat Corridor ($33.3795^\circ\text{N} - 33.5605^\circ\text{N}$, $-112.2205^\circ\text{W} - -111.9595^\circ\text{W}$)
- **Temperature Range ($^\circ\text{C}$)**: `34.70°C` to `36.70°C` (Mean: `36.07°C`)
- **Temperature Range ($^\circ\text{F}$)**: `94.46°F` to `98.06°F` (Mean: `96.93°F`)
- **Historical Summer Baseline ($^\circ\text{C}$)**: `39.50°C` (`103.10°F`)
- **Temperature Anomaly ($^\circ\text{C}$)**: Range `-4.80°C` to `-2.80°C` (Mean: `-3.43°C`)
- **Vulnerability Score (0 - 100)**: Range `6.23` to `61.15` (Mean: `23.30`)
- **Final Risk Score (0 - 100)**: Range `6.79` to `78.19` (Mean: `45.92`)
- **Risk Bands (Exact Scale)**:
  * **Critical ($\ge 75.00$)**: `87 tiles` (0.2%)
  * **High ($50.00 - 74.99$)**: `19,475 tiles` (40.4%)
  * **Moderate ($25.00 - 49.99$)**: `27,845 tiles` (57.8%)
  * **Low ($< 25.00$)**: `792 tiles` (1.6%)

---

## 4. Top Critical Hotspots Requiring Priority Intervention

| Tile ID | District / Neighborhood | Census Tract | Temp (°C) | Poverty Rate | Elderly Rate | No-Vehicle Rate | Vulnerability Score | Final Risk Score | Risk Level |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `FG-PHX-15908` | Sky Harbor / East Lake | Census Tract 1139 | 36.62°C | 73.4% | 3.9% | 49.2% | 60.39 | **78.19** | 🔴 **Critical** |
| `FG-PHX-16149` | Sky Harbor / East Lake | Census Tract 1139 | 36.62°C | 73.4% | 3.9% | 49.2% | 60.39 | **78.19** | 🔴 **Critical** |
| `FG-PHX-15183` | Sky Harbor / East Lake | Census Tract 1139 | 36.62°C | 73.4% | 3.9% | 49.2% | 60.39 | **78.19** | 🔴 **Critical** |
| `FG-PHX-15184` | Sky Harbor / East Lake | Census Tract 1139 | 36.62°C | 73.4% | 3.9% | 49.2% | 60.39 | **78.19** | 🔴 **Critical** |
| `FG-PHX-16390` | Sky Harbor / East Lake | Census Tract 1139 | 36.62°C | 73.4% | 3.9% | 49.2% | 60.39 | **78.19** | 🔴 **Critical** |

---

## 5. Deliverables & Integration Contract

The processed data artifacts are saved under `data/processed/`:

1. **`data/processed/phoenix_risk_scored_tiles.csv`** (48,199 records, complete tabular dataset)
2. **`data/processed/phoenix_risk_scored_tiles.json`** (48,199 records, array of JSON objects matching frontend interfaces)
3. **`data/processed/phoenix_risk_scored_tiles.geojson`** (48,199 Polygon features with CRS `EPSG:4326`)
4. **`analysis/DATA_DICTIONARY.md`** (Complete specification of field names, units, raw vs. derived, sources, and methods)

---

## 6. How to Run the Pipeline

```bash
# Run the pipeline with active venv
.\venv\Scripts\python.exe analysis/heat_analysis_main.py
```
