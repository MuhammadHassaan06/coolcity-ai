# CoolCity AI Frontend Integration Contract

## 1. Purpose

This document provides a technical handoff specification for **Member 1** (Backend / FortyGuard / Track 6 Agent) and **Member 2** (Track 7 Analytics) to integrate live API and model outputs into the CoolCity AI operational dashboard (`web/`).

- **Demo Data Mode**: The current dashboard operates in Demo Data Mode using synchronous fallback data.
- **Decoupled Architecture**: All UI components are decoupled from mock data through the frontend access boundary `web/src/lib/dataAdapter.ts`.
- **Adaptation Layer Pattern**: Raw backend and analytics API responses must be transformed into stable frontend-facing models inside `dataAdapter.ts` rather than exposing raw server payloads directly to React UI components.

---

## 2. Current Data Flow

### Current Demo Architecture

```text
web/src/lib/mockData.ts (Demo Datasets)
       ↓
web/src/lib/dataAdapter.ts (Synchronous Adapter Boundary)
       ↓
web/src/components/Dashboard.tsx (Top-Level Orchestrator)
       ↓ (typed props)
Child Components (RiskSummary, PriorityZones, ResourcesPanel, MapPanel, DeploymentPanel, Header)
```

### Future Production Data Flow

```text
Member 1 (FortyGuard / Backend) & Member 2 (Track 7 Analytics) Services
       ↓
web/src/lib/dataAdapter.ts (Async Normalization & Adapter Layer)
       ↓
web/src/types/dashboard.ts (Stable Frontend Display Models)
       ↓
web/src/components/Dashboard.tsx
       ↓ (typed props)
Child UI Components
```

*Note: No backend API endpoint URLs are defined or assumed in this frontend contract.*

---

## 3. Frontend-Facing Types

The following types are defined in `web/src/types/dashboard.ts` and represent the current contracts required by the approved UI components.

### 3.1 Data Mode & Controls

```typescript
export type DataMode = "demo" | "live";
export type ViewMode = "heat" | "risk";
export type TimePeriod = "current" | "afternoon" | "historical";
```

- **`DataMode`**: Controls the operational badge in `Header.tsx` ("DEMO DATA MODE" vs "LIVE DATA MODE"). Managed by `Dashboard.tsx`.
- **`ViewMode`**: Toggles between `"heat"` (Heat Exposure) and `"risk"` (Risk Index) display modes. Controlled via `ControlBar.tsx`.
- **`TimePeriod`**: Filters operational timeframe (`"current"`, `"afternoon"`, `"historical"`). Controlled via `ControlBar.tsx`.

### 3.2 PriorityZoneModel

```typescript
export interface PriorityZoneModel {
  id: string;
  code: string;
  name: string;
  riskScore: number;
  affectedPopulation: number;
  avgTemperature: number;
  status: "critical" | "high" | "moderate" | "low";
}
```

- **`id`** (`string`): Unique sector identifier (e.g. `"z-001"`). Rendered in `PriorityZones.tsx` and used for filtering.
- **`code`** (`string`): Municipal sector code badge (e.g. `"PHX-Z01"`). Rendered in `PriorityZones.tsx`, `Dashboard.tsx`, and `MapPanel.tsx`.
- **`name`** (`string`): Sector neighborhood/area display name (e.g. `"Downtown Phoenix Core"`). Rendered in `PriorityZones.tsx`.
- **`riskScore`** (`number`): Numerical risk metric (0–100 scale). Rendered in `PriorityZones.tsx` and `Dashboard.tsx`. *Future Owner: Member 2*.
- **`affectedPopulation`** (`number`): Estimated resident population in sector. Rendered formatted with `toLocaleString()` in `PriorityZones.tsx`. *Future Owner: Member 2 / Census Data*.
- **`avgTemperature`** (`number`): Microclimate average land surface / ambient temperature in °C. Rendered in `PriorityZones.tsx`. *Future Owner: Member 1*.
- **`status`** (`"critical" | "high" | "moderate" | "low"`): Categorical severity level driving badge colors (`bg-red-50`, `bg-amber-50`, `bg-yellow-50`, `bg-slate-50`). Rendered in `PriorityZones.tsx`. *Future Owner: Member 2*.

### 3.3 FacilityResourceModel & ResourceMetrics

```typescript
export interface FacilityResourceModel {
  id: string;
  name: string;
  type: "cooling_center" | "water_distribution" | "medical";
  capacity: number;
  available: number;
}

export interface ResourceMetrics {
  used: number;
  available: number;
  total: number;
  utilization: number;
}
```

- **`id`** (`string`): Unique facility identifier. Rendered in `ResourcesPanel.tsx`.
- **`name`** (`string`): Facility display name. Rendered in `ResourcesPanel.tsx`.
- **`type`** (`"cooling_center" | "water_distribution" | "medical"`): Fixed facility classification. Mapped to badge labels ("Cooling Center", "Water Station", "Medical Hub") in `ResourcesPanel.tsx`.
- **`capacity`** (`number`): Total facility capacity. Used by `getResourceMetrics()` to compute utilization percentage and used count.
- **`available`** (`number`): Currently available spaces/units.
- **`used`** / **`utilization`**: Derived in frontend: `used = capacity - available`, `utilization = Math.round((used / capacity) * 100)`.

### 3.4 DashboardSummary

```typescript
export interface DashboardSummary {
  totalZonesMonitored: number;
  criticalZones: number;
  averageCityTemp: number;
  overallRiskLevel: string;
  activeCoolingCenters: number;
  deployedResources: number;
}
```

- **`totalZonesMonitored`** (`number`): Total monitored sectors count. Rendered in `RiskSummary.tsx`.
- **`criticalZones`** (`number`): Count of zones in `"critical"` status. Rendered in `RiskSummary.tsx`. *Future Owner: Member 2*.
- **`averageCityTemp`** (`number`): Citywide average microclimate temperature in °C. Rendered in `RiskSummary.tsx`. *Future Owner: Member 1*.
- **`overallRiskLevel`** (`string`): Overall city heat risk band (e.g. `"High"`). Rendered in uppercase in `RiskSummary.tsx`. *Future Owner: Member 2*.
- **`activeCoolingCenters`** (`number`): Count of operating cooling centers. Rendered in `RiskSummary.tsx`.
- **`deployedResources`** (`number`): Sum of active mobile units & personnel deployed. Rendered in `RiskSummary.tsx`.

### 3.5 DeployableResourceCategory & DeployableInventory

```typescript
export interface DeployableResourceCategory {
  id: string;
  name: string;
  description: string;
  unitLabel: string;
  defaultQuantity: number;
  maxSafetyBound: number;
}

export type DeployableInventory = Record<string, number>;
```

- **`id`** (`string`): Unique resource category key (`"mobile_cooling_units"`, `"water_stations"`, `"outreach_teams"`).
- **`name`** (`string`): Category title. Rendered in `DeploymentPanel.tsx`.
- **`description`** (`string`): Subtitle explanation. Rendered in `DeploymentPanel.tsx`.
- **`unitLabel`** (`string`): Unit designation (`"Units"`, `"Stations"`, `"Teams"`).
- **`defaultQuantity`** (`number`): Initial staging default value.
- **`maxSafetyBound`** (`number`): Prototype UI safety cap (prevents extreme form entries; not an official municipal limit).

### 3.6 SpatialLayerData

```typescript
export interface SpatialLayerData {
  heatGeoJson?: unknown;
}
```

- **`heatGeoJson`** (`unknown`): Optional typed spatial container reserved for future FortyGuard microclimate GeoJSON layers. Handled by `MapPanel.tsx` and `LeafletMap.tsx`. *Future Owner: Member 1*.

---

## 4. Member 1 Handoff — Backend / FortyGuard

Member 1 is responsible for supplying physical microclimate surface temperature data, geographic GIS heat overlays, and backend service integration.

### Frontend Integration Requirements for Member 1
1. **Microclimate Temperature Data**:
   - Provide temperature readings (°C) per monitoring sector to populate `PriorityZoneModel.avgTemperature`.
   - Provide citywide average temperature (°C) for `DashboardSummary.averageCityTemp`.
2. **FortyGuard Heat Geometry**:
   - Provide thermal surface data as standard GeoJSON objects for adaptation into `SpatialLayerData.heatGeoJson`.
3. **Future Track 6 Deployment Payload**:
   - Consume staged `DeployableInventory` quantities submitted from `DeploymentPanel.tsx` once the allocation agent service is operational.

### Boundary Rule
- **Raw API vs. Display Model**: Raw FortyGuard API payloads (e.g. sensor rasters, raw thermal telemetry arrays) must **not** be imported directly into React components. Transformation into `PriorityZoneModel[]` and `SpatialLayerData` must occur inside `dataAdapter.ts`.

---

## 5. Member 2 Handoff — Track 7 Analytics

Member 2 is responsible for social vulnerability metrics, demographic exposure analysis, multi-factor risk scoring, and Track 7 correlation outputs.

### Frontend Display Needs for Member 2
1. **Sector Risk Scores**:
   - Provide calculated risk scores (0–100 scale) for `PriorityZoneModel.riskScore`.
2. **Risk Band Classification**:
   - Classify sectors into `"critical"`, `"high"`, `"moderate"`, or `"low"` for `PriorityZoneModel.status`.
   - Provide citywide composite assessment string (e.g. `"High"`) for `DashboardSummary.overallRiskLevel`.
3. **Heat & Vulnerability Analysis Panel**:
   - Output structured analytics for display in `AnalysisPanel.tsx`.

### Contract Extension Notice
- *Contract extension required after analytics output is finalized.* If Member 2 introduces new multi-factor vulnerability indicators (e.g., canopy cover %, baseline health risk index, census tract correlations), `web/src/types/dashboard.ts` must be extended explicitly before UI rendering. No formulas are defined or calculated by the frontend.

---

## 6. Map Integration Contract

### Current Verified Map Behavior
- **Basemap**: OpenStreetMap raster tiles rendered via React Leaflet.
- **Municipal Limits**: Static GeoJSON fetched locally from `/data/phoenix-city-boundary.geojson` inside `LeafletMap.tsx`.
- **Center & Bounds**: Centered on Phoenix, AZ (`[33.4484, -112.0740]`) with auto-fit bounds on boundary load.

### Requirements for Future Spatial Heat Geometry
1. **Format**: Valid GeoJSON `Feature` or `FeatureCollection` compatible with Leaflet `<GeoJSON />`.
2. **Coordinate Reference System**: WGS84 / EPSG:4326 (longitude, latitude coordinates in decimal degrees).
3. **Sector Geometry**: Current demo zone codes (`PHX-Z01` through `PHX-Z05`) are **operational display identifiers only**, not geographic polygons. Polygon bounds for sectors must be provided in GeoJSON if zone geometries are to be drawn on the map.

---

## 7. Track 6 Deployment Planner Integration

### Current Planner Behavior
- **Interactive Categories**: Mobile Cooling Units, Water Stations, Outreach Teams.
- **Form State**: Managed locally inside `DeploymentPanel.tsx`.
- **Status**: Displays `"AGENT STATUS: AWAITING TRACK 6 INTEGRATION"` and `"Preview Only — No Agent Request Sent"`.
- **Safety Bounds**: Form input caps (`maxSafetyBound`) are **UI safety bounds** to prevent invalid inputs, not official municipal policy or physical inventory constraints.

### Future Agent Integration Contract
- When Track 6 agent service is integrated, `DeploymentPanel.tsx` will pass validated user-adjusted `DeployableInventory` values to `dataAdapter.ts`.
- *No API endpoint URL or remote request function exists in the current frontend.*

---

## 8. Data Ownership Matrix

| Data / Capability | Current Source | Future Owner | Frontend Destination |
| :--- | :--- | :--- | :--- |
| Phoenix City Boundary | Local GeoJSON file | Member 1 / City GIS | `LeafletMap.tsx` |
| Temperature / Heat Geography | `mockData.ts` | Member 1 (FortyGuard API) | `PriorityZones.tsx`, `RiskSummary.tsx`, `LeafletMap.tsx` |
| Sector Risk Score (0–100) | `mockData.ts` | Member 2 (Track 7 Analytics) | `PriorityZones.tsx`, `Dashboard.tsx` |
| Sector Risk Status / Band | `mockData.ts` | Member 2 (Track 7 Analytics) | `PriorityZones.tsx`, `RiskSummary.tsx` |
| Fixed Facility Capacity | `mockData.ts` | Member 1 / Municipal Data | `ResourcesPanel.tsx` |
| Deployable Resource Inventory | Local Form State | Member 1 / Track 6 Agent | `DeploymentPanel.tsx` |
| Vulnerability & Risk Analytics | Static UI Placeholder | Member 2 (Track 7) | `AnalysisPanel.tsx` |
| Track 6 Agent Recommendation | Local UI Preview | Member 1 (Track 6 Agent) | `DeploymentPanel.tsx` |
| Final Census / Raster Schemas | TBD | Member 2 / Member 1 | TBD (Adapter Layer) |

---

## 9. Integration Rules

1. **No Direct Raw Payload Consumption**: UI components must never directly consume raw external API responses.
2. **Boundary Normalization**: All payload transformations must take place in `web/src/lib/dataAdapter.ts`.
3. **Type Stability**: Existing interfaces in `web/src/types/dashboard.ts` must remain stable. Any necessary schema additions must be additive.
4. **No Frontend Formula Invention**: The frontend must not invent scientific risk equations, interpolation algorithms, or temperature physics formulas.
5. **Explicit Missing Data Handling**: Optional or missing fields must be explicitly handled with fallbacks or null checks.
6. **No Demo Mislabeling**: Demo data must always be flagged as `"demo"` mode in `Header.tsx`. `"live"` mode must only be set when real backend integrations are connected.
7. **Non-Administrative Sectors**: Demo sector names (`PHX-Z01` to `PHX-Z05`) are operational display concepts for Phoenix, Arizona, and must not be presented as official administrative boundaries.
8. **Explicit Units**: All temperature values must be explicitly in °C. All inventory counts must be non-negative integers.
9. **Async Lifecycle Preservation**: When async API calls are introduced to `dataAdapter.ts`, proper loading, error, and empty states must be preserved without breaking UI layouts.

---

## 10. Integration Checklist

### Member 1 (Backend / FortyGuard / Track 6)
- [ ] Provide microclimate temperature values (°C) per sector and citywide average.
- [ ] Deliver GeoJSON thermal surface overlays in WGS84 / EPSG:4326 for Leaflet map rendering.
- [ ] Implement data transformer inside `dataAdapter.ts` to map API responses to `PriorityZoneModel[]` and `DashboardSummary`.
- [ ] Validate Track 6 allocation agent input schema against `DeployableInventory`.

### Member 2 (Track 7 Analytics)
- [ ] Finalize multi-factor vulnerability scoring methodology and risk band thresholds.
- [ ] Map risk scores (0–100) to `PriorityZoneModel.riskScore` and statuses (`"critical"`, `"high"`, `"moderate"`, `"low"`) to `PriorityZoneModel.status`.
- [ ] Define any contract extensions in `web/src/types/dashboard.ts` required for `AnalysisPanel.tsx`.
- [ ] Verify that composite citywide risk level maps to `DashboardSummary.overallRiskLevel`.

### Member 3 (Frontend Integration & QA)
- [ ] Verify all UI components receive data exclusively via props from `Dashboard.tsx`.
- [ ] Confirm `dataAdapter.ts` is the single module handling data fetching and normalization.
- [ ] Test switching `dataMode` between `"demo"` and `"live"` in `Dashboard.tsx`.
- [ ] Run `npm run lint` and `npm run build` to verify zero TypeScript compilation errors.
