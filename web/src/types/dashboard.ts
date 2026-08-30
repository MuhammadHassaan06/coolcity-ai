/**
 * Pure frontend-facing TypeScript contracts for CoolCity AI dashboard.
 * Contains only fields required by the approved UI components.
 */

export type DataMode = "demo" | "live";
export type ViewMode = "heat" | "risk";
export type SnapshotId = "2026-08-30-1400" | "2024-07-15-1400";
export type TimePeriod = SnapshotId;

export interface PriorityZoneModel {
  id: string;
  code: string;
  name: string;
  geoid: string;
  riskScore: number;
  affectedPopulation: number;
  avgTemperature: number;
  status: "critical" | "high" | "moderate" | "low";
}

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

export interface DashboardSummary {
  totalZonesMonitored: number;
  criticalZones: number;
  averageCityTemp: number;
  overallRiskLevel: string;
  activeCoolingCenters: number;
  deployedResources: number;
}

export interface DeployableResourceCategory {
  id: string;
  name: string;
  description: string;
  unitLabel: string;
  defaultQuantity: number;
  maxSafetyBound: number;
}

export type DeployableInventory = Record<string, number>;

export interface SpatialLayerData {
  heatGeoJson?: unknown; // Future FortyGuard heat overlay GeoJSON payload
}
