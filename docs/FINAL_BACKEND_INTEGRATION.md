# CoolCity AI: Final Backend Integration Guide

This document outlines the structural migration plan to transfer the Member 1 backend services, FortyGuard ingestion engine, and Track 6 Agentic workflows into the unified `web/` Next.js monorepo application.

---

## 1. Directory Mapping Summary

| Current Location (`feat/fortyguard-api`) | Target Location (`web/`) | Purpose |
| :--- | :--- | :--- |
| `src/app/api/heatmap/route.ts` | `web/src/app/api/heatmap/route.ts` | Server-side FortyGuard heat ingestion endpoint |
| `src/app/api/agent/plan/route.ts` | `web/src/app/api/agent/plan/route.ts` | Track 6 Autonomous Resource Planning endpoint |
| `src/lib/fortyguard/` | `web/src/lib/fortyguard/` | FortyGuard API client, response normalizer, and spatial tiling engine |
| `src/lib/agent/` | `web/src/lib/agent/` | Gemini function-calling agent workflow & 7 agent tools |
| `src/lib/allocation/` | `web/src/lib/allocation/` | Deterministic integer resource allocation engine |
| `src/lib/zones/` | `web/src/lib/zones/` | Canonical Census Tract analytics data store & GEOID lookups |
| `src/lib/risk/` | `web/src/lib/risk/` | Authoritative Track 7 risk score consumption service |
| `src/lib/resources/` | `web/src/lib/resources/` | Municipal resource inventory store |
| `src/lib/validation/` | `web/src/lib/validation/` | Zod validation schemas for requests and domain models |
| `src/types/` | `web/src/types/` | Shared TypeScript domain interfaces |

---

## 2. Cross-Branch Data Integration

When merging with Member 2's Track 7 Analytics output:
- Ensure `data/processed/phoenix_tract_risk.json` is present.
- `web/src/lib/zones/zone-service.ts` will automatically load `phoenix_tract_risk.json` ($N=230$ Census Tracts, 11-character GEOIDs) at runtime.

---

## 3. Environment Configuration

Ensure `.env.local` inside `web/` includes:
```env
FORTYGUARD_API_KEY=your_fortyguard_api_key
GEMINI_API_KEY=your_gemini_api_key
```
