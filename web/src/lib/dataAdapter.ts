/**
 * Centralized frontend data access boundary for CoolCity AI dashboard.
 * Serves canonical Track 7 Census Tract analytics & FortyGuard backend data models.
 * Now fully multi-snapshot aware (supporting 2026-08-30-1400 and 2024-07-15-1400).
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
  SnapshotId,
  DEFAULT_SNAPSHOT_ID,
  getSnapshotMetadata,
  getSnapshotPriorityZones,
  getSnapshotDashboardSummary,
  getSnapshotCorrelationSummary,
  getSnapshotSensitivitySummary,
  getSnapshotTrack7Summary,
  isValidSnapshotId,
} from "./snapshots/snapshot-adapter";

import {
  resources,
  DEPLOYABLE_RESOURCE_CATEGORIES,
  DEFAULT_DEPLOYABLE_INVENTORY,
  getResourceMetrics as computeMetrics,
} from "@/lib/mockData";

export type { SnapshotId };
export {
  DEFAULT_SNAPSHOT_ID,
  getSnapshotMetadata,
  getSnapshotPriorityZones,
  getSnapshotDashboardSummary,
  getSnapshotCorrelationSummary,
  getSnapshotSensitivitySummary,
  getSnapshotTrack7Summary,
  isValidSnapshotId,
};

export function getDataMode(): DataMode {
  return "live";
}

export function getDashboardSummary(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID): DashboardSummary {
  return getSnapshotDashboardSummary(snapshotId);
}

export function getPriorityZones(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID): PriorityZoneModel[] {
  return getSnapshotPriorityZones(snapshotId);
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
