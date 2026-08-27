/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { submitHeatmap, getHeatmapStatus } from "@/lib/fortyguard/client";
import { GeoJSONFeatureCollection, GeoJSONPolygon } from "@/lib/fortyguard/types";

export async function GET() {
  console.log("==================================================");
  console.log("Executing PART 9: First real FortyGuard API call...");
  console.log("==================================================");

  // 1. Define Phoenix, AZ GeoJSON polygon AOI
  const phoenixAOI: GeoJSONFeatureCollection<GeoJSONPolygon> = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-112.0790, 33.4435],
              [-112.0690, 33.4435],
              [-112.0690, 33.4525],
              [-112.0790, 33.4525],
              [-112.0790, 33.4435],
            ],
          ],
        },
      },
    ],
  };

  try {
    // 2. Submit Heatmap task with granularity "100m" and date string "2024-07-15T14:00:00Z"
    const submitResult = await submitHeatmap({
      polygon_aoi: phoenixAOI,
      granularity: "100m" as any,
      date_time: "2024-07-15T14:00:00Z" as any,
    });

    const activityId = submitResult.data.activity_id;
    console.log(">>> [SUCCESS] submitHeatmap returned activity_id:", activityId);

    // 3. Call getHeatmapStatus(activity_id) to check initial status
    const statusResult = await getHeatmapStatus(activityId);
    console.log(">>> [SUCCESS] getHeatmapStatus response:", JSON.stringify(statusResult, null, 2));
    console.log("==================================================");

    return NextResponse.json({
      success: true,
      activity_id: activityId,
      submitResponse: submitResult,
      statusResponse: statusResult,
    });
  } catch (error: unknown) {
    const errObj = error as { message?: string; details?: unknown; data?: unknown };
    console.error(">>> [ERROR] FortyGuard API call failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: errObj.message || String(error),
        details: errObj.details || errObj.data || null,
      },
      { status: 500 }
    );
  }
}
