/**
 * Heat Metrics Contract for Zone Analytics
 */
export interface HeatMetrics {
  zoneId: string;
  meanTemp: number | null;
  maxTemp: number | null;
  temperatureUnit: "C" | "F";
  persistenceScore: number | null;
  exceedanceScore: number | null;
  historicalDeviation: number | null;
  dataTimestamp: string;
}
