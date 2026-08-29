import { NextRequest, NextResponse } from "next/server";
import {
  submitHeatmap,
  getHeatmapStatus,
} from "@/lib/fortyguard/client";
import { normalizeFortyGuardResponse } from "@/lib/fortyguard/normalize";
import { generateTilingPlan } from "@/lib/fortyguard/tiling";
import { CoolCityHeatmapRequest } from "@/lib/fortyguard/types";
import { CoolCityHeatmapRequestSchema, ActivityIdSchema } from "@/lib/validation/fortyguard";
import {
  FortyGuardValidationError,
  FortyGuardMalformedResponseError,
  FortyGuardTimeoutError,
  toCoolCityErrorResponse,
} from "@/lib/fortyguard/errors";

export const maxDuration = 60; // Next.js route max duration setting (serverless/edge)

/**
 * POST /api/heatmap
 * Accepts a validated CoolCity-specific heatmap request.
 * Supports mode: "batch-plan" (default offline dry-run) | "single" | "batch-execute".
 * Enforces strict daily limit safety guard and confirmation header for live execution.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new FortyGuardValidationError("Invalid JSON body in request");
    }

    // Validate request schema
    const validationResult = CoolCityHeatmapRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const issueMessages = validationResult.error.issues.map((i) => i.message).join("; ");
      throw new FortyGuardValidationError(
        `Validation failed: ${issueMessages}`,
        validationResult.error.flatten()
      );
    }

    const coolCityRequest = validationResult.data as unknown as CoolCityHeatmapRequest & {
      mode?: "single" | "batch-plan" | "batch-execute";
      maxAreaSqMi?: number;
      maxChunkSpanDegrees?: number;
      dailyRequestLimit?: number;
    };

    const requestMode = coolCityRequest.mode || "batch-plan";

    // 1. Offline Dry-Run Batch Planning Mode (Default)
    if (requestMode === "batch-plan") {
      const plan = generateTilingPlan(coolCityRequest.aoi, {
        maxAreaSqMi: coolCityRequest.maxAreaSqMi,
        maxChunkSpanDegrees: coolCityRequest.maxChunkSpanDegrees,
        dailyRequestLimit: coolCityRequest.dailyRequestLimit,
      });

      return NextResponse.json(
        {
          success: true,
          mode: "batch-plan",
          dryRun: true,
          plan,
        },
        { status: 200 }
      );
    }

    // 2. Batch Execution Guard Checks
    if (requestMode === "batch-execute") {
      const confirmHeader = req.headers.get("x-confirm-batch-execution");
      if (confirmHeader !== "true") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BATCH_EXECUTION_UNCONFIRMED",
              message:
                "Live batch execution requires explicit confirmation header 'x-confirm-batch-execution: true'. Default mode is dry-run planning only.",
            },
          },
          { status: 400 }
        );
      }

      const plan = generateTilingPlan(coolCityRequest.aoi, {
        maxAreaSqMi: coolCityRequest.maxAreaSqMi,
        dailyRequestLimit: coolCityRequest.dailyRequestLimit,
      });

      if (!plan.fitsWithinDailyLimit) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DAILY_LIMIT_EXCEEDED",
              message: `Batch execution rejected: Planned requests (${plan.plannedRequests}) exceed configured daily limit (${plan.configuredDailyRequestLimit}). Daily limit safety guard active.`,
            },
            plan: {
              plannedRequests: plan.plannedRequests,
              configuredDailyRequestLimit: plan.configuredDailyRequestLimit,
              fitsWithinDailyLimit: false,
            },
          },
          { status: 422 }
        );
      }
    }

    // 3. Single / Confirmed Live Request to FortyGuard
    const submitResponse = await submitHeatmap(coolCityRequest);
    const activityId = submitResponse?.data?.activity_id;

    if (!activityId) {
      throw new FortyGuardMalformedResponseError(
        "FortyGuard API submission succeeded but returned no activity_id."
      );
    }

    // 4. Perform bounded server-side polling (max 40s to prevent gateway timeout)
    const startTime = Date.now();
    const maxPollMs = 40000;
    const pollIntervalMs = 3000;

    while (Date.now() - startTime < maxPollMs) {
      const statusResponse = await getHeatmapStatus(activityId);
      const statusRaw = statusResponse?.data?.status || "pending";
      const statusLower = String(statusRaw).toLowerCase();

      if (["completed", "succeeded"].includes(statusLower)) {
        const normalizedData = normalizeFortyGuardResponse(statusResponse);
        return NextResponse.json(
          {
            success: true,
            activityId,
            status: "completed",
            data: normalizedData,
            warnings: [],
          },
          { status: 200 }
        );
      }

      if (["failed", "error"].includes(statusLower)) {
        const errorMsg =
          statusResponse?.data?.message ||
          statusResponse?.message ||
          "Heatmap generation failed on upstream FortyGuard service.";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UPSTREAM_ERROR",
              message: errorMsg,
            },
          },
          { status: 502 }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // 5. Polling timeout reached
    throw new FortyGuardTimeoutError("Heatmap generation timed out during status polling.");
  } catch (error: unknown) {
    const { response, httpStatus } = toCoolCityErrorResponse(error);
    return NextResponse.json(response, { status: httpStatus });
  }
}

/**
 * GET /api/heatmap?activity_id={activity_id}
 * Checks current status of a submitted activity_id and returns normalized data if completed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activity_id");

    const validationResult = ActivityIdSchema.safeParse(activityId);
    if (!validationResult.success) {
      throw new FortyGuardValidationError("Missing or invalid 'activity_id' query parameter.");
    }

    const statusResponse = await getHeatmapStatus(validationResult.data);
    const statusRaw = statusResponse?.data?.status || "pending";
    const statusLower = String(statusRaw).toLowerCase();

    if (["completed", "succeeded"].includes(statusLower)) {
      const normalizedData = normalizeFortyGuardResponse(statusResponse);
      return NextResponse.json(
        {
          success: true,
          activityId: validationResult.data,
          status: "completed",
          data: normalizedData,
          warnings: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        activityId: validationResult.data,
        status: statusRaw,
        message: statusResponse?.data?.message || "Heatmap generation is in progress.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const { response, httpStatus } = toCoolCityErrorResponse(error);
    return NextResponse.json(response, { status: httpStatus });
  }
}
