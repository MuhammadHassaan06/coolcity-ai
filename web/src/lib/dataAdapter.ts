/**
 * Centralized frontend data access boundary for CoolCity AI dashboard.
 * Serves synchronous demo data today and provides a single integration point
 * for future backend, FortyGuard GIS, and risk analytics APIs.
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

import {
  dashboardStats,
  priorityZones,
  resources,
  DEPLOYABLE_RESOURCE_CATEGORIES,
  DEFAULT_DEPLOYABLE_INVENTORY,
  getResourceMetrics as computeMetrics,
} from "@/lib/mockData";

export function getDataMode(): DataMode {
  return "demo";
}

export function getDashboardSummary(): DashboardSummary {
  return dashboardStats;
}

export function getPriorityZones(): PriorityZoneModel[] {
  return priorityZones;
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
