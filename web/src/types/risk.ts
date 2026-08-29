/**
 * Heat Risk Assessment Contract (Consuming Authoritative Track 7 riskScore)
 */
export type RiskBand = "low" | "moderate" | "high" | "critical";

export interface RiskComponents {
  heatExposure: number;
  persistence?: number;
  vulnerability: number;
  coolingAccessGap?: number;
}

export interface ZoneRisk {
  zoneId: string; // Census Tract GEOID (e.g. "04013113900" or "tract-04013113900")
  totalScore: number; // Authoritative riskScore from Track 7
  band: RiskBand;
  components?: RiskComponents;
}
