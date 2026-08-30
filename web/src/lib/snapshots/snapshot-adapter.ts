/**
 * Centralized Track 7 Snapshot Data Adapter for CoolCity AI.
 * Serves canonical multi-snapshot analytics for both:
 *   - 2026-08-30-1400 (Latest Snapshot)
 *   - 2024-07-15-1400 (Historical Snapshot)
 */

import { DashboardSummary, PriorityZoneModel } from "../../types/dashboard";

import risk2026 from "../../data/track7/snapshots/2026-08-30-1400/phoenix_tract_risk.json";
import corr2026 from "../../data/track7/snapshots/2026-08-30-1400/correlation_summary.json";
import sens2026 from "../../data/track7/snapshots/2026-08-30-1400/sensitivity_summary.json";
import t7_2026 from "../../data/track7/snapshots/2026-08-30-1400/track7_summary.json";

import risk2024 from "../../data/track7/snapshots/2024-07-15-1400/phoenix_tract_risk.json";
import corr2024 from "../../data/track7/snapshots/2024-07-15-1400/correlation_summary.json";
import sens2024 from "../../data/track7/snapshots/2024-07-15-1400/sensitivity_summary.json";
import t7_2024 from "../../data/track7/snapshots/2024-07-15-1400/track7_summary.json";

import { resources } from "../mockData";

export type SnapshotId = "2026-08-30-1400" | "2024-07-15-1400";
export const DEFAULT_SNAPSHOT_ID: SnapshotId = "2026-08-30-1400";
export const SUPPORTED_SNAPSHOT_IDS: SnapshotId[] = ["2026-08-30-1400", "2024-07-15-1400"];

export interface SnapshotMetadata {
  id: SnapshotId;
  label: string;
  timestampDisplay: string;
  badgeLabel: string;
  snapshotDate: string;
  snapshotTime: string;
  tractCount: number;
  criticalCount: number;
  meanTempC: number;
  minTempC: number;
  maxTempC: number;
  meanRiskScore: number;
  minRiskScore: number;
  maxRiskScore: number;
  topGeoid: string;
  topRiskScore: number;
}

export function isValidSnapshotId(id: string): id is SnapshotId {
  return SUPPORTED_SNAPSHOT_IDS.includes(id as SnapshotId);
}

export function getSnapshotMetadata(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID): SnapshotMetadata {
  if (snapshotId === "2024-07-15-1400") {
    return {
      id: "2024-07-15-1400",
      label: "Historical Snapshot",
      timestampDisplay: "Jul 15, 2024 • 14:00",
      badgeLabel: "HISTORICAL SNAPSHOT",
      snapshotDate: "2024-07-15",
      snapshotTime: "14:00",
      tractCount: t7_2024.tractCount || 359,
      criticalCount: 0,
      meanTempC: t7_2024.temperatureSummary?.meanC || 39.04,
      minTempC: t7_2024.temperatureSummary?.minC || 36.85,
      maxTempC: t7_2024.temperatureSummary?.maxC || 40.06,
      meanRiskScore: t7_2024.riskScoreSummary?.meanScore || 44.66,
      minRiskScore: t7_2024.riskScoreSummary?.minScore || 10.48,
      maxRiskScore: t7_2024.riskScoreSummary?.maxScore || 73.15,
      topGeoid: "04013114900",
      topRiskScore: 73.15,
    };
  }

  return {
    id: "2026-08-30-1400",
    label: "Latest Snapshot",
    timestampDisplay: "Aug 30, 2026 • 14:00",
    badgeLabel: "FULL-CITY SNAPSHOT",
    snapshotDate: "2026-08-30",
    snapshotTime: "14:00",
    tractCount: t7_2026.tractCount || 359,
    criticalCount: 2,
    meanTempC: t7_2026.temperatureSummary?.meanC || 39.85,
    minTempC: t7_2026.temperatureSummary?.minC || 38.05,
    maxTempC: t7_2026.temperatureSummary?.maxC || 40.74,
    meanRiskScore: t7_2026.riskScoreSummary?.meanScore || 49.71,
    minRiskScore: t7_2026.riskScoreSummary?.minScore || 15.46,
    maxRiskScore: t7_2026.riskScoreSummary?.maxScore || 77.02,
    topGeoid: "04013113900",
    topRiskScore: 77.02,
  };
}

export function getSnapshotPriorityZones(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID): PriorityZoneModel[] {
  const rawData = snapshotId === "2024-07-15-1400" ? risk2024 : risk2026;
  return (rawData as Array<Record<string, unknown>>).map((t) => {
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

export function getSnapshotDashboardSummary(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID): DashboardSummary {
  const priorityZones = getSnapshotPriorityZones(snapshotId);
  const t7Summary = snapshotId === "2024-07-15-1400" ? t7_2024 : t7_2026;

  const criticalCount = priorityZones.filter((t) => t.status === "critical").length;
  const totalTemp = priorityZones.reduce((acc, t) => acc + t.avgTemperature, 0);
  const avgTemp = priorityZones.length > 0 ? Number((totalTemp / priorityZones.length).toFixed(2)) : 39.85;

  return {
    totalZonesMonitored: t7Summary.tractCount || priorityZones.length,
    criticalZones: criticalCount,
    averageCityTemp: avgTemp,
    overallRiskLevel: criticalCount > 0 ? "Critical" : "High",
    activeCoolingCenters: resources.filter((r) => r.type === "cooling_center").length,
    deployedResources: 18,
  };
}

export function getSnapshotCorrelationSummary(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID) {
  return snapshotId === "2024-07-15-1400" ? corr2024 : corr2026;
}

export function getSnapshotSensitivitySummary(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID) {
  return snapshotId === "2024-07-15-1400" ? sens2024 : sens2026;
}

export function getSnapshotTrack7Summary(snapshotId: SnapshotId = DEFAULT_SNAPSHOT_ID) {
  return snapshotId === "2024-07-15-1400" ? t7_2024 : t7_2026;
}
