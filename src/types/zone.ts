/**
 * Core Zone Domain Model
 */
export interface Zone {
  id: string;
  name: string;
  geometry: {
    type: string;
    coordinates?: unknown;
    [key: string]: unknown;
  };
}
