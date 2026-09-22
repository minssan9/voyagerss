import type { GeoPoint } from '../types'

/**
 * World constants shared (by convention, not by import — frontend and
 * backend are separate TypeScript projects) with
 * backend/src/modules/citygame/config/world.ts. Both sides must agree on
 * these since tile ids cross the wire as plain strings with no schema
 * negotiation.
 */
export const CITYGAME_ZOOM = 18
export const CITYGAME_GRID_SIZE = 16
export const CITYGAME_DEFAULT_NEIGHBOR_RADIUS = 1
export const CITYGAME_MAX_NEIGHBOR_RADIUS = 3

/** Seoul City Hall — used when geolocation is unavailable or denied. */
export const CITYGAME_DEFAULT_ORIGIN: GeoPoint = { lat: 37.5665, lon: 126.978 }
