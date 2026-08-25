/**
 * Mock data for CoolCity AI dashboard
 * This data is for demonstration purposes only
 */

export interface PriorityZone {
  id: string;
  code: string;
  name: string;
  riskScore: number;
  affectedPopulation: number;
  avgTemperature: number;
  status: "critical" | "high" | "moderate" | "low";
}

export interface ResourceLocation {
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

export function getResourceMetrics(resource: ResourceLocation): ResourceMetrics {
  const total = resource.capacity;
  const available = resource.available;
  const used = Math.max(0, total - available);
  const utilization = total > 0 ? Math.round((used / total) * 100) : 0;
  return { used, available, total, utilization };
}

export interface DashboardStats {
  totalZonesMonitored: number;
  criticalZones: number;
  averageCityTemp: number;
  overallRiskLevel: string;
  activeCoolingCenters: number;
  deployedResources: number;
}

export const priorityZones: PriorityZone[] = [
  {
    id: "z-001",
    code: "PHX-Z01",
    name: "Downtown Phoenix Core",
    riskScore: 92,
    affectedPopulation: 12500,
    avgTemperature: 48.9,
    status: "critical",
  },
  {
    id: "z-002",
    code: "PHX-Z02",
    name: "South Mountain District",
    riskScore: 87,
    affectedPopulation: 8200,
    avgTemperature: 47.3,
    status: "critical",
  },
  {
    id: "z-003",
    code: "PHX-Z03",
    name: "Ahwatukee Foothills",
    riskScore: 76,
    affectedPopulation: 6100,
    avgTemperature: 45.6,
    status: "high",
  },
  {
    id: "z-004",
    code: "PHX-Z04",
    name: "Maryvale Neighborhood",
    riskScore: 68,
    affectedPopulation: 5300,
    avgTemperature: 44.1,
    status: "high",
  },
  {
    id: "z-005",
    code: "PHX-Z05",
    name: "North Phoenix Business Park",
    riskScore: 58,
    affectedPopulation: 3200,
    avgTemperature: 42.8,
    status: "moderate",
  },
];

export const resources: ResourceLocation[] = [
  {
    id: "r-001",
    name: "Downtown Community Center",
    type: "cooling_center",
    capacity: 500,
    available: 120,
  },
  {
    id: "r-002",
    name: "Phoenix Sky Harbor Station",
    type: "water_distribution",
    capacity: 2000,
    available: 450,
  },
  {
    id: "r-003",
    name: "St. Joseph's Medical Center",
    type: "medical",
    capacity: 200,
    available: 15,
  },
  {
    id: "r-004",
    name: "South Phoenix Cooling Hub",
    type: "cooling_center",
    capacity: 800,
    available: 280,
  },
  {
    id: "r-005",
    name: "Maryvale Water Station",
    type: "water_distribution",
    capacity: 1500,
    available: 380,
  },
];

export const dashboardStats: DashboardStats = {
  totalZonesMonitored: 18,
  criticalZones: 2,
  averageCityTemp: 45.3,
  overallRiskLevel: "High",
  activeCoolingCenters: 4,
  deployedResources: 1200,
};

export type ViewMode = "heat" | "risk";
export type TimePeriod = "current" | "afternoon" | "historical";

export interface DeployableResourceCategory {
  id: string;
  name: string;
  description: string;
  unitLabel: string;
  defaultQuantity: number;
  /** Prototype/demo UI safety bound (prevents extreme form entries; not official municipal limits). */
  maxSafetyBound: number;
}

export const DEPLOYABLE_RESOURCE_CATEGORIES: DeployableResourceCategory[] = [
  {
    id: "mobile_cooling_units",
    name: "Mobile Cooling Units",
    description: "Portable climate-controlled emergency shelter trailers",
    unitLabel: "Units",
    defaultQuantity: 12,
    maxSafetyBound: 100,
  },
  {
    id: "water_stations",
    name: "Water Stations",
    description: "Mobile hydration pods & emergency bulk water distribution points",
    unitLabel: "Stations",
    defaultQuantity: 25,
    maxSafetyBound: 200,
  },
  {
    id: "outreach_teams",
    name: "Outreach Teams",
    description: "Field emergency health, wellness & hydration response personnel",
    unitLabel: "Teams",
    defaultQuantity: 8,
    maxSafetyBound: 50,
  },
];

export const DEFAULT_DEPLOYABLE_INVENTORY: Record<string, number> = {
  mobile_cooling_units: 12,
  water_stations: 25,
  outreach_teams: 8,
};

