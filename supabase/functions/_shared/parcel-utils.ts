/**
 * Parcel Utils - H3 based land parcel system
 */
import { latLngToCell, cellToBoundary } from "npm:h3-js@^4.1.0";

// H3 resolution 9 = ~100m avg edge length (good for urban running)
const PARCEL_RESOLUTION = 9;
const MIN_RUN_DISTANCE_KM = 0.5; // Minimum distance to claim ownership

export interface Parcel {
  parcel_id: string;
  center_lat: number;
  center_lon: number;
}

/**
 * Convert lat/lng to parcel ID
 */
export function coordsToParcelId(lat: number, lon: number): string {
  return latLngToCell(lat, lon, PARCEL_RESOLUTION);
}

/**
 * Get parcel boundary coordinates
 */
export function getParcelBoundary(parcelId: string): Array<[number, number]> {
  return cellToBoundary(parcelId, true) as Array<[number, number]>;
}

/**
 * Calculate center of parcel
 */
export function getParcelCenter(parcelId: string): { lat: number; lon: number } {
  const boundary = getParcelBoundary(parcelId);
  const latSum = boundary.reduce((sum, coord) => sum + coord[0], 0);
  const lonSum = boundary.reduce((sum, coord) => sum + coord[1], 0);
  
  return {
    lat: latSum / boundary.length,
    lon: lonSum / boundary.length
  };
}

/**
 * Extract unique parcels from run route
 */
export function extractParcelsFromRoute(
  routeCoordinates: Array<{ lat: number; lon: number }>
): Parcel[] {
  const parcelMap = new Map<string, Parcel>();
  
  for (const coord of routeCoordinates) {
    const parcelId = coordsToParcelId(coord.lat, coord.lon);
    
    if (!parcelMap.has(parcelId)) {
      const center = getParcelCenter(parcelId);
      parcelMap.set(parcelId, {
        parcel_id: parcelId,
        center_lat: center.lat,
        center_lon: center.lon
      });
    }
  }
  
  return Array.from(parcelMap.values());
}

/**
 * Check if run qualifies for ownership claim
 */
export function qualifiesForOwnership(distanceKm: number): boolean {
  return distanceKm >= MIN_RUN_DISTANCE_KM;
}

/**
 * Calculate payment window based on rent policy
 */
export function calculatePaidUntil(policy: string): Date {
  const now = new Date();
  
  switch (policy) {
    case 'per_hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'per_day':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'per_run':
    default:
      // Per-run access expires after 2 hours (enough time to complete task)
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }
}
