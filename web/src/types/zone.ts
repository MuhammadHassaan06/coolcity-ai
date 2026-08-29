/**
 * Core Canonical Census Tract Record & Zone Domain Model
 */
export interface CanonicalTractRecord {
  id: string; // e.g. "tract-04013113900"
  code: string; // e.g. "04013113900"
  name: string; // e.g. "Census Tract 1139"
  geoid: string; // e.g. "04013113900"
  riskScore: number;
  status: "low" | "moderate" | "high" | "critical";
  avgTemperature: number;
  affectedPopulation: number;
}

export interface Zone {
  id: string;
  name: string;
  geoid?: string;
  geometry?: {
    type: string;
    coordinates?: unknown;
    [key: string]: unknown;
  };
}
