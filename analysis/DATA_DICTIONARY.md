# CoolCity AI - Track 7 Data Dictionary & Schema Documentation

## 1. Overview
This data dictionary details the schemas for all raw and derived datasets produced by the Track 7 Analytics Pipeline for Phoenix, Arizona.

Data sources:
- **FortyGuard tOS Enterprise API (`/v1/heatmap`)**: Real high-resolution thermal data at 100m spatial resolution across the Phoenix Urban Heat Island corridor.
- **U.S. Census Bureau ACS 5-Year Data via TIGERweb & CDC SVI**: Real socioeconomic indicators and Census Tract polygon boundaries for Maricopa County, Arizona (State FIPS `04`, County FIPS `013`).

---

## 2. Processed Tile Schema (`phoenix_risk_scored_tiles.*`)

| Field Name | Type | Units | Scale / Range | Raw vs Derived | Data Source | Calculation Method | Description |
|:---|:---:|:---:|:---:|:---:|:---|:---|:---|
| `tile_id` | `string` | ID | `FG-PHX-00000` – `FG-PHX-48198` | Raw / Standardized | FortyGuard API | Formatted sequential tile identifier | Unique spatial tile identifier |
| `latitude` | `float` | Decimal degrees (°N) | `33.379550` – `33.560452` | Derived (Centroid) | FortyGuard Geometry | Centroid calculated from tile geometry via EPSG:3857 projection | Centroid latitude (WGS84 EPSG:4326) |
| `longitude` | `float` | Decimal degrees (°W) | `-112.220543` – `-111.959458` | Derived (Centroid) | FortyGuard Geometry | Centroid calculated from tile geometry via EPSG:3857 projection | Centroid longitude (WGS84 EPSG:4326) |
| `district` | `string` | Categorical | Phoenix districts | Derived (Spatial classification) | Geographic Coordinates | Spatial classification based on municipal bounds | Phoenix neighborhood / municipal zone |
| `average_temperature` | `float` | Celsius (°C) | `34.70` – `36.70` | Raw | FortyGuard API | Real surface/ambient thermal reading | Daily average temperature |
| `min_temperature` | `float` | Celsius (°C) | `28.42` – `35.70` | Raw | FortyGuard API | Real minimum thermal reading | Daily minimum temperature |
| `max_temperature` | `float` | Celsius (°C) | `39.53` – `40.79` | Raw | FortyGuard API | Real maximum thermal reading | Daily peak temperature |
| `temperature` | `float` | Celsius (°C) | `34.70` – `36.70` | Raw / Standardized | FortyGuard API | Standardized alias for `average_temperature` | Primary temperature in Celsius |
| `temperature_f` | `float` | Fahrenheit (°F) | `94.46` – `98.06` | Derived | FortyGuard API | `(temperature * 9.0 / 5.0) + 32.0` | Primary temperature in Fahrenheit |
| `geoid` | `string` | FIPS Code | 11-digit string (e.g., `04013116500`) | Raw (Joined) | U.S. Census Bureau (TIGERweb) | Spatially joined via point-in-polygon / nearest tract | U.S. Census Tract GEOID (State 04, County 013) |
| `census_tract` | `string` | Display Name | Text (e.g., `Census Tract 1165`) | Raw (Joined) | U.S. Census Bureau (TIGERweb) | Spatially joined from Census Tract boundary | Census Tract display name |
| `poverty_rate` | `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0090` – `0.7340`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_POV150`) | `EP_POV150 / 100.0` (Persons below poverty threshold) | Fraction of tract population below federal poverty line |
| `elderly_rate` | `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0170` – `0.4010`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_AGE65`) | `EP_AGE65 / 100.0` (Persons aged 65 and older) | Fraction of tract population age 65+ |
| `no_vehicle_rate` | `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0000` – `0.4920`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_NOVEH`) | `EP_NOVEH / 100.0` (Households without vehicle) | Fraction of tract households with zero vehicle access |
| `unemployment_rate`| `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0000` – `0.2310`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_UNEMP`) | `EP_UNEMP / 100.0` (Civilian labor force unemployed) | Fraction of tract labor force unemployed |
| `disability_rate` | `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0160` – `0.3010`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_DISABL`) | `EP_DISABL / 100.0` (Noninstitutionalized disabled) | Fraction of tract population with a disability |
| `minority_rate` | `float` | Rate fraction | `0.0000` – `1.0000` (Observed: `0.0650` – `0.9880`) | Raw / Standardized | U.S. Census ACS 5-Yr (CDC SVI `EP_MINRTY`) | `EP_MINRTY / 100.0` (Non-white / Hispanic) | Fraction of tract population from minority demographics |
| `total_population` | `float` | Count | Integer count (Observed: `0` – `10,482`) | Raw (Joined) | U.S. Census ACS 5-Yr (CDC SVI `E_TOTPOP`) | Direct tract population estimate | Total estimated tract population |
| `baseline_temp_c` | `float` | Celsius (°C) | `39.50` | Derived (Climatology) | NOAA / NWS Phoenix Climatology | 30-year summer climatological normal | Reference historical summer baseline temperature |
| `baseline_temp_f` | `float` | Fahrenheit (°F) | `103.10` | Derived (Climatology) | NOAA / NWS Phoenix Climatology | `(baseline_temp_c * 9.0 / 5.0) + 32.0` | Reference historical summer baseline in Fahrenheit |
| `temp_anomaly_c` | `float` | Celsius (°C) | `-4.80` – `-2.80` | Derived | Calculation | `temperature - baseline_temp_c` | Temperature anomaly relative to climatology (°C) |
| `temp_anomaly_f` | `float` | Fahrenheit (°F) | `-8.64` – `-5.04` | Derived | Calculation | `temp_anomaly_c * 9.0 / 5.0` | Temperature anomaly in Fahrenheit |
| `intensity_score` | `float` | Score (0–100) | `0.00` – `100.00` | Derived | Calculation | `((temp - min_temp) / (max_temp - min_temp)) * 100.0` | Min-max normalized heat exposure score |
| `hours_above_threshold` | `null` / `float` | Hours | `null` (Unavailable) | Raw / Derived | FortyGuard / Persistence | Explicitly marked `null` for single-snapshot daily aggregate | Real peak hours exceeding 40°C threshold |
| `persistence_score` | `null` / `float` | Score (0–100) | `null` (Unavailable) | Derived | Calculation | Explicitly marked `null` for single-snapshot daily aggregate | Normalized heat duration/persistence score |
| `poverty_rate_norm` | `float` | Normalized (0–1) | `0.0000` – `1.0000` | Derived | Calculation | `(poverty_rate - min) / (max - min)` | Min-max normalized poverty rate |
| `elderly_rate_norm` | `float` | Normalized (0–1) | `0.0000` – `1.0000` | Derived | Calculation | `(elderly_rate - min) / (max - min)` | Min-max normalized elderly rate |
| `no_vehicle_rate_norm` | `float` | Normalized (0–1) | `0.0000` – `1.0000` | Derived | Calculation | `(no_vehicle_rate - min) / (max - min)` | Min-max normalized zero-vehicle rate |
| `vulnerability_score` | `float` | Score (0–100) | `0.00` – `100.00` (Observed: `6.23` – `61.15`) | Derived | Calculation | `mean(poverty_norm, elderly_norm, no_vehicle_norm) * 100.0` | Composite socioeconomic vulnerability index |
| `final_risk_score` | `float` | Score (0–100) | `0.00` – `100.00` (Observed: `6.79` – `78.19`) | Derived | Composite Formula | `(intensity_score * 0.50) + (vulnerability_score * 0.50)` | Final composite heat risk score |
| `risk_level` | `string` | Risk Band | `"Low"`, `"Moderate"`, `"High"`, `"Critical"` | Derived | Categorization | Exact 4-tier risk classification standard | Categorical risk band |

---

## 3. Risk Score Classification Standard

| Score Range | Risk Band | Color / Priority | Action Recommended |
|:---:|:---:|:---:|:---|
| **0.00 – 24.99** | **Low** | 🟢 Green / Low | Routine monitoring, maintenance of existing tree canopy |
| **25.00 – 49.99** | **Moderate** | 🟡 Yellow / Moderate | Scheduled shade installations, public hydration outreach |
| **50.00 – 74.99** | **High** | 🟠 Orange / High | Active deployment of mobile cooling shelters, prioritized tree planting |
| **75.00 – 100.00** | **Critical** | 🔴 Red / Urgent | Emergency cooling center activations, hydration distribution, medical outreach |

---

## 4. Missing Data & Imputation Strategy

1. **No Synthetic Generation**: The pipeline never generates random numbers or synthetic distributions (`np.random` has been removed).
2. **Spatial Nearest-Neighbor Join**: For thermal tiles along the boundary or edge of the AOI where tile centroids do not overlap a tract polygon, `gpd.sjoin_nearest` on projected coordinates (EPSG:3857) assigns the true nearest real Census Tract.
3. **Median Imputation for Non-Populated Tracts**: For tracts with unpopulated or suppressed socioeconomic indicators (e.g., Phoenix Sky Harbor airport runways, industrial reserves with zero population), missing variables are imputed using the **median value of all valid real Phoenix Census tracts**, preserving empirical distributions without introducing artificial variance.
4. **Persistence Availability**: When multi-temporal persistence data is not present in a single daily aggregate snapshot from FortyGuard, `hours_above_threshold` and `persistence_score` are explicitly set to `null` (`None`) and weights are dynamically reallocated between available components (`intensity_score` 50% + `vulnerability_score` 50%) to ensure scores remain strictly within the standard [0.00, 100.00] scale.

---

## 5. Security & Credential Protection

- API credentials (`FORTYGUARD_API_KEY`, backup keys) are loaded exclusively via environment variables from `.env`.
- `.env` is permanently excluded from version control in `.gitignore`.
- Zero API keys are hardcoded in source code or committed to repository branches.
