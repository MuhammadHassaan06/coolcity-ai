export interface SubPolygonChunk {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    chunkIndex: number;
    bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    areaSqMi: number;
  };
}

export interface TilingPlan {
  boundarySource: string;
  generatedAt: string;
  coverage: string;
  totalSubPolygons: number;
  estimatedRequests: number;
  plannedRequests: number;
  configuredMaxAreaSqMi: number;
  configuredDailyRequestLimit: number;
  fitsWithinDailyLimit: boolean;
  cityBoundaryAreaSqMi: number;
  minChunkAreaSqMi: number;
  maxChunkAreaSqMi: number;
  meanChunkAreaSqMi: number;
  chunksExceedingMaxArea: number;
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  subPolygons: SubPolygonChunk[];
  planningOnly: boolean;
  warnings: string[];
}

export interface TilingOptions {
  maxAreaSqMi?: number;
  dailyRequestLimit?: number;
  maxChunkSpanDegrees?: number; // Maintained for backwards compatibility if explicitly supplied
  safetyFactor?: number; // Default 0.95 (5% safety margin below configured max area)
  boundarySourceLabel?: string;
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
 * Computes approximate area in square miles for GeoJSON polygon rings using geodesic projection.
 */
export function computeGeoJsonAreaSqMi(coords: unknown): number {
  if (!Array.isArray(coords) || coords.length === 0) {
    return 0;
  }

  let totalAreaSqMi = 0;

  const processRings = (rings: unknown[]) => {
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 3) continue;

      const points = ring as Array<[number, number]>;
      const lats = points.map((p) => p[1]);
      const meanLatRad = (lats.reduce((sum, lat) => sum + lat, 0) / lats.length) * (Math.PI / 180);
      const latToMi = 69.0;
      const lngToMi = 69.0 * Math.cos(meanLatRad);

      let shoelaceSum = 0;
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = points[i][0] * lngToMi;
        const y1 = points[i][1] * latToMi;
        const x2 = points[j][0] * lngToMi;
        const y2 = points[j][1] * latToMi;
        shoelaceSum += x1 * y2 - x2 * y1;
      }

      totalAreaSqMi += Math.abs(shoelaceSum) / 2.0;
    }
  };

  const walkRings = (item: unknown) => {
    if (Array.isArray(item) && item.length > 0) {
      if (Array.isArray(item[0]) && item[0].length >= 2 && typeof item[0][0] === "number") {
        processRings([item]);
      } else {
        for (const child of item) {
          walkRings(child);
        }
      }
    }
  };

  walkRings(coords);
  return Number(totalAreaSqMi.toFixed(2));
}

/**
 * Point-in-polygon ray-casting algorithm for GeoJSON polygon rings.
 */
function pointInPolygonRing(pt: [number, number], ring: Array<[number, number]>): boolean {
  const x = pt[0];
  const y = pt[1];
  let inside = false;
  const n = ring.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

/**
 * Extracts all rings from GeoJSON geometry coordinates.
 */
function extractAllRings(coords: unknown): Array<Array<[number, number]>> {
  const rings: Array<Array<[number, number]>> = [];

  const walk = (item: unknown) => {
    if (Array.isArray(item) && item.length > 0) {
      if (Array.isArray(item[0]) && item[0].length >= 2 && typeof item[0][0] === "number") {
        rings.push(item as Array<[number, number]>);
      } else {
        for (const child of item) {
          walk(child);
        }
      }
    }
  };

  walk(coords);
  return rings;
}

/**
 * Checks if a grid chunk bounding box intersects the boundary polygon geometry.
 */
function chunkIntersectsBoundary(
  chunkBounds: [number, number, number, number],
  rings: Array<Array<[number, number]>>,
  boundaryBbox: [number, number, number, number]
): boolean {
  // Quick bounding box check
  if (
    chunkBounds[2] < boundaryBbox[0] ||
    chunkBounds[0] > boundaryBbox[2] ||
    chunkBounds[3] < boundaryBbox[1] ||
    chunkBounds[1] > boundaryBbox[3]
  ) {
    return false;
  }

  const [minLng, minLat, maxLng, maxLat] = chunkBounds;
  const samplePoints: Array<[number, number]> = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  ];

  for (const pt of samplePoints) {
    if (pointInPolygonRing(pt, rings[0] || [])) {
      return true;
    }
  }

  for (const ring of rings) {
    for (const pt of ring) {
      if (pt[0] >= minLng && pt[0] <= maxLng && pt[1] >= minLat && pt[1] <= maxLat) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generates an area-aware deterministic request tiling plan over a GeoJSON boundary.
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

  // 1. Resolve area and daily limit parameters
  const envMaxArea = process.env.FORTYGUARD_MAX_HEATMAP_AREA_SQ_MI
    ? parseFloat(process.env.FORTYGUARD_MAX_HEATMAP_AREA_SQ_MI)
    : undefined;
  const envDailyLimit = process.env.FORTYGUARD_DAILY_REQUEST_LIMIT
    ? parseInt(process.env.FORTYGUARD_DAILY_REQUEST_LIMIT, 10)
    : undefined;

  const maxAreaSqMi = options.maxAreaSqMi ?? envMaxArea ?? 25.0;
  const dailyRequestLimit = options.dailyRequestLimit ?? envDailyLimit ?? 30;

  if (!isFinite(maxAreaSqMi) || maxAreaSqMi <= 0) {
    throw new Error(`Invalid maxAreaSqMi configuration: '${maxAreaSqMi}'. Must be a positive number.`);
  }

  if (!isFinite(dailyRequestLimit) || dailyRequestLimit <= 0) {
    throw new Error(`Invalid dailyRequestLimit configuration: '${dailyRequestLimit}'. Must be a positive integer.`);
  }

  const safetyFactor = options.safetyFactor ?? 0.95;
  const effectiveTargetArea = maxAreaSqMi * safetyFactor;
  const sideMiles = Math.sqrt(effectiveTargetArea);

  const [minLng, minLat, maxLng, maxLat] = getBoundingBox(coords);
  const cityBoundaryAreaSqMi = computeGeoJsonAreaSqMi(coords);
  const rings = extractAllRings(coords);
  const boundaryBbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];

  // 2. Compute degree spans based on target area or fallback degree span
  let spanLatDeg: number;
  let spanLngDeg: number;

  if (options.maxChunkSpanDegrees && options.maxChunkSpanDegrees > 0) {
    spanLatDeg = options.maxChunkSpanDegrees;
    spanLngDeg = options.maxChunkSpanDegrees;
  } else {
    const centerLat = (minLat + maxLat) / 2.0;
    const latToMi = 69.0;
    const lngToMi = 69.0 * Math.cos((centerLat * Math.PI) / 180);
    spanLatDeg = sideMiles / latToMi;
    spanLngDeg = sideMiles / lngToMi;
  }

  const subPolygons: SubPolygonChunk[] = [];
  let chunkIndex = 0;

  let currentLat = minLat;
  while (currentLat < maxLat) {
    const nextLat = Math.min(currentLat + spanLatDeg, maxLat);
    const rowMeanLat = (currentLat + nextLat) / 2.0;
    const rowLatMiles = (nextLat - currentLat) * 69.0;
    const rowLngToMi = 69.0 * Math.cos((rowMeanLat * Math.PI) / 180);

    let currentLng = minLng;
    while (currentLng < maxLng) {
      const nextLng = Math.min(currentLng + spanLngDeg, maxLng);

      const chunkBounds: [number, number, number, number] = [
        Number(currentLng.toFixed(6)),
        Number(currentLat.toFixed(6)),
        Number(nextLng.toFixed(6)),
        Number(nextLat.toFixed(6)),
      ];

      if (chunkIntersectsBoundary(chunkBounds, rings, boundaryBbox)) {
        const colLngMiles = (nextLng - currentLng) * rowLngToMi;
        const chunkAreaSqMi = Number((rowLatMiles * colLngMiles).toFixed(4));

        const chunkCoordinates = [
          [
            [chunkBounds[0], chunkBounds[1]],
            [chunkBounds[2], chunkBounds[1]],
            [chunkBounds[2], chunkBounds[3]],
            [chunkBounds[0], chunkBounds[3]],
            [chunkBounds[0], chunkBounds[1]],
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
            bounds: chunkBounds,
            areaSqMi: chunkAreaSqMi,
          },
        });

        chunkIndex++;
      }

      currentLng += spanLngDeg;
    }

    currentLat += spanLatDeg;
  }

  // 3. Compute chunk statistics
  const chunkAreas = subPolygons.map((p) => p.properties.areaSqMi);
  const totalPlanned = subPolygons.length;
  const minChunkAreaSqMi = chunkAreas.length > 0 ? Number(Math.min(...chunkAreas).toFixed(2)) : 0;
  const maxChunkAreaSqMi = chunkAreas.length > 0 ? Number(Math.max(...chunkAreas).toFixed(2)) : 0;
  const meanChunkAreaSqMi =
    chunkAreas.length > 0
      ? Number((chunkAreas.reduce((a, b) => a + b, 0) / chunkAreas.length).toFixed(2))
      : 0;

  const chunksExceedingMaxArea = chunkAreas.filter((a) => a > maxAreaSqMi + 1e-3).length;
  const fitsWithinDailyLimit = totalPlanned <= dailyRequestLimit;

  const warnings: string[] = [];
  if (!fitsWithinDailyLimit) {
    warnings.push(
      `Planned requests (${totalPlanned}) exceed configured daily limit (${dailyRequestLimit}). Batch execution is disabled by default.`
    );
  }

  return {
    boundarySource: options.boundarySourceLabel || "public/data/phoenix-city-boundary.geojson",
    generatedAt: new Date().toISOString(),
    coverage: "City of Phoenix boundary",
    totalSubPolygons: totalPlanned,
    estimatedRequests: totalPlanned,
    plannedRequests: totalPlanned,
    configuredMaxAreaSqMi: maxAreaSqMi,
    configuredDailyRequestLimit: dailyRequestLimit,
    fitsWithinDailyLimit,
    cityBoundaryAreaSqMi,
    minChunkAreaSqMi,
    maxChunkAreaSqMi,
    meanChunkAreaSqMi,
    chunksExceedingMaxArea,
    bounds: {
      minLng: Number(minLng.toFixed(6)),
      minLat: Number(minLat.toFixed(6)),
      maxLng: Number(maxLng.toFixed(6)),
      maxLat: Number(maxLat.toFixed(6)),
    },
    subPolygons,
    planningOnly: true,
    warnings,
  };
}
