/**
 * Heat Risk Assessment Contract
 */
export type RiskBand = "low" | "moderate" | "high" | "critical";

export interface RiskComponents {
  heatExposure: number;
  persistence: number;
  vulnerability: number;
  coolingAccessGap?: number;
}

export interface ZoneRisk {
  zoneId: string;
  totalScore: number;
  band: RiskBand;
  components: RiskComponents;
}
