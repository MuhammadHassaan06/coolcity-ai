# CoolCity AI

**Autonomous Heat-Relief Resource Planning System for Phoenix, Arizona**

CoolCity AI is an operational decision-support platform designed for municipal heat-response teams. It combines **FortyGuard high-resolution thermal intelligence**, **U.S. Census Bureau demographic analytics**, **tract-level statistical correlation**, **deterministic resource allocation**, and a **tool-using AI planning agent** (Gemini) to determine where limited emergency heat-relief resources should be deployed first.

---

## 1. Overview & Core Mission

Urban heat islands create dramatic temperature microclimates across city neighborhoods. During extreme heat events, emergency management teams have strictly limited deployable assets—such as mobile cooling units, hydration stations, and community outreach teams.

CoolCity AI answers the critical operational question:

> **Which Census Tracts should receive limited heat-relief resources first, and what is the auditable evidence for that decision?**

By eliminating spatial pseudoreplication and anchoring risk metrics in verified Census geography, CoolCity AI converts raw thermal telemetry into explainable, constraint-bounded allocation plans.

---

## 2. The Problem

1. **Hyperlocal Variation**: Surface and ambient temperatures vary block by block based on canopy cover, pavement density, and urban geometry.
2. **Social Vulnerability Gaps**: High heat exposure frequently overlaps with low-income, elderly, or transit-dependent populations least equipped to adapt.
3. **Resource Allocation Bottlenecks**: Manual deployment under emergency conditions can result in delayed or inefficient resource distribution.

---

## 3. The Solution & Full Pipeline Architecture

```text
FortyGuard tOS API (/v1/heatmap)
              ↓
  Phoenix Municipal Boundary Filter
              ↓
  Census Tract Aggregation (N = 359)
              ↓
  Track 7 Statistical Correlations & Risk Scoring
              ↓
  Deterministic Resource Allocation Engine
              ↓
  Track 6 Gemini Function-Calling Agent (7 Tools)
              ↓
  Municipal Operations Console (Next.js 16 + React 19)
```

---

## 4. Hackathon Tracks

CoolCity AI bridges both competition tracks:

* **Track 7 — Data Analysis & Correlation**: Ingests, boundary-clips, and mean-aggregates FortyGuard thermal telemetry across 359 U.S. Census Tracts in Maricopa County, AZ; calculates tract-level Pearson/Spearman statistical correlations; and evaluates weighting sensitivity.
* **Track 6 — Agentic Planning (API + Agent)**: Implements a 7-tool Gemini function-calling agent backed by a 100% deterministic resource allocation engine that strictly enforces municipal inventory bounds.

---

## 5. Full-City Phoenix Dataset

The canonical full-city thermal snapshot was collected via FortyGuard tOS Enterprise API (`/v1/heatmap`):

* **Snapshot Date & Time**: July 15, 2024 at 14:00
* **Request Plan**: 23-chunk frozen Phoenix polygon tiling plan (50 sq mi scenario with 5% safety margin)
* **Raw Collected Thermal Features**: 221,420 high-resolution thermal features (~100m resolution)
* **Retained Features (Inside Phoenix Boundary)**: 121,892 thermal features (99,528 edge features outside municipal limits excluded)
* **Represented Census Tracts**: 359 U.S. Census Tracts (`geoid` preserved as an 11-character string starting with `04`, e.g., `'04013114900'`)
* **Represented Tract Population**: 1,542,520 (sum of Census populations for represented/intersected tracts; *not* exact total population of Phoenix)
* **Thermal Range**: `37.51°C` to `40.06°C` (Feature Mean: `39.04°C`, Tract-Mean Average: `39.25°C`)
* **Composite Risk Score Range**: `10.48` to `73.15` (Mean: `44.66`)
* **Current Top Hotspot**: Census Tract `04013114900` (Risk Score: `73.15`, Avg Temp: `39.81°C`, Population: `3,412`)

---

## 6. Heuristic Risk Model Formulation

When multi-temporal persistence data is unavailable from a single snapshot, composite heat risk is calculated using a 50/50 balanced prototype heuristic:

$$\text{Final Risk Score} = (\text{Intensity Score} \times 0.50) + (\text{Vulnerability Score} \times 0.50)$$

* **Intensity Score**: Min-max normalized average surface/ambient temperature per tract ($0.00 - 100.00$).
* **Vulnerability Score**: Equal-weight composite of normalized Census indicators:
  $$\text{Vulnerability Score} = \text{Mean}(\text{poverty\_rate\_norm}, \text{elderly\_rate\_norm}, \text{no\_vehicle\_rate\_norm}) \times 100$$
* **Risk Tiers**: Low ($< 25$), Moderate ($25 - 49.99$), High ($50 - 74.99$), Critical ($\ge 75$).

---

## 7. Statistical Analysis & Pseudoreplication Correction

Statistical unit: **U.S. Census Tract ($N = 359$)**.

Tile-level correlation ($N = 221,420$) was superseded to eliminate spatial pseudoreplication—assigning constant tract demographics across thousands of sub-tiles artificially inflates sample size and produces unearned $p$-values.

### Full-City Correlation Results ($N = 359$)

| Demographic Indicator | Field | Pearson $r$ | Pearson $p$-value | Spearman $\rho$ | Spearman $p$-value | Significant ($p < 0.05$)? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Minority Share** | `minority_rate` | **+0.5425** | $7.31 \times 10^{-29}$ | **+0.5335** | $8.40 \times 10^{-28}$ | ✅ True |
| **Poverty Share** | `poverty_rate` | **+0.4738** | $1.75 \times 10^{-21}$ | **+0.5700** | $2.54 \times 10^{-32}$ | ✅ True |
| **No-Vehicle Share** | `no_vehicle_rate` | **+0.3541** | $4.80 \times 10^{-12}$ | **+0.4134** | $2.96 \times 10^{-16}$ | ✅ True |
| **Elderly Share (65+)**| `elderly_rate` | **-0.4101** | $5.44 \times 10^{-16}$ | **-0.4016** | $2.38 \times 10^{-15}$ | ✅ True |
| **Disability Share** | `disability_rate` | **+0.2204** | $2.51 \times 10^{-5}$ | **+0.1746** | $8.95 \times 10^{-4}$ | ✅ True |
| **Unemployment Share**| `unemployment_rate`| **+0.1975** | $1.66 \times 10^{-4}$ | **+0.1661** | $1.59 \times 10^{-3}$ | ✅ True |

*Note: Correlations indicate exploratory spatial associations only and do not establish direct causality.*

---

## 8. Weighting Sensitivity Analysis

To evaluate prioritization stability under heuristic weight shifts across 359 Census Tracts:

* **Scenario A (Socially Weighted: 40% Heat / 60% Vulnerability)**: Spearman $\rho = 0.9895$ with baseline. 52 tracts (14.5%) shifted risk band. 9/10 top hotspot overlap.
* **Scenario B (Baseline: 50% Heat / 50% Vulnerability)**: Current baseline.
* **Scenario C (Heat Weighted: 60% Heat / 40% Vulnerability)**: Spearman $\rho = 0.9880$ with baseline. 113 tracts (31.5%) shifted risk band. 9/10 top hotspot overlap.

*Result: High ranking stability across all reasonable weight configurations.*

---

## 9. Track 6 Agentic Workflow & Deterministic Constraints

The Track 6 planning agent combines LLM tool orchestration (Gemini 2.5) with a deterministic resource allocation engine:

### 7 Autonomous Agent Tools
1. `get_priority_zones`: Fetches top $N$ Census Tracts ranked by authoritative Track 7 risk scores.
2. `get_zone_heat_telemetry`: Retrieves microclimate surface and ambient temperature readings for a tract.
3. `get_zone_demographics`: Fetches Census socioeconomic vulnerability indicators.
4. `get_historical_heat_metrics`: Checks baseline historical temperature data.
5. `get_cooling_facility_coverage`: Audits operational cooling centers and capacity.
6. `get_resource_inventory`: Queries available municipal resource stock.
7. `allocate_heat_resources`: Executes the 100% deterministic allocation engine.

### Strict Deterministic Constraints
* **Hard Inventory Caps**: Total allocated units per resource category can **never exceed** submitted inventory bounds.
* **Deterministic Tie-Breaking**: Equal risk scores break ties deterministically by `geoid` ascending.
* **Immutable Risk Source**: The agent consumes authoritative Track 7 risk scores directly; LLMs are never permitted to alter numerical risk scores or inventory math.
* **Graceful Offline Fallback**: If `GEMINI_API_KEY` is absent or quota is exceeded, the system automatically falls back to the deterministic allocation pipeline.

---

## 10. Deployable Resource Types

* **Mobile Cooling Units**: High-capacity air-conditioned mobile vehicles for high-risk residential/commercial sectors.
* **Water Stations**: Rapid hydration distribution stations for transit hubs and uncovered neighborhoods.
* **Outreach Teams**: Community health workers providing direct wellness checks and support for vulnerable residents.

---

## 11. Dashboard Interface & Features

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and Leaflet:

* **Phoenix Municipal Operations Header**: Displays live/demo data badges and operational status.
* **Control Bar**: Allows toggling between Heat Exposure and Risk Index views, and selecting operational time periods.
* **Interactive Phoenix Map**: Renders the official municipal boundary (`phoenix-city-boundary.geojson`) with spatial bounds auto-fitting.
* **Priority Census Tracts Panel**: Displays top ranked Census Tracts with 11-character GEOIDs, risk scores, temperature readings, and Census populations.
* **Track 7 Statistical & Sensitivity Panel**: Displays live Pearson/Spearman correlation matrices and sensitivity scenario comparisons.
* **Resource Inventory & Deployment Panel**: Interactive form to adjust resource counts and trigger the Track 6 agent planning pipeline.

---

## 12. Tech Stack

* **Frontend**: Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS v4, Leaflet, React Leaflet, Lucide Icons.
* **Backend & AI**: Node.js, TypeScript, `@google/genai` (Gemini Function-Calling), Zod validation schemas.
* **Analytics Engine**: Python 3.14, Pandas, SciPy (`scipy.stats`), NumPy.
* **Deployment & Build**: Vercel ready, zero ESLint errors, zero TypeScript compilation errors.

---

## 13. Repository Structure

```text
coolcity-ai/
├── README.md
├── PROJECT_PLAN.md
├── FRONTEND_HANDOFF.md
├── TRACK7_HANDOFF_SUMMARY.md
├── .gitignore
├── analysis/
│   ├── DATA_DICTIONARY.md
│   ├── heat_analysis_main.py
│   ├── process_full_city_analytics.py
│   ├── correlation.py
│   ├── vulnerability.py
│   └── census_ingestion.py
├── data/
│   └── processed/
│       ├── phoenix_tract_risk.json
│       ├── phoenix_tract_risk.csv
│       ├── correlation_summary.json
│       ├── sensitivity_summary.json
│       └── track7_summary.json
└── web/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── .env.example
    ├── public/
    │   └── data/
    │       └── phoenix-city-boundary.geojson
    ├── scripts/
    │   ├── sync-track7-data.mjs
    │   └── collect-full-city-heat.ts
    ├── tests/
    │   ├── fortyguard.test.ts
    │   ├── zones-risk.test.ts
    │   ├── analytics-services.test.ts
    │   ├── allocation.test.ts
    │   ├── agent-workflow.test.ts
    │   └── track6-agent.test.ts
    └── src/
        ├── app/
        ├── components/
        ├── data/track7/
        ├── lib/
        └── types/
```

---

## 14. Local Setup & Environment Variables

### Environment Setup

Create `web/.env.local` (or set environment variables in server environment):

```env
# Required for live FortyGuard API heatmap creation (Server-Side Only)
FORTYGUARD_API_KEY=your_fortyguard_api_key_here

# Required for Track 6 Gemini Agentic Planning (Server-Side Only)
GEMINI_API_KEY=your_gemini_api_key_here
```

*Note: The application includes offline fallback data and deterministic planning when API keys are not provided.*

---

## 15. Running the Application

### 1. Web Application Development & Production Build

```bash
cd web

# Install Node dependencies
npm install

# Run local development server
npm run dev

# Run full TypeScript check and ESLint
npm run typecheck
npm run lint

# Run offline unit test suite (42 tests)
npm test

# Build production bundle
npm run build
```

### 2. Python Analytics Engine (Offline / Local Data)

```bash
# Compile and check Python source code
python -m compileall analysis

# Re-run full-city spatial processing against local dataset
python analysis/process_full_city_analytics.py

# Sync outputs to web runtime
node web/scripts/sync-track7-data.mjs
```

---

## 16. Test & Build Validation Results

* **Offline Node/TypeScript Tests**: **42 / 42 PASSing** (across 6 test suites covering FortyGuard client, allocation engine, zone service, analytics contracts, and agentic workflow).
* **Python Compile Check**: **0 Errors**.
* **TypeScript Compilation (`tsc --noEmit`)**: **0 Errors**.
* **ESLint (`eslint src`)**: **0 Errors, 0 Warnings**.
* **Next.js Production Build (`next build`)**: **SUCCESSFUL** (Turbopack production build optimized).

---

## 17. Scientific & Product Methodology Limitations

1. **Prototype Heuristic Weighting**: The 50/50 risk score formula is a spatial prioritization heuristic for decision-support testing. It is **not clinically validated** and does **not predict individual medical outcomes**.
2. **Prototype Risk Bands**: Categories (Low, Moderate, High, Critical) are equal-width mathematical tiers ($25$-point intervals), not official epidemiological thresholds.
3. **Single Historical Snapshot**: Data reflects a single static snapshot on July 15, 2024 at 14:00. Multi-temporal persistence metrics are marked unavailable (`null`).
4. **Historical Climatological Baseline**: Anomaly calculations from historical averages are disabled due to the lack of an official NOAA/NWS Period of Record baseline dataset in repository evidence.
5. **Represented Tract Population**: `affectedPopulation` ($1,542,520$) represents the total Census population residing within Phoenix-intersecting Census Tracts. It is **not** the official municipal population of Phoenix ($1.6M+$).
6. **Exploratory Correlation**: Statistical correlations represent spatial co-location across tracts, **not direct causation**.
7. **Non-Official System**: CoolCity AI is a hackathon decision-support prototype and is **not an official City of Phoenix system or municipal partnership**.

---

## 18. Team Architecture & Responsibilities

* **Member 1 (Backend / FortyGuard / Track 6 Lead)**: Built FortyGuard API adapter, polygon tiling planner, deterministic allocation engine, Gemini function-calling agent, and 7 agent tools.
* **Member 2 (Data Science / Track 7 Lead)**: Developed Census demographic ingestion, spatial boundary filtering, pseudoreplication-corrected correlation engine, and weighting sensitivity analysis.
* **Member 3 (Frontend / Integration Lead)**: Architected municipal operations console UI, Leaflet map integration, data adapter boundary, responsive layouts, and accessibility features.

---

## 19. License & Hackathon Note

Developed for the FortyGuard Hackathon (August 2026). All FortyGuard thermal data, Census ACS data, and municipal GeoJSON boundaries are utilized under hackathon guidelines for educational and decision-support research.
