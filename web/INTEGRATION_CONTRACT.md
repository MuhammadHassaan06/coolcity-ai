# CoolCity AI Frontend Integration Contract

## 1. Purpose

This document provides a technical handoff specification for **Member 1** (Backend / FortyGuard / Track 6 Agent) and **Member 2** (Track 7 Analytics) to integrate live API and model outputs into the CoolCity AI operational dashboard (`web/`).

- **Live Data Mode**: The current dashboard operates in Live Data Mode using full-city Phoenix Census Tract analytics synced directly from FortyGuard snapshot ingestion.
- **Decoupled Architecture**: All UI components are decoupled from raw backend data through the frontend access boundary `web/src/lib/dataAdapter.ts`.
- **Adaptation Layer Pattern**: Raw analytics outputs are served via stable frontend display models inside `dataAdapter.ts`.

---

## 2. Current Data Flow

```text
web/src/data/track7/phoenix_tract_risk.json (Full-City 359 Census Tract Records)
       ↓
web/src/lib/dataAdapter.ts (Synchronous Adapter Boundary)
       ↓
web/src/components/Dashboard.tsx (Top-Level Orchestrator)
       ↓ (typed props)
Child Components (RiskSummary, PriorityZones, ResourcesPanel, MapPanel, DeploymentPanel, Header)
```

---

## 3. Data Ownership Matrix

| Data / Capability | Current Source | Owner | Frontend Destination |
| :--- | :--- | :--- | :--- |
| Phoenix City Boundary | Local GeoJSON file | City GIS / Member 1 | `LeafletMap.tsx` |
| Temperature / Heat Geography | `web/src/data/track7/` | Member 1 & Member 2 | `PriorityZones.tsx`, `RiskSummary.tsx`, `LeafletMap.tsx` |
| Sector Risk Score (0–100) | `phoenix_tract_risk.json` | Member 2 (Track 7 Analytics) | `PriorityZones.tsx`, `Dashboard.tsx` |
| Sector Risk Status / Band | `phoenix_tract_risk.json` | Member 2 (Track 7 Analytics) | `PriorityZones.tsx`, `RiskSummary.tsx` |
| Fixed Facility Capacity | `mockData.ts` | Member 1 / Municipal Data | `ResourcesPanel.tsx` |
| Deployable Resource Inventory | Local Form State | Track 6 Agent | `DeploymentPanel.tsx` |
