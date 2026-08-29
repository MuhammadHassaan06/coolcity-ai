import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getZoneRisk, getAllZoneRisks } from "../src/lib/risk/risk-service";
import { setAnalyticsStore, resetAnalyticsStore } from "../src/lib/zones/zone-service";
import { CanonicalTractRecord } from "../src/types/zone";

const testTracts: CanonicalTractRecord[] = [
  {
    id: "tract-04013113900",
    code: "04013113900",
    name: "Census Tract 1139",
    geoid: "04013113900",
    riskScore: 72.38,
    status: "high",
    avgTemperature: 36.39,
    affectedPopulation: 1532,
  },
  {
    id: "tract-04013092311",
    code: "04013092311",
    name: "Census Tract 923.11",
    geoid: "04013092311",
    riskScore: 84.12,
    status: "critical",
    avgTemperature: 38.50,
    affectedPopulation: 2410,
  },
  {
    id: "tract-04013092307",
    code: "04013092307",
    name: "Census Tract 923.07",
    geoid: "04013092307",
    riskScore: 41.05,
    status: "moderate",
    avgTemperature: 32.10,
    affectedPopulation: 980,
  },
];

describe("Census Tract Risk & Zone Service Layer Test Suite", () => {
  beforeEach(() => {
    setAnalyticsStore(testTracts);
  });

  afterEach(() => {
    resetAnalyticsStore();
  });

  it("1. preserves 11-character Census GEOID string format with leading zero", async () => {
    const risk = await getZoneRisk("04013113900");
    assert.ok(risk);
    assert.equal(risk.zoneId, "04013113900");
    assert.equal(risk.zoneId.length, 11);
    assert.equal(risk.zoneId.startsWith("0"), true);
  });

  it("2. consumes authoritative Track 7 riskScore directly without recomputing", async () => {
    const risk = await getZoneRisk("04013092311");
    assert.ok(risk);
    assert.equal(risk.totalScore, 84.12);
    assert.equal(risk.band, "critical");
  });

  it("3. ranks tracts in priority order descending by Track 7 riskScore", async () => {
    const ranked = await getAllZoneRisks();
    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].zoneId, "04013092311"); // 84.12
    assert.equal(ranked[1].zoneId, "04013113900"); // 72.38
    assert.equal(ranked[2].zoneId, "04013092307"); // 41.05
  });

  it("4. handles tie-breaker deterministically by zoneId ascending when scores are equal", async () => {
    setAnalyticsStore([
      { ...testTracts[0], geoid: "04013113900", riskScore: 75.0 },
      { ...testTracts[1], geoid: "04013092311", riskScore: 75.0 },
    ]);

    const ranked = await getAllZoneRisks();
    assert.equal(ranked[0].zoneId, "04013092311"); // 04013092311 < 04013113900
    assert.equal(ranked[1].zoneId, "04013113900");
  });
});
