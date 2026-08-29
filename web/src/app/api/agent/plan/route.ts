import { NextRequest, NextResponse } from "next/server";
import { runCoolCityPlanningAgent } from "@/lib/agent/agent";
import { AgentPlanRequestSchema } from "@/lib/agent/schemas";
import { AgentValidationError, GeminiConfigError } from "@/lib/agent/errors";

export const maxDuration = 60; // Next.js serverless route max duration

/**
 * POST /api/agent/plan
 * Track 6 Agent Planning Endpoint for CoolCity AI.
 * Accepts goal, authoritative inventory, and optional zone scope.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request payload.",
        },
        { status: 400 }
      );
    }

    // Validate payload against AgentPlanRequestSchema
    const validation = AgentPlanRequestSchema.safeParse(body);
    if (!validation.success) {
      const issueMsgs = validation.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${issueMsgs}`,
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const requestPayload = validation.data;

    // Run Track 6 Agentic Workflow
    const plan = await runCoolCityPlanningAgent(requestPayload);

    return NextResponse.json(
      {
        success: true,
        plan,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof AgentValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
        },
        { status: 400 }
      );
    }

    if (error instanceof GeminiConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "An unexpected server error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
