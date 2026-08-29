/**
 * Centralized frontend data access boundary for CoolCity AI dashboard.
 * Serves canonical Track 7 Census Tract analytics & FortyGuard backend data models.
 */

import {
  DataMode,
  DashboardSummary,
  PriorityZoneModel,
  FacilityResourceModel,
  ResourceMetrics,
  DeployableResourceCategory,
  DeployableInventory,
} from "@/types/dashboard";

import tractData from "@/data/track7/phoenix_tract_risk.json";
import track7Summary from "@/data/track7/track7_summary.json";

import {
  resources,
  DEPLOYABLE_RESOURCE_CATEGORIES,
  DEFAULT_DEPLOYABLE_INVENTORY,
  getResourceMetrics as computeMetrics,
} from "@/lib/mockData";

export function getDataMode(): DataMode {
  return "live";
}

export function getDashboardSummary(): DashboardSummary {
  const criticalCount = tractData.filter((t) => (t.status as string) === "critical").length;
  const totalTemp = tractData.reduce((acc, t) => acc + ((t.avgTemperature as number) || 0), 0);
  const avgTemp = tractData.length > 0 ? Number((totalTemp / tractData.length).toFixed(2)) : 41.87;

  return {
    totalZonesMonitored: track7Summary.tractCount || tractData.length,
    criticalZones: criticalCount,
    averageCityTemp: avgTemp,
    overallRiskLevel: "High",
    activeCoolingCenters: resources.filter((r) => r.type === "cooling_center").length,
    deployedResources: 18,
  };
}

export function getPriorityZones(): PriorityZoneModel[] {
  return (tractData as Array<Record<string, unknown>>).map((t) => {
    const geoidStr = String(t.geoid || t.code || t.id || "").trim();
    const statusVal = String(t.status || "").toLowerCase();
    const validStatus = (["critical", "high", "moderate", "low"].includes(statusVal)
      ? statusVal
      : "moderate") as PriorityZoneModel["status"];

    return {
      id: String(t.id || `tract-${geoidStr}`).trim(),
      code: String(t.code || geoidStr).trim(),
      name: String(t.name || `Census Tract ${geoidStr}`),
      geoid: geoidStr,
      riskScore: typeof t.riskScore === "number" ? t.riskScore : 0,
      affectedPopulation: typeof t.affectedPopulation === "number" ? Math.round(t.affectedPopulation) : 0,
      avgTemperature: typeof t.avgTemperature === "number" ? t.avgTemperature : 35.0,
      status: validStatus,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export function getFacilityResources(): FacilityResourceModel[] {
  return resources;
}

export function getDeployableCategories(): DeployableResourceCategory[] {
  return DEPLOYABLE_RESOURCE_CATEGORIES;
}

export function getDefaultDeployableInventory(): DeployableInventory {
  return DEFAULT_DEPLOYABLE_INVENTORY;
}

export function getResourceMetrics(resource: FacilityResourceModel): ResourceMetrics {
  return computeMetrics(resource);
}
