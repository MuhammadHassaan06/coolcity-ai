# Real FortyGuard API Response Discovery & Schema Reference

This document records the empirical results, observed runtime schema, and exact response structure discovered during the first live FortyGuard API integration test for CoolCity AI.

---

## 1. Test Execution Metadata

| Parameter | Value |
|---|---|
| **API Endpoint** | `POST https://api.fortyguard.com/v1/heatmap` |
| **Status Endpoint** | `GET https://api.fortyguard.com/v1/status/{activity_id}` |
| **Authentication** | `api-key` header loaded from `process.env.FORTYGUARD_API_KEY` |
| **Study Region (AOI)** | Phoenix, Arizona rectangular polygon (Bounding box: `-112.0790, 33.4435` to `-112.0690, 33.4525`) |
| **Historical Time Window** | `2024-07-15` at `14:00` UTC (`filter_type: 1` — single hour) |
| **Granularity** | `100` (meters) |
| **Analytic Type** | `"tcm"` (Thermal City Map / baseline snapshot) |
| **Returned Activity ID** | `59de67ca-1570-41b9-9bee-6c8a58e27a1a` |
| **Polling Duration** | **30.6 seconds** (5 polling attempts @ 5s interval) |
| **Final Activity Status** | `"Completed"` |

---

## 2. Observed Top-Level Response Schema

```json
{
  "error": false,
  "status_code": 200,
  "message": "Completed",
  "data": {
    "activity_id": "59de67ca-1570-41b9-9bee-6c8a58e27a1a",
    "status": "Completed",
    "result": {
      "map_data": { ... },
      "stats_data": { ... }
    }
  }
}
```

---

## 3. Observed `map_data` Schema

- **Type**: `GeoJSON FeatureCollection` (`data.result.map_data.type = "FeatureCollection"`)
- **Features Array**: `data.result.map_data.features` (Array of 72 tile features for the test AOI)
- **Feature Geometry**:
  - `type`: `"Polygon"`
  - `coordinates`: Array of 5 `[longitude, latitude]` coordinate pairs forming a closed rectangular grid tile loop.
- **Feature Properties**:
  - `tile_id` (*number*): Integer index identifying the tile (e.g. `0`, `1`, `2`, ...).
  - `average_temperature` (*number*): Average surface temperature across the tile.
  - `min_temperature` (*number*): Minimum surface temperature across the tile.
  - `max_temperature` (*number*): Maximum surface temperature across the tile.
- **Temperature Fields**:
  - Primary single-value field: `average_temperature` (for `filter_type: 1`).
  - Auxiliary range fields: `min_temperature`, `max_temperature`.
- **Temperature Unit**:
  - **Degrees Celsius (°C)**. (e.g., observed mean value is `39.72°C`, which corresponds to ~`103.5°F` typical of Phoenix afternoon heat).

### Sample Feature Object

```json
{
  "id": "0",
  "type": "Feature",
  "properties": {
    "tile_id": 0,
    "average_temperature": 39.7388,
    "min_temperature": 39.7388,
    "max_temperature": 39.7388
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-112.07754454301283, 33.44447034550224],
        [-112.07649201348598, 33.44447948784164],
        [-112.07650351656964, 33.445410658823334],
        [-112.07755605733821, 33.44540151616267],
        [-112.07754454301283, 33.44447034550224]
      ]
    ]
  }
}
```

---

## 4. Observed `stats_data` Schema

`data.result.stats_data` contains four primary statistical objects:

### 1. `temperature_stats`
- `minimum` (*number*): Lowest tile temperature in the AOI (`39.6957°C`).
- `maximum` (*number*): Highest tile temperature in the AOI (`39.7523°C`).
- `mean` (*number*): AOI-wide mean temperature (`39.722425°C`).
- `standard_deviation` (*number*): Standard deviation across tiles (`0.01507502...`).

### 2. `overall_temperature_distribution`
- Array of 5 numbers representing distribution quantiles `[min, 25th percentile, median, 75th percentile, max]`.
- Example: `[39.6957, 39.709175, 39.7204, 39.733725, 39.7523]`.

### 3. `normal_temperature_distribution`
- `x_axis` (*number[]*): Temperature bin values (°C).
- `y_axis` (*number[]*): Fitted normal distribution values.

### 4. `temperature_frequency`
- `x_axis` (*number[]*): Discrete temperature bin headers (e.g. `[40]`).
- `y_axis` (*number[]*): Frequency counts per bin (e.g. `[72]` tiles).

---

## 5. Security & Data Integrity Verification

- No API keys, secrets, or bearer tokens were logged or returned in body payloads.
- No temporary signed download URLs were contained in the response.
- Sanitized fixture saved at `src/lib/fortyguard/fixtures/fortyguard-sample-response.json`.
