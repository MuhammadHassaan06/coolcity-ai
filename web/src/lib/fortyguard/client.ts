import "server-only";
import {
  FortyGuardHeatmapRequest,
  FortyGuardHeatmapSubmitResponse,
  FortyGuardStatusResponse,
} from "./types";

const FORTYGUARD_BASE_URL = "https://api.fortyguard.com/v1";

function getApiKey(): string {
  const apiKey = process.env.FORTYGUARD_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("FortyGuard API key missing: process.env.FORTYGUARD_API_KEY is not configured.");
  }
  return apiKey.trim();
}

export async function submitHeatmap(
  requestPayload: FortyGuardHeatmapRequest
): Promise<FortyGuardHeatmapSubmitResponse> {
  const apiKey = getApiKey();
  const url = `${FORTYGUARD_BASE_URL}/heatmap`;

  const rawReq = (requestPayload as unknown) as Record<string, unknown>;
  const rawDateTime = (rawReq.date_time || rawReq.dateTime || {}) as Record<string, unknown>;

  const upstreamPayload = {
    polygon_aoi: rawReq.polygon_aoi || rawReq.aoi,
    date_time: {
      start_date: rawDateTime.start_date || rawDateTime.startDate || "2024-07-15",
      filter_type: rawDateTime.filter_type ?? rawDateTime.filterType ?? 1,
      start_time: rawDateTime.start_time || rawDateTime.startTime || "14:00",
    },
    granularity: rawReq.granularity ?? 100,
    analytic_type: rawReq.analytic_type || rawReq.analyticType || "tcm",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(upstreamPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FortyGuard submit API error [${response.status}]: ${errorText}`);
  }

  return response.json();
}

export async function getHeatmapStatus(
  activityId: string
): Promise<FortyGuardStatusResponse> {
  const apiKey = getApiKey();
  const url = `${FORTYGUARD_BASE_URL}/status/${encodeURIComponent(activityId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FortyGuard status API error [${response.status}]: ${errorText}`);
  }

  return response.json();
}
