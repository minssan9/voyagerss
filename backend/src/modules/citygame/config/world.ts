/**
 * World constants shared (by convention, not by import) with
 * frontend/src/modules/citygame/config/world.ts. Both sides must agree on
 * these values since tile ids and cell coordinates cross the wire as plain
 * strings/numbers with no schema negotiation.
 */
export const CITYGAME_ZOOM = 18
export const CITYGAME_GRID_SIZE = 16
export const CITYGAME_DEFAULT_NEIGHBOR_RADIUS = 1
export const CITYGAME_MAX_NEIGHBOR_RADIUS = 3
