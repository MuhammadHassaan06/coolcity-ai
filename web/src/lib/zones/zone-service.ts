import fs from "fs";
import path from "path";
import { CanonicalTractRecord } from "../../types/zone";
import { HeatMetrics } from "../../types/heat";
import { Vulnerability } from "../../types/vulnerability";

// Static runtime snapshot from Track 7 analytics pipeline
import runtimeTracts from "../../data/track7/phoenix_tract_risk.json";
// Default fallback sample fixture for offline development/tests if phoenix_tract_risk.json is absent
import defaultSampleTracts from "./fixtures/sample-tracts.json";

let currentAnalyticsStore: CanonicalTractRecord[] | null = null;

function loadDefaultAnalyticsStore(): CanonicalTractRecord[] {
  if (currentAnalyticsStore) {
    return currentAnalyticsStore;
  }

  // 1. Try static runtime snapshot import (bundled by Next.js)
  if (Array.isArray(runtimeTracts) && runtimeTracts.length > 0) {
    currentAnalyticsStore = runtimeTracts.map((item: unknown) => normalizeCanonicalRecord(item));
    return currentAnalyticsStore;
  }

  // 2. Try disk paths if runtime snapshot was empty
  const candidatePaths = [
    path.resolve(process.cwd(), "src/data/track7/phoenix_tract_risk.json"),
    path.resolve(process.cwd(), "data/processed/phoenix_tract_risk.json"),
    path.resolve(process.cwd(), "../data/processed/phoenix_tract_risk.json"),
  ];

  for (const canonicalPath of candidatePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ canonicalPath)) {
      try {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ canonicalPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentAnalyticsStore = parsed.map((item: unknown) => normalizeCanonicalRecord(item));
          return currentAnalyticsStore;
        }
      } catch {
        // Continue to next path
      }
    }
  }

  // 3. Fallback to Census GEOID test fixture
  currentAnalyticsStore = (defaultSampleTracts as unknown[]).map((item) => normalizeCanonicalRecord(item));
  return currentAnalyticsStore;
}

export function normalizeCanonicalRecord(raw: unknown): CanonicalTractRecord {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const geoidStr = String(r.geoid || r.code || r.id || "").trim();
  const cleanId = r.id ? String(r.id).trim() : `tract-${geoidStr}`;
  const cleanCode = r.code ? String(r.code).trim() : geoidStr;

  return {
    id: cleanId,
    code: cleanCode,
    name: r.name ? String(r.name) : `Census Tract ${geoidStr}`,
    geoid: geoidStr,
    riskScore: typeof r.riskScore === "number" ? r.riskScore : 0,
    status: validateRiskStatus(r.status),
    avgTemperature: typeof r.avgTemperature === "number" ? r.avgTemperature : 35.0,
    affectedPopulation: typeof r.affectedPopulation === "number" ? Math.round(r.affectedPopulation) : 0,
  };
}

function validateRiskStatus(status: unknown): "low" | "moderate" | "high" | "critical" {
  const s = String(status || "").toLowerCase();
  if (s === "critical" || s === "high" || s === "moderate" || s === "low") {
    return s;
  }
  return "moderate";
}

export async function getZones(): Promise<CanonicalTractRecord[]> {
  return loadDefaultAnalyticsStore();
}

export async function getZoneByGeoid(idOrGeoid: string): Promise<CanonicalTractRecord | null> {
  if (!idOrGeoid || typeof idOrGeoid !== "string" || idOrGeoid.trim() === "") {
    return null;
  }
  const cleanKey = idOrGeoid.trim();
  const store = loadDefaultAnalyticsStore();
  const match = store.find(
    (z) => z.geoid === cleanKey || z.id === cleanKey || z.code === cleanKey
  );
  return match || null;
}

export async function getZoneHeatMetrics(idOrGeoid: string): Promise<HeatMetrics | null> {
  const zone = await getZoneByGeoid(idOrGeoid);
  if (!zone) {
    return null;
  }
  return {
    zoneId: zone.geoid,
    meanTemp: zone.avgTemperature,
    maxTemp: zone.avgTemperature ? zone.avgTemperature + 2.5 : null,
    temperatureUnit: "C",
    persistenceScore: null, // Track 7 snapshot does not include persistence metrics
    exceedanceScore: null,
    historicalDeviation: null,
    dataTimestamp: new Date().toISOString(),
  };
}

export async function getZoneVulnerability(idOrGeoid: string): Promise<Vulnerability | null> {
  const zone = await getZoneByGeoid(idOrGeoid);
  if (!zone) {
    return null;
  }
  return {
    zoneId: zone.geoid,
    povertyRate: null, // Sub-components not stored in Track 7 canonical summary record
    age65PlusRate: null,
    noVehicleRate: null,
    compositeScore: zone.riskScore,
    sourceYear: 2024,
  };
}

export function setAnalyticsStore(tracts: CanonicalTractRecord[]): void {
  currentAnalyticsStore = tracts.map((t) => normalizeCanonicalRecord(t));
}

export function loadAnalyticsDataFromObject(payload: unknown): CanonicalTractRecord[] {
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (typeof payload === "object" && payload !== null && Array.isArray((payload as Record<string, unknown>).zones)) {
    list = (payload as Record<string, unknown>).zones as unknown[];
  }
  const normalized = list.map((item) => normalizeCanonicalRecord(item));
  currentAnalyticsStore = normalized;
  return normalized;
}

export function resetAnalyticsStore(): void {
  currentAnalyticsStore = null;
}
