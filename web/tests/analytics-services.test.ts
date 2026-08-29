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
import { getZoneRisk, getAllZoneRisks } from "../src/lib/risk/risk-service";
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

  it("1. validates core domain schema structures correctly", () => {
    const validZone = {
      id: "tract-04013113900",
      name: "Census Tract 1139",
      geoid: "04013113900",
    };
    assert.equal(ZoneSchema.safeParse(validZone).success, true);

    const validHeat = {
      zoneId: "04013113900",
      meanTemp: 36.39,
      maxTemp: 38.89,
      temperatureUnit: "C" as const,
      persistenceScore: null,
      exceedanceScore: null,
      historicalDeviation: null,
      dataTimestamp: "2026-08-29T00:00:00Z",
    };
    assert.equal(HeatMetricsSchema.safeParse(validHeat).success, true);

    const validVuln = {
      zoneId: "04013113900",
      povertyRate: null,
      age65PlusRate: null,
      noVehicleRate: null,
      compositeScore: 72.38,
      sourceYear: 2024,
    };
    assert.equal(VulnerabilitySchema.safeParse(validVuln).success, true);

    const validRisk = {
      zoneId: "04013113900",
      totalScore: 72.38,
      band: "high" as const,
      components: {
        heatExposure: 36.39,
        vulnerability: 72.38,
      },
    };
    assert.equal(ZoneRiskSchema.safeParse(validRisk).success, true);

    const validInventory = {
      mobileCoolingUnits: 5,
      waterStations: 12,
      outreachTeams: 4,
    };
    assert.equal(ResourceInventorySchema.safeParse(validInventory).success, true);

    const validAllocation = {
      resourceType: "mobile_cooling_unit" as const,
      quantity: 1,
      zoneId: "04013113900",
      reasons: ["High risk score"],
    };
    assert.equal(ResourceAllocationSchema.safeParse(validAllocation).success, true);
  });

  it("2. retrieves default Census Tract spatial analytics dataset deterministically", async () => {
    const zones = await getZones();
    assert.ok(zones.length > 0, "Zones array should not be empty");
    assert.equal(zones[0].geoid.length, 11);

    const heat = await getZoneHeatMetrics(zones[0].geoid);
    assert.ok(heat);

    const vuln = await getZoneVulnerability(zones[0].geoid);
    assert.ok(vuln);

    const risk = await getZoneRisk(zones[0].geoid);
    assert.ok(risk);
  });

  it("3. returns all zone risks sorted deterministically by totalScore descending", async () => {
    const risks = await getAllZoneRisks();
    assert.ok(risks.length >= 2);
    for (let i = 0; i < risks.length - 1; i++) {
      assert.ok(
        risks[i].totalScore >= risks[i + 1].totalScore,
        `Risk at index ${i} (${risks[i].totalScore}) must be >= index ${i + 1} (${risks[i + 1].totalScore})`
      );
    }
  });

  it("4. manages resource inventory state and updates correctly", async () => {
    const initial = await getSystemResourceInventory();
    assert.equal(initial.mobileCoolingUnits, 5);

    const updated = await updateResourceInventory({ mobileCoolingUnits: 8 });
    assert.equal(updated.mobileCoolingUnits, 8);
    assert.equal(updated.waterStations, 12);
  });

  it("5. seamlessly replaces dataset when Member 2 processed tract data is injected", async () => {
    const realMember2Payload = [
      {
        id: "tract-04013114000",
        code: "04013114000",
        name: "Census Tract 1140",
        geoid: "04013114000",
        riskScore: 91.5,
        status: "critical",
        avgTemperature: 41.2,
        affectedPopulation: 3100,
      },
    ];

    const newStore = loadAnalyticsDataFromObject(realMember2Payload);
    setAnalyticsStore(newStore);

    const zones = await getZones();
    assert.equal(zones.length, 1);
    assert.equal(zones[0].geoid, "04013114000");

    const risk = await getZoneRisk("04013114000");
    assert.equal(risk?.totalScore, 91.5);
    assert.equal(risk?.band, "critical");
  });
});
