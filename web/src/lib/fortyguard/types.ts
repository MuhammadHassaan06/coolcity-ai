export interface FortyGuardHeatmapRequest {
  aoi: {
    type: "FeatureCollection" | "Feature" | "Polygon";
    [key: string]: unknown;
  };
  dateTime?: {
    startDate?: string;
    filterType?: number;
    startTime?: string;
  };
  granularity?: number;
  analyticType?: string;
}

export type CoolCityHeatmapRequest = FortyGuardHeatmapRequest;

export interface FortyGuardHeatmapSubmitResponse {
  error: boolean;
  status_code: number;
  message: string;
  data?: {
    activity_id: string;
    status: string;
    message?: string;
    [key: string]: unknown;
  };
}

export interface FortyGuardStatusResponse {
  error: boolean;
  status_code: number;
  message: string;
  data?: {
    activity_id: string;
    status: string;
    message?: string;
    result?: {
      map_data?: {
        type: string;
        features: Array<{
          id: string | number;
          type: string;
          properties: {
            tile_id: number;
            average_temperature: number;
            min_temperature?: number;
            max_temperature?: number;
          };
          geometry: {
            type: string;
            coordinates: number[][][];
          };
        }>;
      };
      stats_data?: {
        temperature_stats?: {
          minimum: number;
          maximum: number;
          mean: number;
          standard_deviation: number;
        };
      };
    };
  };
}

export interface NormalizedHeatmapResponse {
  metadata: {
    activityId: string;
    status: string;
    tileCount: number;
  };
  stats: {
    minTemperature: number;
    maxTemperature: number;
    meanTemperature: number;
    standardDeviation: number;
    unit: "C";
  };
  mapData: {
    type: "FeatureCollection";
    features: Array<{
      id: string;
      type: "Feature";
      properties: {
        tileId: number;
        averageTemperatureC: number;
        minTemperatureC: number;
        maxTemperatureC: number;
      };
      geometry: {
        type: "Polygon";
        coordinates: number[][][];
      };
    }>;
  };
}
