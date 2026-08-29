import { FortyGuardStatusResponse, NormalizedHeatmapResponse } from "./types";

interface RawFeature {
  id?: string | number;
  type?: string;
  properties?: {
    tile_id?: number;
    average_temperature?: number;
    min_temperature?: number;
    max_temperature?: number;
  };
  geometry?: {
    type: string;
    coordinates: number[][][];
  };
}

export function normalizeFortyGuardResponse(
  raw: FortyGuardStatusResponse
): NormalizedHeatmapResponse {
  const data = raw.data;
  const result = data?.result;
  const mapDataRaw = result?.map_data || { type: "FeatureCollection", features: [] };
  const statsDataRaw = result?.stats_data?.temperature_stats || {
    minimum: 0,
    maximum: 0,
    mean: 0,
    standard_deviation: 0,
  };

  const rawFeatures: RawFeature[] = Array.isArray(mapDataRaw.features) ? mapDataRaw.features : [];

  const normalizedFeatures = rawFeatures.map((feat, index) => {
    const props = feat.properties || {};
    const avgTemp = typeof props.average_temperature === "number" ? props.average_temperature : 0;
    const minTemp = typeof props.min_temperature === "number" ? props.min_temperature : avgTemp;
    const maxTemp = typeof props.max_temperature === "number" ? props.max_temperature : avgTemp;

    const fallbackGeometry: { type: "Polygon"; coordinates: number[][][] } = {
      type: "Polygon",
      coordinates: feat.geometry?.coordinates || [],
    };

    return {
      id: String(feat.id ?? index),
      type: "Feature" as const,
      properties: {
        tileId: typeof props.tile_id === "number" ? props.tile_id : index,
        averageTemperatureC: Number(avgTemp.toFixed(4)),
        minTemperatureC: Number(minTemp.toFixed(4)),
        maxTemperatureC: Number(maxTemp.toFixed(4)),
      },
      geometry: fallbackGeometry,
    };
  });

  return {
    metadata: {
      activityId: String(data?.activity_id || ""),
      status: String(data?.status || raw.message || "Unknown"),
      tileCount: normalizedFeatures.length,
    },
    stats: {
      minTemperature: Number(statsDataRaw.minimum.toFixed(4)),
      maxTemperature: Number(statsDataRaw.maximum.toFixed(4)),
      meanTemperature: Number(statsDataRaw.mean.toFixed(4)),
      standardDeviation: Number(statsDataRaw.standard_deviation.toFixed(4)),
      unit: "C",
    },
    mapData: {
      type: "FeatureCollection",
      features: normalizedFeatures,
    },
  };
}
