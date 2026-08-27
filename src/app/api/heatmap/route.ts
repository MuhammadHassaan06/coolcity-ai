import { NextRequest, NextResponse } from "next/server";
import { submitHeatmap, getHeatmapStatus, normalizeFortyGuardResponse } from "@/lib/fortyguard/client";
import { SubmitHeatmapRequest } from "@/lib/fortyguard/types";

import { SubmitHeatmapRequestSchema, ActivityIdSchema } from "@/lib/validation/fortyguard";
import { FortyGuardApiError, FortyGuardValidationError, FortyGuardConfigError } from "@/lib/fortyguard/errors";

export const maxDuration = 60; // Next.js route max duration setting (if serverless)

/**
 * POST /api/heatmap
 * Accepts polygon_aoi, date_time, granularity (default 100), analytic_type ("tcm").
 * Option `wait` (boolean, default true): performs server-side bounded polling up to 40s.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wait = true, ...submitPayload } = body || {};

    // Validate request schema
    const validationResult = SubmitHeatmapRequestSchema.safeParse(submitPayload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Submit heatmap task to FortyGuard API
    const submitResponse = await submitHeatmap(validationResult.data as unknown as SubmitHeatmapRequest);

    const activityId = submitResponse?.data?.activity_id;

    if (!activityId) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to obtain activity_id from FortyGuard submission.",
        },
        { status: 500 }
      );
    }

    // If caller explicitly set wait: false, return activity_id immediately for asynchronous client polling
    if (!wait) {
      return NextResponse.json({
        success: true,
        activity_id: activityId,
        status: "pending",
        message: "Heatmap task submitted successfully.",
      });
    }

    // Server-side bounded polling (max 40s to respect server HTTP timeout limits)
    const startTime = Date.now();
    const maxPollMs = 40000;
    const pollIntervalMs = 3000;

    while (Date.now() - startTime < maxPollMs) {
      const statusResponse = await getHeatmapStatus(activityId);
      const statusRaw = statusResponse?.data?.status || "pending";
      const statusLower = statusRaw.toLowerCase();

      if (["completed", "succeeded"].includes(statusLower)) {
        const normalized = normalizeFortyGuardResponse(statusResponse);
        return NextResponse.json({
          success: true,
          activity_id: activityId,
          status: statusRaw,
          data: normalized,
        });
      }

      if (["failed", "error"].includes(statusLower)) {
        return NextResponse.json(
          {
            success: false,
            activity_id: activityId,
            status: statusRaw,
            error: statusResponse?.data?.message || statusResponse?.message || "Heatmap processing failed.",
          },
          { status: 500 }
        );
      }

      await new Promise((res) => setTimeout(res, pollIntervalMs));
    }

    // If task is still processing after 40s, return activity_id for client side status check
    return NextResponse.json({
      success: true,
      activity_id: activityId,
      status: "Processing",
      message: "Task is still processing. Check status using GET /api/heatmap?activity_id=" + activityId,
    });
  } catch (error: unknown) {
    if (error instanceof FortyGuardValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: 400 }
      );
    }

    if (error instanceof FortyGuardConfigError) {
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    if (error instanceof FortyGuardApiError) {
      const code = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
      return NextResponse.json(
        { success: false, error: "FortyGuard service error.", statusCode: error.statusCode },
        { status: code }
      );
    }


    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/heatmap?activity_id={activity_id}
 * Checks current status of an activity_id and returns normalized data if completed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activity_id");

    const validationResult = ActivityIdSchema.safeParse(activityId);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid activity_id parameter",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const statusResponse = await getHeatmapStatus(validationResult.data);
    const statusRaw = statusResponse?.data?.status || "pending";
    const statusLower = statusRaw.toLowerCase();

    if (["completed", "succeeded"].includes(statusLower)) {
      const normalized = normalizeFortyGuardResponse(statusResponse);
      return NextResponse.json({
        success: true,
        activity_id: validationResult.data,
        status: statusRaw,
        data: normalized,
      });
    }

    return NextResponse.json({
      success: true,
      activity_id: validationResult.data,
      status: statusRaw,
      message: statusResponse?.data?.message || "Heatmap generation is in progress.",
    });
  } catch (error: unknown) {
    if (error instanceof FortyGuardValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof FortyGuardApiError) {
      const code = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
      return NextResponse.json(
        { success: false, error: "FortyGuard status check error.", statusCode: error.statusCode },
        { status: code }
      );
    }


    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
