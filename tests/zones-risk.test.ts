import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoolCityZone } from "../src/lib/zones/types";
import { calculateZoneRiskScore, rankZonesByRisk } from "../src/lib/zones/risk";

const samplePolygon = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-112.079, 33.4435],
      [-112.069, 33.4435],
      [-112.069, 33.4525],
      [-112.079, 33.4525],
      [-112.079, 33.4435],
    ],
  ],
};

const lowHeatZone: CoolCityZone = {
  zoneId: "PHX-Z01",
  name: "Phoenix Park (Low Heat)",
  geometry: samplePolygon,
  metrics: {
    avgTempC: 28.5,
    maxTempC: 30.0,
    minTempC: 25.0,
    heatSeverity: "low",
  },
  demographics: {
    vulnerablePopulationCount: 50,
    elderlyPercentage: 10,
    shadeCoveragePercentage: 75,
  },
};

const moderateHeatZone: CoolCityZone = {
  zoneId: "PHX-Z02",
  name: "Central Corridor (Moderate Heat)",
  geometry: samplePolygon,
  metrics: {
    avgTempC: 36.5,
    maxTempC: 37.8,
    minTempC: 33.0,
    heatSeverity: "moderate",
  },
  demographics: {
    vulnerablePopulationCount: 300,
    elderlyPercentage: 25,
    shadeCoveragePercentage: 35,
  },
};

const extremeHeatZone: CoolCityZone = {
  zoneId: "PHX-Z03",
  name: "Downtown Asphalt (Extreme Heat)",
  geometry: samplePolygon,
  metrics: {
    avgTempC: 43.0,
    maxTempC: 45.2,
    minTempC: 39.5,
    heatSeverity: "extreme",
  },
  demographics: {
    vulnerablePopulationCount: 1200,
    elderlyPercentage: 45,
    shadeCoveragePercentage: 5,
  },
};

describe("CoolCity Zone Risk Service Layer Test Suite", () => {
  it("calculates risk score correctly for low heat scenario", () => {
    const score = calculateZoneRiskScore(lowHeatZone);
    assert.ok(score >= 0 && score <= 100, "Score must be bounded between 0 and 100");
    assert.ok(score < 40, `Low heat zone score (${score}) should be less than 40`);
  });

  it("calculates risk score correctly for moderate heat scenario", () => {
    const score = calculateZoneRiskScore(moderateHeatZone);
    assert.ok(score >= 40 && score <= 75, `Moderate heat zone score (${score}) should be between 40 and 75`);
  });

  it("calculates risk score correctly for extreme heat scenario", () => {
    const score = calculateZoneRiskScore(extremeHeatZone);
    assert.ok(score > 80, `Extreme heat zone score (${score}) should be greater than 80`);
  });

  it("handles zones without demographic data gracefully", () => {
    const noDemoZone: CoolCityZone = {
      zoneId: "PHX-Z04",
      name: "Industrial Strip (No Demo Data)",
      geometry: samplePolygon,
      metrics: {
        avgTempC: 41.0,
        maxTempC: 43.0,
        minTempC: 38.0,
        heatSeverity: "high",
      },
    };

    const score = calculateZoneRiskScore(noDemoZone);
    assert.ok(score >= 60 && score <= 100, `High heat zone without demo data score (${score}) should be elevated`);
  });

  it("ranks multiple zones correctly by risk score in descending order", () => {
    const inputZones = [lowHeatZone, extremeHeatZone, moderateHeatZone];
    const ranked = rankZonesByRisk(inputZones);

    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].zoneId, "PHX-Z03", "Extreme heat zone should be ranked #1");
    assert.equal(ranked[1].zoneId, "PHX-Z02", "Moderate heat zone should be ranked #2");
    assert.equal(ranked[2].zoneId, "PHX-Z01", "Low heat zone should be ranked #3");

    // Verify ordering by score
    const score0 = calculateZoneRiskScore(ranked[0]);
    const score1 = calculateZoneRiskScore(ranked[1]);
    const score2 = calculateZoneRiskScore(ranked[2]);

    assert.ok(score0 >= score1, "Rank #1 score must be >= Rank #2 score");
    assert.ok(score1 >= score2, "Rank #2 score must be >= Rank #3 score");
  });
});
