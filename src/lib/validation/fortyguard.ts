import { z } from "zod";

export const ActivityIdSchema = z.string().min(1, "Activity ID must be a non-empty string");

export const CoolCityHeatmapRequestSchema = z.object({
  aoi: z
    .object({
      type: z.enum(["FeatureCollection", "Feature", "Polygon"]),
    })
    .passthrough(),
  dateTime: z
    .object({
      startDate: z.string().optional(),
      filterType: z.number().int().optional(),
      startTime: z.string().optional(),
    })
    .optional(),
  granularity: z.number().int().positive().optional(),
  analyticType: z.string().optional(),
  mode: z.enum(["single", "batch-plan"]).optional(),
  maxChunkSpanDegrees: z.number().positive().optional(),
});

export type CoolCityHeatmapRequestInput = z.infer<typeof CoolCityHeatmapRequestSchema>;
