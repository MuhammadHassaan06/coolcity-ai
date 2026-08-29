# Track 7 → Frontend Handoff Document
**From:** Member 2 (Data Analytics / Track 7)
**To:** Member 1 (Frontend / AI Agent)
**Date:** 2026-08-29
**Branch:** `feat/final-integration`
**Status:** ✅ Full-City Complete (359 Census Tracts, 121,892 thermal features inside Phoenix boundary, 11-character GEOIDs)

---

## 1. Canonical Processed Handoff Artifacts

### Core Handoff Files (in `data/processed/` & synced to `web/src/data/track7/`)

| File | Records | Format | Primary Use Case |
|:---|:---:|:---|:---|
| `phoenix_tract_risk.json` | 359 | Array of JSON objects (~85 KB) | **Canonical Frontend Dashboard Priority Zone Input** |
| `phoenix_tract_risk.csv` | 359 | Flat CSV (~32 KB) | Tabular analytics inspection & export |
| `correlation_summary.json` | 12 | JSON summary (~4.3 KB) | Machine-readable tract-level statistical correlations |
| `sensitivity_summary.json` | 3 scenarios | JSON summary (~2.1 KB) | Weighting sensitivity & ranking stability report |
| `track7_summary.json` | Metadata | JSON summary (~1.1 KB) | Track 7 master pipeline status & coverage metadata |

---

## 2. Canonical JSON Handoff Contract (`phoenix_tract_risk.json`)

Matches `PriorityZoneModel` in `web/src/types/dashboard.ts`:

```json
[
  {
    "id": "tract-04013114900",
    "code": "04013114900",
    "name": "Census Tract 1149",
    "geoid": "04013114900",
    "riskScore": 73.15,
    "status": "high",
    "avgTemperature": 39.81,
    "affectedPopulation": 3412
  },
  {
    "id": "tract-04013113900",
    "code": "04013113900",
    "name": "Census Tract 1139",
    "geoid": "04013113900",
    "riskScore": 72.84,
    "status": "high",
    "avgTemperature": 39.75,
    "affectedPopulation": 1532
  }
]
```

---

## 3. Quick Reference for Frontend Integration

```javascript
// Risk level → color mapping
const RISK_COLORS = {
  "low":      "#22c55e",  // Green
  "moderate": "#eab308",  // Yellow
  "high":     "#f97316",  // Orange
  "critical": "#ef4444",  // Red
};

// Score thresholds
const RISK_THRESHOLDS = {
  LOW:      { min: 0,    max: 24.99 },
  MODERATE: { min: 25,   max: 49.99 },
  HIGH:     { min: 50,   max: 74.99 },
  CRITICAL: { min: 75,   max: 100   },
};
```
