import { NextRequest, NextResponse } from "next/server";
import { runCoolCityAgent, GeminiConfigError } from "@/lib/agent/gemini";
import { z } from "zod";

export const maxDuration = 60; // Next.js route max duration setting

const AgentPlanRequestSchema = z.object({
  prompt: z
    .string({ required_error: "Prompt is required" })
    .trim()
    .min(1, "Prompt cannot be empty"),
});

/**
 * POST /api/agent/plan
 * Executes the CoolCity AI Autonomous Agentic Planning workflow.
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

    const validation = AgentPlanRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed: Prompt string is required.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { prompt } = validation.data;

    // Run the agentic workflow
    const plan = await runCoolCityAgent(prompt);

    return NextResponse.json(
      {
        success: true,
        plan: {
          summary: plan.summary,
          toolExecutions: plan.toolExecutions,
          allocations: plan.allocations,
          remainingInventory: plan.remainingInventory,
          warnings: plan.warnings,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
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
