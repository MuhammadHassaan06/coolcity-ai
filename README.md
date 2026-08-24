# CoolCity AI

**Autonomous Heat-Relief Resource Planner for Phoenix, Arizona**

CoolCity AI is a hackathon project that combines **FortyGuard's hyperlocal temperature intelligence**, **public demographic/socioeconomic data**, **data analysis and correlation**, and an **AI agent** to help city heat-response teams decide where limited cooling resources should be deployed first.

The project is designed for the FortyGuard challenge and combines:

- **Track 6 — Agentic Track (API + Agentic)**
- **Track 7 — Data Analysis & Correlation**

> Core idea: **Track 7 understands and quantifies the heat problem; Track 6 turns that evidence into an explainable resource-allocation decision.**

---

## 1. Project Status

This repository is the shared source of truth for a **3-member team**.

### Current frozen decisions

- **Project name:** CoolCity AI
- **Primary city:** Phoenix, Arizona, USA
- **Primary customer:** Municipal heat-response / emergency-management teams
- **Selected tracks:** Track 6 + Track 7
- **Core product:** Hyperlocal heat-risk analysis + autonomous cooling-resource allocation
- **Temperature source:** Official FortyGuard Temperature API provided by the hackathon organizers
- **Starter repository:** Official FortyGuard Temperature API Quickstart repository provided by the hackathon organizers
- **Demographic source:** U.S. Census / ACS or another suitable U.S. public demographic dataset
- **Frontend/backend:** Next.js + TypeScript
- **Data analysis:** Python + Pandas; SciPy/GeoPandas only where useful
- **Map:** Leaflet / React Leaflet
- **Charts:** Recharts
- **AI layer:** Tool-using LLM agent (Gemini is the initial preferred option)
- **Deployment:** Vercel
- **Version control:** GitHub with feature branches and pull requests

### Decisions that must be validated before final implementation

- Exact Phoenix area-of-interest polygon
- Exact number and boundaries of analysis zones
- The team's actual FortyGuard API plan and available endpoint limits
- Exact formula/weights for the CoolCity Risk Score
- Exact public dataset used for cooling/heat-relief locations
- Exact demographic variables retained after data-quality checks
- Whether 12-hour forecast data is included in the final MVP or treated as a stretch feature

Do not silently convert any of these open decisions into permanent implementation assumptions. Validate them first and update `PROJECT_PLAN.md`.

---

## 2. The Problem

Cities face extreme-heat conditions across neighborhoods that can differ significantly even over short distances. At the same time, a heat-response team may have limited resources such as:

- mobile cooling units,
- temporary hydration/water stations,
- outreach teams,
- transportation/support teams,
- temporary cooling capacity,
- or other deployable heat-relief resources.

Those resources cannot be sent everywhere at the same time.

A city therefore needs a defensible answer to:

> **Which locations should receive limited heat-relief resources first, and why?**

CoolCity AI converts temperature and vulnerability evidence into a ranked, auditable deployment plan.

---

## 3. Why Phoenix?

Phoenix is the initial city because extreme heat is already a major operational and public-health issue there. The City of Phoenix maintains a formal Heat Response Plan that includes publicly accessible cool space and drinking water, heat-safe mobility, worker heat-safety measures, outreach, and other heat-response strategies.

CoolCity AI is **not an official City of Phoenix system** and must never be presented as one. Phoenix is the hackathon study geography and the city heat-response team is the proposed client persona.

---

## 4. What FortyGuard Gives Us

FortyGuard does **not** directly decide where city resources should go. It supplies high-resolution temperature intelligence that our product uses as evidence.

The current API documentation describes heatmap generation using:

- a GeoJSON polygon area of interest,
- date/time inputs,
- supported heatmap granularity,
- API-key authentication,
- asynchronous processing,
- GeoJSON heatmap output,
- and temperature statistics.

### Basic heatmap workflow

```text
CoolCity backend
      |
      v
POST /v1/heatmap
      |
      v
FortyGuard returns activity_id
      |
      v
GET /v1/status/{activity_id}
      |
      +---- Processing -> poll again with a safe bound
      |
      +---- Completed -> read result
      |
      +---- Failed -> stop and record error
                    |
                    v
             map_data + stats_data
```

The heatmap can provide the spatial temperature layer that powers our map and risk analysis.

FortyGuard should be called **server-side only** so the API key is never exposed to browser code.

---

## 4A. What the Hackathon Provides vs What We Build

### Provided by the FortyGuard hackathon team

The organizers provide the core temperature-intelligence infrastructure:

- Official FortyGuard Temperature API
- Hackathon participant API key/access
- Official Temperature API documentation
- Official `temperature-api-quickstart` GitHub repository
- Sample code/notebooks for learning how to call the API

### Built by the CoolCity AI team

Our project value comes from what we build **on top of** those official resources:

- Phoenix study-area design
- Zone aggregation and data preparation
- Historical heat analytics
- Demographic/socioeconomic data integration
- Track 7 correlation analysis
- CoolCity Risk Score
- Priority-zone ranking
- Deterministic resource-allocation logic
- Track 6 tool-using AI agent
- Explainable recommendations and evidence
- Dashboard, map, charts, and resource-planning UI
- Testing, deployment, and final commercialization story

This distinction must remain clear in the final submission and presentation.

---

## 5. Product Concept

CoolCity AI follows this end-to-end workflow:

```text
FortyGuard temperature data
          +
Historical heat metrics
          +
Demographic vulnerability data
          +
Existing heat-relief / cooling coverage
          |
          v
Data cleaning and spatial alignment
          |
          v
Track 7 analysis and correlations
          |
          v
Normalized zone-level metrics
          |
          v
CoolCity Risk Score
          |
          v
Ranked high-risk zones
          |
          v
Track 6 AI agent
          |
          +--> reads resource inventory
          +--> calls approved tools
          +--> retrieves real zone evidence
          +--> creates allocation plan
          |
          v
Explainable deployment recommendation
```

---

## 6. Example User Scenario

A Phoenix heat-response operator opens CoolCity AI.

The dashboard shows:

- a Phoenix study-area heatmap,
- current/selected-time temperatures,
- historical heat metrics,
- zone risk scores,
- demographic vulnerability indicators,
- existing heat-relief coverage,
- and ranked priority zones.

The operator enters:

```text
Available resources:
- 2 mobile cooling units
- 3 water stations
- 1 outreach team
```

The agent may return:

```text
Priority 1: Zone B
Recommended action: Deploy 1 mobile cooling unit + outreach team

Priority 2: Zone C
Recommended action: Deploy 1 mobile cooling unit

Water stations:
Allocate to the highest uncovered high-risk zones.
```

Every recommendation must be supported by actual tool/data output. The LLM must not invent temperatures, risk scores, demographic values, or resource locations.

---

## 7. Track 7 — Data Analysis & Correlation

Track 7 is responsible for **measuring and explaining** the heat problem.

Possible zone-level variables include:

### Heat variables

- selected-hour temperature,
- mean temperature,
- peak/max temperature,
- heat persistence,
- threshold exceedance,
- historical average,
- historical percentile/rank,
- deviation from historical baseline,
- number/density of hot tiles.

### Non-weather variables

Candidate U.S. Census / ACS indicators:

- total population,
- poverty rate,
- age 65+ share,
- selected household vulnerability indicators,
- no-vehicle household share where available and appropriate.

### Cooling-access variables

Where reliable public data is available:

- distance to nearest cooling/heat-relief site,
- number of relief sites in/near a zone,
- whether a high-risk zone has nearby cooling access,
- resource/service coverage gap.

### Analysis outputs

- cleaned zone-level dataset,
- descriptive statistics,
- visual distributions,
- correlation matrix,
- Pearson or Spearman correlations as appropriate,
- interpretation that clearly states **correlation does not prove causation**,
- normalized input features for risk scoring.

---

## 8. Track 6 — Agentic AI

Track 6 turns the analytical evidence into an operational plan.

The agent should use explicit tools rather than making unsupported guesses.

Candidate tools:

```text
getZoneHeatData()
getHistoricalHeatMetrics()
getZoneVulnerability()
getCoolingCoverage()
getZoneRiskScores()
getResourceInventory()
rankPriorityZones()
allocateResources()
```

Expected agent loop:

```text
Observe
   |
   v
Determine what evidence is required
   |
   v
Call approved tools
   |
   v
Receive structured data
   |
   v
Rank / allocate using deterministic constraints
   |
   v
Explain the decision
```

The strongest implementation keeps **scientific calculations and hard constraints deterministic** while using the LLM for planning, tool selection, synthesis, and explanation.

---

## 9. CoolCity Risk Score

The risk score is a project-defined decision-support score, **not an official FortyGuard, City of Phoenix, medical, or emergency-management score**.

Initial candidate model:

```text
Risk =
  Heat Exposure
+ Heat Persistence
+ Demographic Vulnerability
+ Cooling Access Gap
```

An early prototype may test weights such as:

```text
40% heat exposure
25% persistence
25% demographic vulnerability
10% cooling access gap
```

These are **initial product-design weights only**. They must be validated, sensitivity-tested, documented, and changed if the data suggests a better approach.

Example presentation:

```text
0-39   Low
40-59  Moderate
60-79  High
80-100 Critical
```

The UI must show the underlying factors so a user can see why a zone received its score.

---

## 10. MVP Features

The hackathon MVP is intentionally focused.

### Required MVP

1. **Phoenix study-area heatmap**
2. **FortyGuard API integration**
3. **Historical/current heat analytics**
4. **Demographic vulnerability layer**
5. **Track 7 correlation analysis**
6. **Zone-level CoolCity Risk Score**
7. **Ranked priority-zone table**
8. **Resource inventory input**
9. **Tool-using AI resource-allocation agent**
10. **Explainable recommendation/evidence panel**
11. **Error/loading/empty states**
12. **Source attribution**
13. **Deployed public demo**
14. **Clear README and project documentation**

### Stretch features

- up to 12-hour proactive heat planning if supported by the team's FortyGuard access and time,
- scenario comparison,
- exportable decision memo,
- richer cooling-access analysis,
- sensitivity controls for risk-score weights,
- more than one Phoenix study area.

---

## 11. Out of Scope

For the MVP, do **not** attempt:

- all U.S. cities,
- the entire Phoenix metro at maximum resolution,
- real emergency dispatch,
- automatic contact with first responders,
- medical diagnosis or personal-health advice,
- physical simulation of how a cooling intervention will lower real temperature,
- production-grade municipal procurement workflows,
- a mobile native application,
- a large custom machine-learning model if simple statistical analysis is sufficient,
- unsupported claims that the system will prevent deaths or guarantee safety.

CoolCity AI is a **decision-support prototype**.

---

## 12. High-Level Architecture

```text
                         USER
                          |
                          v
                 Next.js Web Dashboard
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
     Heatmap API      Analytics API      Agent API
          |               |                |
          v               v                v
      FortyGuard     Prepared datasets   Tool layer
                          |                |
                          v                v
                    Risk calculations  Allocation logic
                          \                /
                           \              /
                            v            v
                         Structured result
                              |
                              v
                   Map + Charts + Evidence
```

### Recommended principle

- **Frontend:** visualization and interaction
- **Backend:** secure API calls and orchestration
- **Python analysis:** data cleaning, statistical analysis, reproducible preprocessing
- **Deterministic code:** risk calculations and allocation constraints
- **LLM agent:** tool planning, orchestration, synthesis, and human-readable explanation

---

## 13. Repository Structure

Target structure:

```text
coolcity-ai/
|
|-- README.md
|-- PROJECT_PLAN.md
|-- .env.example
|-- .gitignore
|-- package.json
|
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- heatmap/
|   |   |   |-- analytics/
|   |   |   `-- agent/
|   |   `-- page.tsx
|   |
|   |-- components/
|   |   |-- map/
|   |   |-- dashboard/
|   |   |-- analytics/
|   |   |-- resources/
|   |   `-- agent/
|   |
|   |-- lib/
|   |   |-- fortyguard/
|   |   |-- analytics/
|   |   |-- agent/
|   |   `-- data/
|   |
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

Create directories only when they are needed. Avoid empty architecture for architecture's sake.

---

## 14. Environment Variables

`.env.local`:

```env
FORTYGUARD_API_KEY=your_real_key
GEMINI_API_KEY=your_real_key_if_used
```

`.env.example`:

```env
FORTYGUARD_API_KEY=
GEMINI_API_KEY=
```

Rules:

- Never commit `.env.local`.
- Never paste real keys into documentation.
- Never use `NEXT_PUBLIC_` for secret API keys.
- Never call FortyGuard directly from client-side browser code.
- Rotate a key immediately if it is accidentally committed or shared.

---

## 15. Team Responsibilities

### Member 1 — AI + Backend

Owns:

- FortyGuard integration,
- server-side API wrappers,
- polling/task handling,
- typed responses,
- agent tools,
- LLM agent orchestration,
- deterministic resource-allocation constraints,
- backend tests,
- API/security integration.

Suggested branch:

```text
feat/fortyguard-api
```

Later:

```text
feat/agent-planner
```

### Member 2 — Data Science / Analytics

Owns:

- demographic dataset selection,
- data cleaning,
- geographic alignment,
- exploratory analysis,
- historical heat metrics,
- correlation analysis,
- risk-feature normalization,
- risk-score validation/sensitivity analysis,
- processed dataset/export,
- methodology documentation.

Suggested branch:

```text
feat/heat-analytics
```

### Member 3 — Frontend / Full Stack

Owns:

- dashboard layout,
- map,
- heatmap rendering,
- charts,
- priority cards/table,
- resource form,
- agent result panel,
- loading/error/empty states,
- responsiveness,
- accessibility,
- final visual polish.

Suggested branch:

```text
feat/dashboard
```

All members review integration PRs.

---

## 16. Git Workflow

Protect `main` conceptually even if GitHub branch protection is not configured.

```text
main
 |
 +-- feat/fortyguard-api
 +-- feat/heat-analytics
 +-- feat/dashboard
 +-- feat/agent-planner
```

Workflow:

```text
Pull latest main
-> create/update feature branch
-> make one logical change
-> test
-> commit
-> push
-> open PR
-> teammate review
-> merge
-> everyone pulls latest main
```

Prefer small commits such as:

```text
chore: initialize CoolCity AI project
docs: define project scope and team plan
feat: add FortyGuard heatmap client
feat: add bounded task-status polling
feat: add Phoenix heatmap visualization
feat: prepare demographic analysis dataset
feat: calculate zone risk scores
feat: add resource allocation agent
test: cover risk scoring and allocation rules
docs: add demo and methodology notes
```

---

## 17. Development Order

Do not start with the LLM.

```text
1. Repo + Next.js baseline
2. Documentation
3. One real FortyGuard request
4. Store/inspect returned GeoJSON + statistics
5. Render real heatmap
6. Build Track 7 analysis pipeline
7. Produce real zone-level risk scores
8. Integrate scores into dashboard
9. Add deterministic resource-allocation logic
10. Wrap tools with the AI agent
11. Add explainability/evidence panel
12. Test end-to-end
13. Deploy
14. Rehearse demo
```

---

## 18. First Technical Milestone

The first technical milestone is intentionally small:

> **Generate one real FortyGuard heatmap for a small Phoenix polygon and successfully retrieve the completed result.**

Success means the team can demonstrate:

```text
POST /v1/heatmap
-> activity_id
-> bounded status polling
-> Completed
-> map_data
-> stats_data
```

Do not build the final agent before this works.

---

## 19. Testing Expectations

### Backend

- missing API key,
- invalid request body,
- FortyGuard 401/403/4xx handling,
- processing status,
- completed status,
- failed status,
- bounded polling timeout,
- malformed upstream result.

### Analytics

- missing values,
- duplicate rows,
- invalid coordinates,
- normalization edge cases,
- correlation method assumptions,
- stable risk-score output,
- sensitivity to weight changes.

### Frontend

- loading state,
- API error state,
- no-data state,
- map rendering,
- resource-form validation,
- keyboard access,
- responsive layout.

### Agent

- does not invent tool results,
- handles insufficient resources,
- handles zero resources,
- respects resource counts,
- references the same risk data shown by the UI,
- produces a clear explanation,
- returns a machine-readable structured result where possible.

---

## 20. Definition of Done

The MVP is complete when:

- a real Phoenix FortyGuard heatmap loads,
- at least one historical/analytical heat metric is used,
- at least one meaningful non-weather dataset is joined,
- Track 7 correlation results are reproducible,
- every zone can receive a documented risk score,
- the dashboard ranks zones,
- the user can enter a limited resource inventory,
- the Track 6 agent calls tools and returns a valid allocation,
- allocation never exceeds available resource counts,
- each recommendation includes evidence,
- secrets stay server-side,
- the app is deployed,
- README and project plan are current,
- the team can demonstrate the entire flow without manually editing data mid-demo.

---

## 21. Challenge Context

- **Build window:** 18–30 August 2026
- **Submission deadline:** 30 August 2026, 11:59 PM GST (UTC+4)
- **Team size:** 1–3
- **Coverage:** U.S. locations only
- **Challenge data range:** 1 January 2021 to present
- **Forecast concept:** up to 12 hours ahead where supported
- **Commercialization expectation:** solve a genuine client problem, not just produce a heatmap demo

For the hackathon submission, keep analyses within the challenge-stated 2021-to-present window even if the API itself supports earlier dates.

---

## 22. External References

FortyGuard documentation:

- https://docs-api.fortyguard.com/
- https://docs-api.fortyguard.com/docs/quickstart
- https://docs-api.fortyguard.com/docs/create-heatmap
- https://docs-api.fortyguard.com/docs/limitations
- https://docs-api.fortyguard.com/docs/release-notes

Phoenix:

- https://www.phoenix.gov/heat

Public demographic data:

- https://www.census.gov/
- https://api.census.gov/data.html

---

## 23. One-Sentence Pitch

> **CoolCity AI combines hyperlocal temperature intelligence with demographic vulnerability analysis and a tool-using AI agent to help cities rank heat-risk zones and allocate limited cooling resources where they are needed most.**

---

## 24. Team Rule

Before implementing a major change, ask:

1. Does it improve the core resource-allocation decision?
2. Does it strengthen Track 6 or Track 7?
3. Can we demonstrate it reliably before the deadline?
4. Is it supported by real data rather than an invented value?

If the answer is no, it is probably outside the MVP.

For detailed implementation decisions, methodology, data contracts, schedule, role handoffs, and acceptance criteria, read **`PROJECT_PLAN.md`**.
