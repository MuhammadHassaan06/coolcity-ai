# CoolCity AI — Complete Project Plan

**Document role:** Team source of truth (Historical Design Master Plan)
**Project:** CoolCity AI — Autonomous Heat-Relief Resource Planner  
**Primary study city:** Phoenix, Arizona, USA  
**Hackathon:** FortyGuard Challenge, August 2026  
**Tracks:** Track 6 — Agentic Track + Track 7 — Data Analysis & Correlation  
**Team size:** 3  
**Submission deadline:** 30 August 2026, 11:59 PM GST (UTC+4)  
**Status:** ✅ Fully Integrated & Validated (359 Census Tracts, 121,892 Phoenix boundary thermal features)

---


# 1. Why This File Exists

Every team member must understand the same product before coding.

This file answers:

- What exactly are we building?
- What problem does it solve?
- Who would use it?
- Why Phoenix?
- What does FortyGuard provide?
- What data do we add?
- How do Track 6 and Track 7 connect?
- What does the AI agent actually do?
- What is deterministic code responsible for?
- How is the risk score calculated?
- What is the MVP?
- What is explicitly out of scope?
- What are the responsibilities of all three members?
- What repository and Git workflow will we use?
- What should be built first?
- How will backend, analytics, and frontend connect?
- What are our API/data contracts?
- How will we test the system?
- What will the final demo look like?
- What assumptions must still be verified?

No major scope change should be made only in chat. If the team agrees to a change, update this document in the same pull request.

---

# 2. Executive Summary

CoolCity AI is a **municipal heat-response decision-support platform**.

It combines:

1. **FortyGuard hyperlocal temperature intelligence**
2. **Historical heat analysis**
3. **Public demographic/socioeconomic data**
4. **Cooling/heat-relief access information where reliable data is available**
5. **Zone-level statistical analysis and correlations**
6. **A transparent composite heat-risk score**
7. **A tool-using AI agent**
8. **Deterministic resource constraints and allocation rules**
9. **A visual map/dashboard**
10. **Evidence-backed explanations**

The system answers:

> **Given limited cooling resources, which parts of our Phoenix study area should receive them first, what should be deployed, and what evidence supports that decision?**

The project does **not** claim that software itself cools the city. It helps a real client make a better, faster, more evidence-based heat-response decision.

---

# 2A. Official Hackathon Resources

The FortyGuard hackathon organizers provide the official temperature-intelligence infrastructure that this project uses.

## Provided by the hackathon organizers

- The official **FortyGuard Temperature API**
- Hackathon participant **API key/access**
- Official **Temperature API documentation**
- The official **`temperature-api-quickstart` GitHub repository**
- Starter code, notebooks, and examples for learning the API workflow

CoolCity AI is intentionally built **on top of** these official resources.

## Built by the CoolCity AI team

The hackathon-provided API and starter repository are not our final product. Our team is responsible for designing and implementing:

- Phoenix study-area selection and zone structure
- Temperature-data ingestion into our product
- Historical heat metrics
- Demographic/socioeconomic data collection and cleaning
- Spatial alignment of external data with heat zones
- Track 7 correlation analysis
- Feature normalization
- CoolCity Risk Score
- Priority-zone ranking
- Cooling-access analysis where reliable data is available
- Deterministic resource-allocation logic
- Track 6 tool-using AI agent
- Agent tool schemas and orchestration
- Explainable evidence-backed recommendations
- Web dashboard
- Heat/risk map
- Charts and analytics visualizations
- Resource inventory controls
- Agent plan UI
- Error/loading/empty states
- Testing
- Vercel deployment
- Final demo, documentation, and commercialization story

This distinction must be maintained in the README, presentation, and final submission:

```text
PROVIDED BY HACKATHON
FortyGuard Temperature API
API access
API documentation
Quickstart repository
            |
            v
BUILT BY OUR TEAM
Data integration
Track 7 analytics
Risk model
Zone ranking
Resource allocator
Track 6 AI agent
Dashboard
Explainability
Deployment
```

---

# 3. Challenge Alignment

## 3.1 Challenge requirements

From the challenge brief supplied to the team:

- Build window: **18–30 August 2026**
- Deadline: **30 August 2026, 11:59 PM GST (UTC+4)**
- Online/global event
- Team size: **1–3**
- U.S. geography only
- Challenge historical range: **1 January 2021 to present**
- Heatmap forecasting: up to **12 hours ahead** where available
- Goal: build something a real client could use
- Commercialization matters

## 3.2 Selected tracks

### Track 7 — Data Analysis & Correlation

Our Track 7 contribution is not merely showing a heatmap.

We will:

- retrieve hyperlocal heat data,
- aggregate it into operational zones,
- compute heat metrics,
- join those metrics with non-weather variables,
- test correlations,
- interpret relationships,
- build normalized risk features,
- and quantify spatial heat vulnerability.

Track 7 answers:

> **Where is heat exposure most severe, how persistent is it, and how does that exposure relate to neighborhood vulnerability or access?**

### Track 6 — Agentic Track

Our Track 6 contribution is not merely a chatbot.

The agent receives a goal and resource constraints, chooses tools, retrieves evidence, and returns an action plan.

Track 6 answers:

> **Given the evidence and the resources we actually have, what should the city do first?**

## 3.3 How the tracks connect

```text
TRACK 7
Data + statistics + correlations
            |
            v
    Zone-level evidence
            |
            v
    CoolCity Risk Score
            |
            v
TRACK 6
Tool-using AI agent
            |
            v
Resource deployment plan
            |
            v
Explainable recommendation
```

This connection is the central product story.

---

# 4. Client and User Persona

## 4.1 Proposed client

A city heat-response, resilience, public-health operations, or emergency-management team.

The hackathon study client persona is a **Phoenix municipal heat-response operator**.

CoolCity AI is not affiliated with or endorsed by the City of Phoenix.

## 4.2 Primary user

Example user:

> A heat-response operations coordinator who must decide where temporary/mobile resources should go during a high-heat period.

The user may have a limited inventory such as:

- 2 mobile cooling units,
- 3 temporary water/hydration stations,
- 1 outreach team.

## 4.3 User's job-to-be-done

The user needs to:

1. understand where heat exposure is currently or historically most concerning,
2. understand which locations also show greater vulnerability/access gaps,
3. rank candidate zones,
4. enter available resources,
5. receive a plan that does not exceed inventory,
6. see exactly why each deployment was recommended.

---

# 5. Why Phoenix, Arizona

Phoenix is a strong initial geography because municipal heat response is already a real operational problem.

The City's 2026 Heat Response Plan includes strategies around:

- first-responder heat response,
- publicly accessible cool space and drinking water,
- cool/safe home environments,
- mobility and recreation,
- worker heat safety,
- education and partnerships.

This makes the proposed customer story credible.

Phoenix is a **study geography**, not an official partner.

---

# 6. Product Scope

## 6.1 Product name

**CoolCity AI**

## 6.2 Product category

Urban heat intelligence + municipal resource decision support.

## 6.3 Core product promise

> Convert hyperlocal heat and vulnerability evidence into a ranked and explainable heat-relief resource deployment plan.

## 6.4 Core user flow

```text
Open dashboard
   |
   v
Select/use Phoenix study area
   |
   v
Load temperature intelligence
   |
   v
View heat + vulnerability + risk
   |
   v
Inspect ranked zones
   |
   v
Enter available resources
   |
   v
Ask agent to generate plan
   |
   v
Agent calls approved tools
   |
   v
Deterministic allocation respects constraints
   |
   v
Show deployments on map
   |
   v
Show evidence and explanation
```

---

# 7. What FortyGuard Provides

FortyGuard is the **official temperature-intelligence provider for the hackathon**. The Temperature API, API access, documentation, and official quickstart repository are provided by the hackathon organizers. CoolCity AI uses these official resources as its foundation and adds the decision-support product layer built by our team.

According to the current public API documentation, the API supports high-resolution heatmap tasks derived from spatial and temporal inputs.

## 7.1 Authentication

Requests use an API key in the request header:

```text
api-key: YOUR_API_KEY
```

No real API key belongs in GitHub, screenshots, documentation, issues, PRs, frontend JavaScript, or logs.

## 7.2 Heatmap endpoint

Core endpoint:

```text
POST https://api.fortyguard.com/v1/heatmap
```

The heatmap request includes:

- a GeoJSON polygon AOI,
- date/time configuration,
- a supported granularity,
- API-key authentication.

The response returns an `activity_id`.

## 7.3 Asynchronous task model

The API is asynchronous.

```text
POST heatmap
   |
   v
activity_id
   |
   v
GET /v1/status/{activity_id}
   |
   +-- Processing
   +-- Completed
   `-- Failed
```

Core status endpoint:

```text
GET https://api.fortyguard.com/v1/status/{activity_id}
```

On completion, heatmap results include structures such as:

```text
map_data
stats_data
```

The exact response must be inspected with the team's real API access before application types are frozen.

## 7.4 Heatmap output

The API documentation describes GeoJSON polygon heatmap output with temperature tiles.

The statistical output can include:

- minimum temperature,
- maximum temperature,
- mean temperature,
- standard deviation,
- temperature distributions/frequency information.

The heatmap documentation also exposes analysis modes relevant to:

- exceedance,
- time of measure,
- persistence.

We will only implement the modes verified to work under the team's account and project needs.

## 7.5 Current documented constraints to respect

Public docs currently state items such as:

- U.S. regional coverage,
- asynchronous task processing,
- supported heatmap granularity options,
- area limits that differ by plan,
- date/time constraints,
- forecast support up to 12 hours ahead.

**Important:** We must inspect the hackathon key/account and not assume which commercial plan label applies to the team.

## 7.6 Hackathon date policy

Although current public API docs indicate support earlier than 2021, our challenge brief specifies **1 January 2021 to present**.

Therefore:

> **CoolCity AI hackathon analyses will use 2021-to-present historical data.**

This keeps the submission aligned with the challenge.

---

# 8. The Data We Add

Track 7 requires non-weather variables.

## 8.1 Demographic/socioeconomic source

Preferred source:

- U.S. Census Bureau
- American Community Survey (ACS)

Candidate variables:

- total population,
- percentage of population age 65+,
- poverty rate,
- no-vehicle household share,
- selected additional vulnerability indicators only if meaningful and reliably available.

## 8.2 Selection rule

Do not add a variable only because it exists.

For every non-weather variable, document:

1. source,
2. year,
3. geographic level,
4. field/column,
5. unit,
6. missing-value rate,
7. why it is relevant,
8. whether higher values mean higher or lower vulnerability.

## 8.3 Cooling/heat-relief access

If a reliable public dataset can be obtained in time, we may add:

- cooling/heat-relief locations,
- hydration locations,
- distance to nearest relief site,
- count of sites near/in a zone.

If a reliable current dataset cannot be obtained, do not fabricate city facilities. Use a clearly labeled demo inventory for **deployable resources** and either omit or simplify the cooling-access-gap factor.

## 8.4 Data provenance rule

Every externally sourced field must have metadata.

Suggested file:

```text
analysis/data/data_dictionary.csv
```

Columns could include:

```text
field_name
source
source_url
source_year
geography
unit
description
transformation
notes
```

---

# 9. Study Area and Zone Design

## 9.1 City

Phoenix, Arizona.

## 9.2 Area of interest

We will **not** request the entire metro area at maximum resolution.

We begin with a **small Phoenix study area** that:

- is clearly inside the U.S.,
- fits the team's actual FortyGuard area/credit constraints,
- contains enough spatial variation for a useful demo,
- can be analyzed repeatedly without burning unnecessary credits.

## 9.3 Exact polygon

**Not frozen yet.**

The exact AOI polygon must be selected after the first API test.

The team should store approved AOI definitions in version control, for example:

```text
analysis/data/phoenix_aoi.geojson
```

## 9.4 Operational zones

FortyGuard tiles and city operational zones are not necessarily the same thing.

The product should aggregate detailed heat tiles into a manageable set of zones.

Initial target:

```text
approximately 8-20 zones
```

The exact number depends on:

- AOI size,
- data quality,
- map readability,
- compute/API cost,
- statistical usefulness.

Each zone needs a stable ID.

Example:

```text
PHX-Z01
PHX-Z02
PHX-Z03
```

Avoid relying only on labels like "Zone A" in machine-readable data.

---

# 10. Track 7 Analytics Methodology

## 10.1 Raw heat data

For each relevant date/time/AOI we may obtain:

- GeoJSON heat tiles,
- temperature value per tile,
- stats_data,
- persistence/exceedance results if used.

## 10.2 Historical period

The exact historical sample must balance statistical value and API credits.

Possible MVP strategy:

- selected representative hot dates/times from 2021-2026,
- or a reproducible sampling strategy,
- rather than requesting every hour of every day.

The sampling plan must be documented before large API batches are run.

## 10.3 Zone aggregation

For a zone, candidate heat features include:

```text
zone_mean_temp
zone_max_temp
zone_std_temp
hot_tile_share
heat_persistence
threshold_exceedance
historical_mean
historical_percentile
historical_deviation
```

Only keep fields we can calculate reliably.

## 10.4 Spatial joining

Goal:

```text
FortyGuard tiles
     +
analysis zones
     +
Census/ACS geography
     |
     v
zone-level analytical table
```

Potential tooling:

- GeoPandas if spatial operations are needed,
- Shapely if needed,
- Pandas for tabular operations.

Do not introduce geospatial libraries unless necessary.

## 10.5 Data cleaning

At minimum:

- validate coordinates/geometries,
- ensure consistent CRS where applicable,
- remove/handle duplicates,
- quantify missing values,
- keep units consistent,
- distinguish Fahrenheit/Celsius explicitly,
- record source dates,
- never mix temporal snapshots without labeling them.

## 10.6 Normalization

Risk-score features need comparable scales.

Candidate method:

```text
min-max normalization to 0-100
```

For feature `x`:

```text
normalized = 100 * (x - min) / (max - min)
```

Edge case:

If all zones have the same value, define a stable rule instead of dividing by zero.

For factors where **lower values mean higher risk** (for example, access), invert the normalized value when appropriate.

## 10.7 Correlation analysis

Track 7 must include a real statistical relationship between temperature and non-weather data.

Candidate analyses:

```text
heat exposure vs poverty rate
heat exposure vs age 65+ share
heat exposure vs no-vehicle household share
heat exposure vs cooling-access gap
```

### Pearson

Use when:

- relationship is approximately linear,
- data assumptions are reasonable,
- outliers are controlled/understood.

### Spearman

Use when:

- distributions are non-normal,
- relationship is monotonic rather than strictly linear,
- sample size/robustness makes rank correlation more appropriate.

The notebook/report should state why the chosen method was used.

## 10.8 Statistical interpretation

Never write:

> Poverty causes heat.

unless a valid causal design supports that claim.

Instead write:

> Within the analyzed zones, higher heat exposure was associated with higher/lower values of X.

Report:

- correlation coefficient,
- sample size,
- p-value if applicable,
- method,
- limitations.

Do not overstate significance in a small-zone hackathon sample.

## 10.9 Deliverables from analytics member

The analytics work should eventually produce:

```text
analysis/notebooks/
analysis/scripts/
analysis/data/processed_zone_metrics.csv
analysis/data/data_dictionary.csv
```

The web app should consume a clean, documented format rather than an exploratory notebook directly.

---

# 11. CoolCity Risk Score

## 11.1 Purpose

The score ranks zones for resource-allocation **decision support**.

It is not:

- an official emergency score,
- a medical risk model,
- a FortyGuard score,
- a City of Phoenix score.

## 11.2 Candidate components

### A. Heat Exposure

Possible inputs:

- current/selected-hour temperature,
- zone max temperature,
- percentile relative to study area/history.

### B. Heat Persistence

Represents how long elevated heat remains.

Possible source:

- FortyGuard persistence mode if verified,
- or a documented derived historical metric.

### C. Demographic Vulnerability

Composite or selected indicator(s), such as:

- poverty,
- older-population share,
- no-vehicle households.

Avoid building an opaque mega-index. Keep components explainable.

### D. Cooling Access Gap

If reliable facility data exists:

- distance/access to existing cooling relief.

If it does not, this component should be removed or replaced rather than invented.

## 11.3 Initial prototype weighting

Candidate only:

```text
40% Heat Exposure
25% Heat Persistence
25% Demographic Vulnerability
10% Cooling Access Gap
```

Formula:

```text
risk =
    0.40 * heat_exposure_score
  + 0.25 * heat_persistence_score
  + 0.25 * vulnerability_score
  + 0.10 * cooling_access_gap_score
```

## 11.4 Weighting rules

Before final demo:

- explain why weights were chosen,
- perform at least a basic sensitivity check,
- confirm rankings do not flip arbitrarily under tiny changes,
- document if weights are heuristic.

If a component is removed, redistribute weights transparently.

## 11.5 Risk bands

Candidate UI bands:

```text
0-39   Low
40-59  Moderate
60-79  High
80-100 Critical
```

These are visualization categories, not official public-safety thresholds.

## 11.6 Explainability

Every zone card should be able to show:

```text
Risk score: 86/100

Heat exposure       94/100
Persistence         88/100
Vulnerability       75/100
Cooling access gap  72/100
```

The exact numbers must come from the same dataset used by the ranking logic.

---

# 12. Track 6 Agent Design

## 12.1 What makes it an agent?

The system must do more than send a prompt to an LLM.

The agent should:

1. interpret a resource-allocation goal,
2. identify which tools/data are needed,
3. call approved tools,
4. inspect results,
5. respect resource constraints,
6. build a plan,
7. explain the plan.

## 12.2 Agent boundaries

The agent may:

- request zone rankings,
- retrieve evidence,
- retrieve resource inventory,
- choose which evidence to inspect,
- orchestrate the workflow,
- summarize/justify actions.

The agent must not:

- invent missing values,
- silently alter risk scores,
- claim an unavailable resource exists,
- deploy more resources than the user owns,
- fabricate city infrastructure,
- make medical claims,
- present itself as an emergency authority.

## 12.3 Candidate tools

### `get_zone_heat_data`

Input:

```json
{
  "zoneIds": ["PHX-Z01", "PHX-Z02"]
}
```

Output:

```json
{
  "zones": [
    {
      "zoneId": "PHX-Z01",
      "meanTemp": 0,
      "maxTemp": 0,
      "unit": "C"
    }
  ]
}
```

### `get_historical_heat_metrics`

Returns historical deviation, percentile, persistence/exceedance metrics where available.

### `get_zone_vulnerability`

Returns documented non-weather metrics.

### `get_cooling_coverage`

Only enabled if a reliable cooling-access dataset is available.

### `get_zone_risk_scores`

Returns deterministic scores and component scores.

### `get_resource_inventory`

Returns the user's available resource counts.

### `rank_priority_zones`

Deterministically sorts eligible zones according to approved ranking rules.

### `allocate_resources`

Applies hard constraints so allocation can never exceed available inventory.

## 12.4 Deterministic vs LLM responsibilities

### Deterministic code owns

- arithmetic,
- normalization,
- risk score,
- sorting,
- resource counts,
- eligibility constraints,
- allocation validity,
- input validation.

### LLM owns

- interpreting user intent,
- choosing which tools to call,
- deciding what evidence to inspect,
- synthesizing the plan,
- explaining why,
- producing a clear memo/narrative.

This separation protects the product from LLM math errors.

## 12.5 Example agent input

```text
We have 2 mobile cooling units, 3 water stations,
and 1 outreach team available for this afternoon.
Prioritize the highest-risk uncovered zones.
```

## 12.6 Example structured agent output

```json
{
  "summary": "Prioritize the two highest-risk zones first.",
  "allocations": [
    {
      "resourceType": "mobile_cooling_unit",
      "quantity": 1,
      "zoneId": "PHX-Z04",
      "reasonCodes": [
        "HIGH_HEAT_EXPOSURE",
        "HIGH_PERSISTENCE",
        "HIGH_VULNERABILITY"
      ]
    }
  ],
  "unallocatedResources": {},
  "evidence": [],
  "warnings": []
}
```

Prefer structured JSON/schema validation and render human-readable prose from that result.

---

# 13. Resource Allocation Logic

## 13.1 MVP resources

Initial demo resource types:

```text
mobile_cooling_unit
water_station
outreach_team
```

## 13.2 Inventory model

Example:

```json
{
  "mobileCoolingUnits": 2,
  "waterStations": 3,
  "outreachTeams": 1
}
```

## 13.3 Hard constraints

For every resource type:

```text
allocated_quantity <= available_quantity
```

Also:

- no negative quantity,
- integer quantities only,
- reject unrecognized resource types,
- do not allocate to invalid zones.

## 13.4 Allocation strategy

MVP allocation may be rule-driven.

Example:

1. sort zones by risk descending,
2. optionally account for existing coverage,
3. allocate scarce high-impact resources to top eligible zones,
4. distribute simpler resources to remaining high-risk zones,
5. log why each assignment was made.

The exact rules must be transparent.

## 13.5 Why not let the LLM allocate freely?

Because resource counts and ranking are hard constraints.

A better architecture:

```text
LLM decides what planning step is needed
          |
          v
deterministic allocator executes valid allocation
          |
          v
LLM explains returned allocation
```

---

# 14. Frontend Product Design

## 14.1 Main page

Recommended desktop layout:

```text
+------------------------------------------------------+
| CoolCity AI                     Phoenix, Arizona     |
| Autonomous Heat-Relief Planner                      |
+------------------------------------------------------+
| Time controls / data freshness / source status       |
+-------------------------------+----------------------+
|                               | City Risk Summary    |
|                               | Critical zones       |
| Heat / Risk Map               | Max/mean heat        |
|                               | Persistent hotspots  |
|                               | Top risk zone        |
+-------------------------------+----------------------+
| Priority Zones                                       |
| #1 ...  #2 ...  #3 ...                              |
+------------------------------------------------------+
| Available Resources                                  |
| Mobile Units [2] Water [3] Outreach [1]              |
| [Generate Deployment Plan]                           |
+------------------------------------------------------+
| AI Agent Plan + Evidence                             |
+------------------------------------------------------+
| Track 7 Analytics / Correlations                     |
+------------------------------------------------------+
```

## 14.2 Map layers

MVP map may support:

- heatmap layer,
- zone/risk layer,
- selected zone,
- recommended resource-deployment markers,
- cooling-relief locations only if reliable data is available.

Avoid clutter. One clear primary map is better than many incomplete layers.

## 14.3 Zone detail panel

On zone click:

```text
Zone ID
Risk score
Risk band
Mean / max heat
Persistence
Historical comparison
Demographic metrics
Cooling access metric if used
Source/date
```

## 14.4 Analytics panel

Track 7 panel should show:

- at least one scatter plot or clear correlation visualization,
- correlation coefficient,
- method,
- concise interpretation,
- data/sample notes.

## 14.5 Resource planner form

Inputs:

- mobile cooling units,
- water stations,
- outreach teams.

Validation:

- required numeric input,
- min = 0,
- integer,
- sensible maximum for demo safety/usability.

## 14.6 Agent evidence panel

For each recommendation show:

```text
Action
Zone
Risk score
Key factors
Data sources
Any limitation/warning
```

This is essential for auditability.

---

# 15. Backend Architecture

## 15.1 Suggested Next.js API routes

Initial target:

```text
POST /api/heatmap
GET  /api/heatmap/status/:id   (or server-side combined polling)
GET  /api/zones
GET  /api/analytics
POST /api/agent/plan
```

Exact route design may be simplified.

## 15.2 FortyGuard wrapper

Create one reusable server-only module.

Example conceptual structure:

```text
src/lib/fortyguard/
|-- client.ts
|-- heatmap.ts
|-- status.ts
|-- types.ts
`-- errors.ts
```

Responsibilities:

- attach secret API key,
- validate upstream response,
- normalize errors,
- bounded polling,
- never expose the key.

## 15.3 Bounded polling

Never create an endless loop.

Concept:

```text
max attempts
+ delay
+ terminal status handling
+ timeout
```

Handle:

- Processing,
- Completed,
- Failed,
- transient 404 if documented/observed,
- rate limit,
- timeout.

## 15.4 Caching

Repeated FortyGuard calls may consume credits.

For the hackathon, consider:

- saving completed development responses locally where permitted,
- using stable sample data for frontend development,
- avoiding a new expensive call on every page refresh,
- adding application-level cache only if simple and safe.

Never commit private credentials or restricted signed download URLs.

---

# 16. Suggested Internal Data Models

## 16.1 Zone

```ts
type Zone = {
  id: string;
  name: string;
  geometry: unknown;
};
```

Use a proper GeoJSON type library/type definition later if useful.

## 16.2 Heat metrics

```ts
type HeatMetrics = {
  zoneId: string;
  meanTemp: number | null;
  maxTemp: number | null;
  temperatureUnit: "C" | "F";
  persistenceScore?: number | null;
  exceedanceScore?: number | null;
  historicalDeviation?: number | null;
  dataTimestamp: string;
};
```

## 16.3 Vulnerability

```ts
type VulnerabilityMetrics = {
  zoneId: string;
  povertyRate?: number | null;
  age65PlusRate?: number | null;
  noVehicleRate?: number | null;
  compositeScore?: number | null;
  sourceYear: number | null;
};
```

## 16.4 Risk

```ts
type ZoneRisk = {
  zoneId: string;
  totalScore: number;
  band: "low" | "moderate" | "high" | "critical";
  components: {
    heatExposure: number;
    persistence: number;
    vulnerability: number;
    coolingAccessGap?: number;
  };
};
```

## 16.5 Resources

```ts
type ResourceInventory = {
  mobileCoolingUnits: number;
  waterStations: number;
  outreachTeams: number;
};
```

## 16.6 Allocation

```ts
type ResourceAllocation = {
  resourceType:
    | "mobile_cooling_unit"
    | "water_station"
    | "outreach_team";
  quantity: number;
  zoneId: string;
  reasons: string[];
};
```

---

# 17. Security and Secrets

## 17.1 Required environment files

`.env.local`:

```env
FORTYGUARD_API_KEY=REAL_SECRET
GEMINI_API_KEY=REAL_SECRET_IF_USED
```

`.env.example`:

```env
FORTYGUARD_API_KEY=
GEMINI_API_KEY=
```

## 17.2 Never commit secrets

Before every first push:

```bash
git status
git diff --cached
```

Confirm `.env.local` is absent.

## 17.3 Frontend rule

Never create:

```env
NEXT_PUBLIC_FORTYGUARD_API_KEY=...
```

A secret FortyGuard key must not be public.

## 17.4 Logging

Do not log:

- API keys,
- full authorization headers,
- temporary signed links,
- personal/sensitive data not needed for the project.

---

# 18. Repository Creation — Exact Starting Steps

## Step 1 — Create GitHub repository

Repository:

```text
coolcity-ai
```

Description:

```text
Autonomous urban heat-relief resource planner powered by hyperlocal temperature intelligence and AI.
```

Visibility:

```text
Public
```

If creating an empty repository first, do not initialize conflicting files if you intend to create the Next.js app locally in it.

## Step 2 — Clone

```bash
git clone https://github.com/YOUR_USERNAME/coolcity-ai.git
cd coolcity-ai
```

## Step 3 — Initialize Next.js

```bash
npx create-next-app@latest .
```

Recommended choices:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src directory: Yes
App Router: Yes
Import alias: Yes
React Compiler: No unless the team intentionally wants it
```

## Step 4 — Verify baseline

```bash
npm run dev
```

Then:

```bash
npm run lint
npm run build
```

## Step 5 — Initial commit

```bash
git add .
git commit -m "chore: initialize CoolCity AI project"
git push -u origin main
```

## Step 6 — Add documentation

Place:

```text
README.md
PROJECT_PLAN.md
```

at the repository root.

Commit:

```bash
git add README.md PROJECT_PLAN.md
git commit -m "docs: define CoolCity AI project scope and team plan"
git push
```

## Step 7 — Team reads plan

All three members read this file before coding.

Freeze disagreements before splitting into major features.

---

# 19. Git Branch Strategy

## 19.1 Initial branches

### Member 1

```bash
git checkout main
git pull
git checkout -b feat/fortyguard-api
```

### Member 2

```bash
git checkout main
git pull
git checkout -b feat/heat-analytics
```

### Member 3

```bash
git checkout main
git pull
git checkout -b feat/dashboard
```

## 19.2 Later agent branch

After real risk data exists:

```text
feat/agent-planner
```

## 19.3 Rules

- No long-lived unreviewed mega-branch.
- Pull latest `main` often.
- One logical purpose per PR.
- Never commit secrets.
- Run relevant tests before requesting review.
- Update documentation if behavior changes.

---

# 20. Three-Member Work Breakdown

# Member 1 — AI + Backend

## Phase A — FortyGuard proof

Tasks:

1. verify API key works,
2. create small Phoenix polygon,
3. submit one heatmap,
4. retrieve `activity_id`,
5. implement bounded status polling,
6. inspect `map_data`,
7. inspect `stats_data`,
8. save a sanitized example response/schema,
9. document actual behavior.

Deliverable:

> One reproducible real FortyGuard request with a completed result.

## Phase B — Backend API

Tasks:

- server-only client,
- typed models,
- input validation,
- error handling,
- API route for frontend,
- safe caching/reuse where appropriate.

## Phase C — Agent

Only after analytics exists:

- define tools,
- add structured schemas,
- integrate LLM,
- connect deterministic allocator,
- validate output,
- add evidence references.

---

# Member 2 — Data Science / Analytics

## Phase A — Data source

Tasks:

1. choose Census/ACS geography,
2. select variables,
3. download/query data,
4. document source year and fields,
5. clean data.

## Phase B — Spatial alignment

Tasks:

- align demographic areas with CoolCity zones,
- compute zone-level features,
- handle overlaps/missing values.

## Phase C — Track 7

Tasks:

- exploratory plots,
- descriptive statistics,
- Pearson/Spearman analysis,
- interpret results,
- document limitations.

## Phase D — Risk score

Tasks:

- normalize factors,
- calculate component scores,
- test initial weights,
- sensitivity check,
- export processed zone metrics.

---

# Member 3 — Frontend / Full Stack

## Phase A — UI with mock data

Build immediately with clearly labeled local mock data:

- dashboard shell,
- map container,
- risk cards,
- priority list,
- resource form,
- agent response layout.

## Phase B — Real map

After Member 1 provides heatmap schema:

- render GeoJSON,
- map tooltip,
- legend,
- loading/error state.

## Phase C — Real analytics

After Member 2 exports metrics:

- risk coloring,
- zone detail,
- correlation chart,
- source/date labels.

## Phase D — Agent UI

After Member 1 integrates agent:

- submit inventory,
- show plan,
- show allocation markers,
- evidence panel,
- warnings/errors.

---

# 21. Parallel Team Handoffs

## Handoff 1 — Backend to Frontend

Member 1 provides:

- response schema,
- TypeScript types,
- sample sanitized response,
- endpoint usage.

Member 3 should not reverse-engineer raw upstream responses in UI code.

## Handoff 2 — Analytics to Backend/Frontend

Member 2 provides:

```text
processed_zone_metrics.csv/json
data dictionary
methodology summary
risk score fields
correlation results
```

## Handoff 3 — Frontend to Team

Member 3 provides:

- list of data fields required by UI,
- mock schema early,
- visual acceptance screenshots.

---

# 22. Day-by-Day Execution Plan

Because the submission deadline is 30 August 2026, the team should prioritize integration over feature expansion.

## 24 August — Foundation

All:

- create repo,
- create Next.js project,
- add README/PROJECT_PLAN,
- agree on scope,
- create feature branches.

Member 1:

- first FortyGuard request.

Member 2:

- identify exact Census/ACS dataset and fields.

Member 3:

- dashboard wireframe/shell with mock data.

### Exit criteria

```text
repo works
docs committed
all branches exist
FortyGuard request attempted
data source selected
dashboard shell visible
```

## 25 August — Data Proof

Member 1:

- successful heatmap + status flow,
- normalize upstream response.

Member 2:

- clean demographic data,
- start zone design/spatial join.

Member 3:

- map component and priority cards.

### Exit criteria

Real heatmap payload can be inspected and frontend knows its contract.

## 26 August — Track 7 Core

Member 1:

- robust API route/error handling.

Member 2:

- zone metrics,
- correlation analysis,
- first risk score prototype.

Member 3:

- real/mock GeoJSON map,
- analytics UI.

### Exit criteria

At least one real correlation and zone risk table exist.

## 27 August — Integration

All:

- merge heat + analytics,
- resolve zone IDs/data contracts.

Member 1:

- deterministic allocation function.

Member 2:

- finalize/sensitivity-check risk scoring.

Member 3:

- real risk values on dashboard.

### Exit criteria

Without AI, the app can already answer:
"Which zones have the highest evidence-based risk?"

## 28 August — Track 6 Agent

Member 1:

- agent tools,
- structured output,
- tool calls.

Member 2:

- validate explanations against metrics.

Member 3:

- resource input + agent plan UI.

### Exit criteria

Agent generates a valid plan without exceeding inventory.

## 29 August — Testing + Deployment

All:

- end-to-end testing,
- fix integration issues,
- source labels,
- accessibility,
- responsiveness,
- deploy Vercel,
- configure environment variables,
- production smoke test.

### Exit criteria

Public URL demonstrates full flow.

## 30 August — Submission Day

No major new architecture.

Tasks:

- final production test,
- demo data pre-check,
- verify secrets,
- update README,
- screenshots/video if required,
- final pitch,
- final submission well before deadline.

---

# 23. First FortyGuard API Experiment

The first experiment should answer technical questions, not build the product.

## Goal

Retrieve one completed heatmap for a small Phoenix AOI.

## Record these details

```text
request timestamp
AOI
date/time
filter_type
granularity
HTTP response
activity_id
poll duration
final status
map_data keys
stats_data keys
temperature unit
tile geometry structure
credit usage if visible
errors/warnings
```

## Questions to answer

1. Does the hackathon key authenticate?
2. What plan/access does it expose?
3. What exact granularity values does this API version accept?
4. What is the exact temperature field name inside GeoJSON?
5. What unit is returned?
6. How long does a typical request take?
7. What does Processing look like?
8. What does Completed look like?
9. Are persistence/exceedance modes available with the key?
10. How many credits does a chosen request consume?
11. What Phoenix AOI size is practical?
12. Can completed responses be reused during development?

Update this file when those answers are known.

---

# 24. API Error Handling

Backend should map failures into useful application errors.

Potential upstream cases from current docs include:

```text
400 / 422 -> invalid request/validation
401       -> invalid or missing API key
403       -> access/plan restriction
404       -> task not found / possible temporary status condition
429       -> rate limit
500       -> upstream processing failure
```

Frontend should receive safe messages such as:

```text
Heat data could not be generated for this request.
Please try a smaller area or another time.
```

Do not expose raw secrets or unnecessary upstream internals to users.

---

# 25. Credit-Aware Development

FortyGuard requests can consume credits on successful completion.

Rules:

- use small AOIs during development,
- do not regenerate the same heatmap on every hot reload,
- use mock/sanitized cached data for UI work,
- coordinate team requests,
- record expensive batch experiments,
- only run large historical batches after the sampling strategy is agreed.

Member 1 should be the primary owner of live API-call discipline.

---

# 26. Data Freshness and Labels

Every displayed metric should identify context.

Examples:

```text
Temperature time: 2026-08-xx 14:00 local
Historical period: 2021-2026 sample
Demographic source: ACS [year]
```

Do not present demographic data and live temperature as if both were collected at the same time.

---

# 27. Evidence and Auditability

Every agent recommendation should link back to structured evidence.

Conceptual record:

```json
{
  "zoneId": "PHX-Z04",
  "riskScore": 86,
  "evidence": [
    {
      "type": "heat",
      "metric": "heatExposureScore",
      "value": 94,
      "source": "FortyGuard"
    },
    {
      "type": "demographic",
      "metric": "vulnerabilityScore",
      "value": 75,
      "source": "U.S. Census/ACS"
    }
  ]
}
```

The LLM explanation should be based on this object.

---

# 28. Agent Prompting Principles

System-level instructions for the agent should enforce:

- use tools for factual heat/risk data,
- never guess missing values,
- never exceed inventory,
- state uncertainty,
- explain tradeoffs,
- distinguish data from interpretation,
- keep outputs operational and concise,
- return structured results.

Do not put secret API keys or raw hidden system information into prompts.

---

# 29. UI States

Every major panel needs:

## Loading

Example:

```text
Generating heat intelligence...
```

## Error

Example:

```text
Heat data is temporarily unavailable.
```

## Empty

Example:

```text
Select a valid study period to view zone risk.
```

## Success

Show data timestamp/source.

Never leave a blank panel that looks broken.

---

# 30. Accessibility

Minimum expectations:

- semantic headings,
- form labels,
- keyboard-operable controls,
- visible focus states,
- map information available in a non-map list/table,
- meaningful chart text/summary,
- sufficient contrast,
- resource recommendations not communicated only through color.

---

# 31. Responsive Design

Desktop is the main hackathon demo.

Still ensure:

- cards stack on smaller screens,
- tables can scroll or convert cleanly,
- controls remain usable,
- evidence text is readable,
- no horizontal layout breakage.

Do not spend excessive time on advanced mobile interactions before the desktop demo works.

---

# 32. Testing Plan

# 32.1 FortyGuard client tests

Test:

- missing environment variable,
- successful task submission,
- invalid request,
- Processing,
- Completed,
- Failed,
- timeout,
- upstream non-JSON/malformed data where practical.

# 32.2 Risk scoring tests

Given fixed inputs, output must be deterministic.

Test:

- minimum values,
- maximum values,
- equal values,
- missing optional component,
- invalid score,
- weight sum validation.

# 32.3 Allocation tests

Examples:

### Case A

Inventory:

```text
mobile = 2
```

Output:

```text
total mobile allocated <= 2
```

### Case B

Inventory:

```text
all resources = 0
```

Expected:

```text
no allocation
clear explanation
```

### Case C

Only one valid zone.

No resource may be allocated to an invalid ID.

# 32.4 Agent tests

Check:

- calls tools,
- uses returned numbers,
- does not fabricate risk,
- produces valid JSON/schema,
- handles zero inventory,
- handles missing analytics,
- explanation matches allocation.

# 32.5 Frontend tests

Manual/automated as time allows:

- form validation,
- map renders,
- table matches map,
- agent loading state,
- upstream error display,
- mobile layout,
- keyboard navigation.

# 32.6 Production smoke test

After Vercel deployment:

```text
home loads
heat data route works
map displays
analytics display
resource form submits
agent plan returns
refresh works
no API key appears in browser/network response
```

---

# 33. Definition of Done by Track

## Track 7 complete when

- real FortyGuard temperature data is used,
- non-weather data is joined,
- correlation is calculated and explained,
- methodology is documented,
- zone risk scores are reproducible.

## Track 6 complete when

- a natural-language/user goal can start a planning workflow,
- agent calls tools,
- tools return real structured data,
- deterministic constraints control allocation,
- final output is explainable/auditable.

---

# 34. Demo Script

Target demo length: short enough for a judge to follow without setup confusion.

## Scene 1 — Problem

> Phoenix heat-response teams may have fewer mobile resources than high-risk locations.

## Scene 2 — Heat intelligence

Show the study area.

Explain:

> FortyGuard gives us hyperlocal temperature intelligence instead of one city-wide weather number.

## Scene 3 — Track 7

Show:

- zone metrics,
- demographic variable,
- correlation,
- risk ranking.

Explain:

> We combine heat exposure with non-weather vulnerability data and quantify the relationship.

## Scene 4 — Resource constraint

Enter:

```text
2 mobile cooling units
3 water stations
1 outreach team
```

## Scene 5 — Track 6

Click:

```text
Generate Deployment Plan
```

Show the agent's tool-driven result.

## Scene 6 — Evidence

Click top zone.

Show:

- risk score,
- heat evidence,
- persistence,
- vulnerability,
- access factor if used,
- sources.

## Scene 7 — Commercial value

Close with:

> CoolCity AI helps a city convert heat intelligence into an auditable operational decision.

---

# 35. Pitch

## One sentence

> CoolCity AI combines hyperlocal temperature intelligence with demographic vulnerability analysis and a tool-using AI agent to help cities rank heat-risk zones and allocate limited cooling resources where they are needed most.

## 20-second version

> Cities often know it is hot, but they still need to decide where scarce heat-relief resources should go. CoolCity AI combines FortyGuard's hyperlocal heat data with demographic vulnerability analysis to score and rank Phoenix zones. A tool-using AI agent then turns those scores and a city's available resource inventory into an explainable deployment plan.

## Key differentiation

We are not building:

> another heatmap.

We are building:

> **heat intelligence -> quantified risk -> constrained operational action.**

---

# 36. Commercialization Story

Potential customers:

- city heat-response offices,
- emergency-management teams,
- resilience offices,
- public-health operations teams,
- organizations operating heat-relief networks.

Potential value:

- faster prioritization,
- repeatable evidence,
- transparent ranking,
- resource-scarcity planning,
- auditability,
- scenario planning.

Future commercial features could include:

- multiple cities,
- recurring portfolio monitoring,
- scheduled alerts,
- integration with asset-management systems,
- role-based access,
- scenario budgets,
- reporting,
- operational history,
- configurable risk policy.

These are future ideas, not hackathon MVP commitments.

---

# 37. Limitations We Must State

The final product should disclose:

- hackathon prototype,
- study area is limited,
- risk weights may be heuristic,
- demographic data may be from a different year than temperature data,
- correlation does not prove causation,
- not a medical/emergency dispatch system,
- not a replacement for local officials or field observations,
- API/model uncertainty exists,
- data gaps may affect rankings,
- deployment recommendations require human judgment.

---

# 38. Out of Scope

Do not add during MVP unless all core requirements are done:

- nationwide coverage,
- multi-city production onboarding,
- real dispatch integration,
- SMS/email alert system,
- advanced custom ML forecast model,
- native mobile app,
- complete digital twin,
- automatic purchase/procurement,
- real-time IoT network,
- full 3D city simulation,
- complex authentication/roles,
- every possible demographic variable.

---

# 39. Stretch Features

Priority order if time remains:

1. **12-hour proactive plan**
2. **Exportable heat-response memo**
3. **Risk-weight sensitivity control**
4. **Existing relief-site access overlay**
5. **Historical trend comparison**
6. **Scenario A vs Scenario B allocation**

Do not start a stretch feature until the MVP demo works end-to-end.

---

# 40. Project Folder Plan

Target:

```text
coolcity-ai/
|
|-- README.md
|-- PROJECT_PLAN.md
|-- .env.example
|-- .gitignore
|-- package.json
|-- next.config.*
|
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- heatmap/
|   |   |   |-- analytics/
|   |   |   `-- agent/
|   |   |-- globals.css
|   |   `-- page.tsx
|   |
|   |-- components/
|   |   |-- map/
|   |   |-- analytics/
|   |   |-- resources/
|   |   |-- agent/
|   |   `-- ui/
|   |
|   |-- lib/
|   |   |-- fortyguard/
|   |   |-- analytics/
|   |   |-- agent/
|   |   `-- allocation/
|   |
|   |-- data/
|   `-- types/
|
|-- analysis/
|   |-- notebooks/
|   |-- scripts/
|   `-- data/
|
|-- docs/
`-- public/
```

Do not create every empty directory on day one.

---

# 41. Coding Standards

- TypeScript strict enough to catch contract mistakes.
- Avoid `any` around external API data.
- Validate external JSON before trusting it.
- Functions should have one clear responsibility.
- No duplicated risk formula in frontend and backend.
- Shared types where appropriate.
- Keep source attribution near data transformations.
- Prefer readable code over premature abstraction.
- Remove dead demo data when real integration is complete.

---

# 42. PR Review Checklist

Before merge:

- [ ] Scope matches the issue/task.
- [ ] No secret is committed.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Relevant tests pass.
- [ ] Data schema changes are documented.
- [ ] New external fields include source information.
- [ ] Agent changes do not move hard constraints into free-form LLM text.
- [ ] UI handles loading/error/empty states.
- [ ] README/PROJECT_PLAN updated if behavior/scope changed.
- [ ] Reviewer can understand how to test the change.

---

# 43. Data Contract Freeze Point

Do not freeze final frontend/backend interfaces before the first real FortyGuard payload is inspected.

After that experiment:

1. document upstream fields,
2. define internal normalized types,
3. keep the raw API shape inside the FortyGuard adapter,
4. expose a stable CoolCity-specific shape to the rest of the app.

This prevents the whole application from depending directly on an upstream schema.

---

# 44. Recommended Architecture Decision Record

For this short hackathon, do not create many architecture documents.

Record important decisions in this file under a simple section:

## Decision Log

### D-001 — City

**Decision:** Phoenix, Arizona  
**Status:** Frozen  
**Reason:** Strong real-world municipal heat-response use case and U.S. requirement.

### D-002 — Tracks

**Decision:** Track 6 + Track 7  
**Status:** Frozen

### D-003 — LLM responsibility

**Decision:** LLM does orchestration/explanation; deterministic code owns math and constraints.  
**Status:** Frozen  
**Reason:** Auditability and reliability.

### D-004 — Exact AOI

**Status:** Open  
**Close when:** real FortyGuard key is tested and practical request area is known.

### D-005 — Risk weights

**Status:** Prototype only  
**Close when:** analytics member performs sensitivity review.

### D-000 — Official Hackathon Foundation

**Decision:** CoolCity AI will be built on the official FortyGuard Temperature API and official `temperature-api-quickstart` repository provided by the hackathon organizers.  
**Status:** Frozen  
**Reason:** This is the official hackathon-provided starting infrastructure.

### D-006 — Cooling access dataset

**Status:** Open  
**Close when:** a reliable and usable public dataset is confirmed.

---

# 45. Source References

## FortyGuard

- Introduction: https://docs-api.fortyguard.com/
- Quickstart: https://docs-api.fortyguard.com/docs/quickstart
- Create Heatmap: https://docs-api.fortyguard.com/docs/create-heatmap
- Known Limitations: https://docs-api.fortyguard.com/docs/limitations
- Release Notes: https://docs-api.fortyguard.com/docs/release-notes

## Phoenix

- City heat resources: https://www.phoenix.gov/heat
- The team should use the current official Phoenix heat-response documents when citing city programs in the final presentation.

## Demographics

- U.S. Census: https://www.census.gov/
- Census APIs: https://api.census.gov/data.html

---

# 46. Immediate Next Actions

After this file is added to the repository:

## All members

1. Read `README.md`.
2. Read this entire file.
3. Agree that the MVP is frozen.
4. Create the Next.js baseline if not already created.
5. Commit and push documentation.
6. Create feature branches.

## Member 1

**Do not start the AI agent.**

First:

> Make one real small Phoenix FortyGuard heatmap request and inspect the exact completed response.

## Member 2

Start:

> Select and document the Census/ACS variables and geographic level that can be joined to the planned study area.

## Member 3

Start:

> Build the dashboard shell with explicit mock types matching the planned internal data contract, not raw FortyGuard JSON.

---

# 47. Final Team Rule

When a new idea appears, do **not** immediately build it.

Ask:

```text
Does this directly improve:
1. heat understanding,
2. correlation/risk quantification,
3. resource allocation,
4. agent auditability,
or
5. the final judge demo?
```

If not, move it to future scope.

The project wins by making one workflow work extremely well:

```text
Hyperlocal heat
      +
Vulnerability evidence
      |
      v
Quantified zone risk
      |
      v
Limited resources
      |
      v
Tool-using agent
      |
      v
Valid allocation
      |
      v
Clear explanation
```

That is **CoolCity AI**.
