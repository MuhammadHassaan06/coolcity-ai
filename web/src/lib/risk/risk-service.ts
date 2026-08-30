import { ZoneRisk, RiskBand } from "../../types/risk";
import { getZones, getZoneByGeoid } from "../zones/zone-service";

/**
 * Retrieves the authoritative Track 7 risk score for a specific Census Tract GEOID.
 * Track 7 owns risk calculation (riskScore and risk status band).
 */
export async function getZoneRisk(idOrGeoid: string, snapshotId: string = "2026-08-30-1400"): Promise<ZoneRisk | null> {
  const zone = await getZoneByGeoid(idOrGeoid, snapshotId);
  if (!zone) {
    return null;
  }
  return {
    zoneId: zone.geoid,
    totalScore: zone.riskScore,
    band: zone.status as RiskBand,
    components: {
      heatExposure: zone.avgTemperature,
      vulnerability: zone.riskScore,
    },
  };
}

/**
 * Returns all zone risk records sorted deterministically by totalScore descending.
 * Ties are broken deterministically by zoneId ascending.
 */
export async function getAllZoneRisks(snapshotId: string = "2026-08-30-1400"): Promise<ZoneRisk[]> {
  const zones = await getZones(snapshotId);
  const risks: ZoneRisk[] = zones.map((z) => ({
    zoneId: z.geoid,
    totalScore: z.riskScore,
    band: z.status as RiskBand,
    components: {
      heatExposure: z.avgTemperature,
      vulnerability: z.riskScore,
    },
  }));

  return risks.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.zoneId.localeCompare(b.zoneId);
  });
}

/**
 * @deprecated Legacy prototype calculation formula. Reserved strictly for unit tests.
 * Production Track 6 consumes authoritative Track 7 riskScore.
 */
export function calculateDevelopmentMockRisk(
  zoneId: string,
  heat: { meanTemp?: number } | null | undefined,
  vuln: { compositeScore?: number } | null | undefined
): ZoneRisk {
  const heatScore = heat?.meanTemp ? Math.min(100, Math.max(0, (heat.meanTemp - 25) * 4)) : 50;
  const vulnScore = vuln?.compositeScore ? vuln.compositeScore : 50;
  const total = Number((0.5 * heatScore + 0.5 * vulnScore).toFixed(2));

  let band: RiskBand = "moderate";
  if (total >= 75) band = "critical";
  else if (total >= 50) band = "high";
  else if (total >= 25) band = "moderate";
  else band = "low";

  return {
    zoneId,
    totalScore: total,
    band,
    components: {
      heatExposure: heatScore,
      vulnerability: vulnScore,
    },
  };
}
