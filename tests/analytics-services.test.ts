/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock 'server-only' for Node test context
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {
  // Ignore if server-only cannot be resolved
}

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getZones,
  getZoneHeatMetrics,
  getZoneVulnerability,
  setAnalyticsStore,
  loadAnalyticsDataFromObject,
  resetAnalyticsStore,
} from "../src/lib/zones/zone-service";
import { getZoneRisk, getAllZoneRisks, calculateDevelopmentMockRisk } from "../src/lib/risk/risk-service";
import {
  getSystemResourceInventory,
  updateResourceInventory,
  resetResourceInventory,
} from "../src/lib/resources/inventory";
import {
  ZoneSchema,
  HeatMetricsSchema,
  VulnerabilitySchema,
  ZoneRiskSchema,
  ResourceInventorySchema,
  ResourceAllocationSchema,
} from "../src/lib/validation/analytics";

describe("Member 2 Data Contract & Backend Services Test Suite", () => {
  beforeEach(() => {
    resetAnalyticsStore();
    resetResourceInventory();
  });

  // Test 1: Validation Schemas
  it("1. validates core domain schema structures correctly", () => {
    const validZone = {
      id: "ZONE-101",
      name: "Test Zone",
      geometry: { type: "Polygon", coordinates: [] },
    };
    assert.equal(ZoneSchema.safeParse(validZone).success, true);

    const validHeat = {
      zoneId: "ZONE-101",
      meanTemp: 40.5,
      maxTemp: 43.0,
      temperatureUnit: "C" as const,
      persistenceScore: 75.0,
      exceedanceScore: 80.0,
      historicalDeviation: 3.5,
      dataTimestamp: "2024-07-15T14:00:00Z",
    };
    assert.equal(HeatMetricsSchema.safeParse(validHeat).success, true);

    const validVuln = {
      zoneId: "ZONE-101",
      povertyRate: 0.25,
      age65PlusRate: 0.2,
      noVehicleRate: 0.15,
      compositeScore: 68.5,
      sourceYear: 2022,
    };
    assert.equal(VulnerabilitySchema.safeParse(validVuln).success, true);

    const validRisk = {
      zoneId: "ZONE-101",
      totalScore: 78.5,
      band: "high" as const,
      components: {
        heatExposure: 80.0,
        persistence: 75.0,
        vulnerability: 68.5,
      },
    };
    assert.equal(ZoneRiskSchema.safeParse(validRisk).success, true);

    const validInventory = {
      mobileCoolingUnits: 5,
      waterStations: 10,
      outreachTeams: 3,
    };
    assert.equal(ResourceInventorySchema.safeParse(validInventory).success, true);

    const validAllocation = {
      resourceType: "mobile_cooling_unit" as const,
      quantity: 2,
      zoneId: "ZONE-101",
      reasons: ["Extreme heat score"],
    };
    assert.equal(ResourceAllocationSchema.safeParse(validAllocation).success, true);
  });

  // Test 2: Default Member 2 Dataset Retrieval
  it("2. retrieves default Member 2 spatial analytics dataset deterministically", async () => {
    const zones = await getZones();
    assert.ok(zones.length > 0, "Zones array should not be empty");
    assert.equal(zones[0].id, "z-006");

    const heat = await getZoneHeatMetrics("z-006");
    assert.ok(heat);
    assert.equal(heat?.meanTemp, 36.5);

    const vuln = await getZoneVulnerability("z-006");
    assert.ok(vuln);
    assert.equal(vuln?.povertyRate, 0.3683);

    const risk = await getZoneRisk("z-006");
    assert.ok(risk);
    assert.equal(risk?.band, "high");
  });

  // Test 3: getAllZoneRisks Sorting
  it("3. returns all zone risks sorted deterministically by totalScore descending", async () => {
    const risks = await getAllZoneRisks();
    assert.ok(risks.length >= 3);
    for (let i = 0; i < risks.length - 1; i++) {
      assert.ok(
        risks[i].totalScore >= risks[i + 1].totalScore,
        `Risk at index ${i} (${risks[i].totalScore}) must be >= index ${i + 1} (${risks[i + 1].totalScore})`
      );
    }
  });

  // Test 4: Resource Inventory Management
  it("4. manages resource inventory state and updates correctly", async () => {
    const initial = await getSystemResourceInventory();
    assert.equal(initial.mobileCoolingUnits, 5);

    const updated = await updateResourceInventory({ mobileCoolingUnits: 8 });
    assert.equal(updated.mobileCoolingUnits, 8);
    assert.equal(updated.waterStations, 12);
  });

  // Test 5: Member 2 Data Replacement Mechanism
  it("5. seamlessly replaces dataset when Member 2 processed data is injected", async () => {
    const realMember2Payload = {
      _meta: {
        isMockData: false,
        version: "2.0.0-real-member2",
      },
      zones: [
        {
          id: "PHX-REAL-01",
          name: "Real Phoenix Central Zone",
          geometry: { type: "Polygon", coordinates: [] },
        },
      ],
      heatMetrics: [
        {
          zoneId: "PHX-REAL-01",
          meanTemp: 44.1,
          maxTemp: 47.0,
          temperatureUnit: "C",
          persistenceScore: 92.0,
          exceedanceScore: 95.0,
          historicalDeviation: 5.1,
          dataTimestamp: "2024-07-15T14:00:00Z",
        },
      ],
      vulnerability: [
        {
          zoneId: "PHX-REAL-01",
          povertyRate: 0.35,
          age65PlusRate: 0.30,
          noVehicleRate: 0.25,
          compositeScore: 88.0,
          sourceYear: 2023,
        },
      ],
      risks: [
        {
          zoneId: "PHX-REAL-01",
          totalScore: 94.2,
          band: "critical",
          components: {
            heatExposure: 95.0,
            persistence: 92.0,
            vulnerability: 88.0,
            coolingAccessGap: 80.0,
          },
        },
      ],
    };

    const newStore = loadAnalyticsDataFromObject(realMember2Payload);
    setAnalyticsStore(newStore);

    const zones = await getZones();
    assert.equal(zones.length, 1);
    assert.equal(zones[0].id, "PHX-REAL-01");

    const heat = await getZoneHeatMetrics("PHX-REAL-01");
    assert.equal(heat?.maxTemp, 47.0);

    const risk = await getZoneRisk("PHX-REAL-01");
    assert.equal(risk?.totalScore, 94.2);
    assert.equal(risk?.band, "critical");
  });

  // Test 6: Development Mock Fallback Isolation
  it("6. isolates development mock risk calculation from production logic", () => {
    const heat = {
      zoneId: "DEV-Z01",
      meanTemp: 40.0,
      maxTemp: 42.0,
      temperatureUnit: "C" as const,
      persistenceScore: 70.0,
      exceedanceScore: 70.0,
      historicalDeviation: 2.0,
      dataTimestamp: "2024-07-15T14:00:00Z",
    };
    const vuln = {
      zoneId: "DEV-Z01",
      povertyRate: 0.2,
      age65PlusRate: 0.2,
      noVehicleRate: 0.1,
      compositeScore: 60.0,
      sourceYear: 2022,
    };

    const devMockRisk = calculateDevelopmentMockRisk("DEV-Z01", heat, vuln);
    assert.equal(devMockRisk.zoneId, "DEV-Z01");
    assert.ok(devMockRisk.totalScore > 0);
    assert.ok(devMockRisk.band);
  });
});
