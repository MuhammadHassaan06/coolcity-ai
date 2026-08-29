export interface SubPolygonChunk {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    chunkIndex: number;
    bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  };
}

export interface TilingPlan {
  totalSubPolygons: number;
  estimatedRequests: number;
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  subPolygons: SubPolygonChunk[];
  configuredMaxChunkSpanDegrees: number;
}

export interface TilingOptions {
  maxChunkSpanDegrees?: number; // Default 0.02 degrees (~2.2 km x 2.2 km)
}

export type GeoJSONGeometryInput =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "Feature"; geometry?: { type: string; coordinates: unknown } }
  | { type: "FeatureCollection"; features?: Array<{ geometry?: { type: string; coordinates: unknown } }> }
  | Record<string, unknown>;

/**
 * Validates coordinate ranges for GeoJSON geometry.
 */
export function validateCoordinates(coords: unknown): void {
  if (!Array.isArray(coords) || coords.length === 0) {
    throw new Error("Invalid geometry: coordinates array is empty or missing");
  }

  const checkPair = (pair: unknown) => {
    if (!Array.isArray(pair) || pair.length < 2) {
      throw new Error("Invalid coordinate pair");
    }
    const [lng, lat] = pair;
    if (typeof lng !== "number" || typeof lat !== "number" || !isFinite(lng) || !isFinite(lat)) {
      throw new Error("Coordinates must be valid finite numbers");
    }
    if (lng < -180 || lng > 180) {
      throw new Error(`Longitude ${lng} out of bounds [-180, 180]`);
    }
    if (lat < -90 || lat > 90) {
      throw new Error(`Latitude ${lat} out of bounds [-90, 90]`);
    }
  };

  const walk = (item: unknown) => {
    if (Array.isArray(item)) {
      if (typeof item[0] === "number") {
        checkPair(item);
      } else {
        for (const child of item) {
          walk(child);
        }
      }
    }
  };

  walk(coords);
}

/**
 * Extracts bounding box [minLng, minLat, maxLng, maxLat] from GeoJSON coordinates.
 */
export function getBoundingBox(coords: unknown): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const walk = (item: unknown) => {
    if (Array.isArray(item)) {
      if (typeof item[0] === "number") {
        const [lng, lat] = item as [number, number];
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      } else {
        for (const child of item) {
          walk(child);
        }
      }
    }
  };

  walk(coords);

  if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
    throw new Error("Failed to compute valid bounding box for geometry");
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Generates a deterministic grid of bounded sub-polygons over a input GeoJSON boundary.
 */
export function generateTilingPlan(
  geojsonGeometry: GeoJSONGeometryInput,
  options: TilingOptions = {}
): TilingPlan {
  if (!geojsonGeometry || typeof geojsonGeometry !== "object") {
    throw new Error("GeoJSON geometry is required for tiling plan generation");
  }

  let coords: unknown;
  const geomType = (geojsonGeometry as { type?: string }).type;

  if (geomType === "Polygon" || geomType === "MultiPolygon") {
    coords = (geojsonGeometry as { coordinates?: unknown }).coordinates;
  } else if (geomType === "Feature") {
    coords = (geojsonGeometry as { geometry?: { coordinates?: unknown } }).geometry?.coordinates;
  } else if (geomType === "FeatureCollection") {
    const features = (geojsonGeometry as { features?: Array<{ geometry?: { coordinates?: unknown } }> }).features;
    coords = features?.map((f) => f.geometry?.coordinates);
  } else {
    throw new Error(`Unsupported GeoJSON geometry type for tiling: ${geomType}`);
  }

  validateCoordinates(coords);

  const [minLng, minLat, maxLng, maxLat] = getBoundingBox(coords);
  const maxSpan = options.maxChunkSpanDegrees || 0.02;

  const subPolygons: SubPolygonChunk[] = [];
  let chunkIndex = 0;

  for (let currentLat = minLat; currentLat < maxLat; currentLat += maxSpan) {
    const nextLat = Math.min(currentLat + maxSpan, maxLat);

    for (let currentLng = minLng; currentLng < maxLng; currentLng += maxSpan) {
      const nextLng = Math.min(currentLng + maxSpan, maxLng);

      const chunkCoordinates = [
        [
          [Number(currentLng.toFixed(6)), Number(currentLat.toFixed(6))],
          [Number(nextLng.toFixed(6)), Number(currentLat.toFixed(6))],
          [Number(nextLng.toFixed(6)), Number(nextLat.toFixed(6))],
          [Number(currentLng.toFixed(6)), Number(nextLat.toFixed(6))],
          [Number(currentLng.toFixed(6)), Number(currentLat.toFixed(6))],
        ],
      ];

      subPolygons.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: chunkCoordinates,
        },
        properties: {
          chunkIndex,
          bounds: [
            Number(currentLng.toFixed(6)),
            Number(currentLat.toFixed(6)),
            Number(nextLng.toFixed(6)),
            Number(nextLat.toFixed(6)),
          ],
        },
      });

      chunkIndex++;
    }
  }

  return {
    totalSubPolygons: subPolygons.length,
    estimatedRequests: subPolygons.length,
    bounds: {
      minLng: Number(minLng.toFixed(6)),
      minLat: Number(minLat.toFixed(6)),
      maxLng: Number(maxLng.toFixed(6)),
      maxLat: Number(maxLat.toFixed(6)),
    },
    subPolygons,
    configuredMaxChunkSpanDegrees: maxSpan,
  };
}
