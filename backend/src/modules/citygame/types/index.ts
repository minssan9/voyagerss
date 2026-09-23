export type ZoneTool = 'zone-residential' | 'zone-commercial' | 'zone-industrial';
export type FacilityTool = 'facility-park' | 'facility-hospital' | 'facility-police' | 'facility-school' | 'facility-landmark';
export type BuildTool = ZoneTool | 'road' | 'home' | FacilityTool;

/** SimCity-style growth stage: 1 = just built, 3 = fully developed. Roads, homes and facilities don't level up. */
export type BuildingLevel = 1 | 2 | 3;

export interface PlacedObject {
  id: string;
  tileId: string;
  cellX: number;
  cellY: number;
  tool: BuildTool;
  level: BuildingLevel;
  ownerId: string;
  createdAt: number;
  /** Facilities only: whether the owner's city treasury covered this month's upkeep. */
  funded?: boolean;
}

/**
 * `reserved` = 선점권: a time-limited exclusive right to buy the tile, granted by claiming it.
 * `owned` = the reservation was converted by paying the land price. Only owned tiles accept building.
 */
export type ClaimStatus = 'reserved' | 'owned';

export interface TileClaim {
  tileId: string;
  ownerId: string;
  ownerName: string;
  claimedAt: number;
  status: ClaimStatus;
  /** Epoch ms when an unpaid reservation lapses; null once owned. */
  reservedUntil: number | null;
  price: number;
}

export interface TileSnapshot {
  tileId: string;
  claim: TileClaim | null;
  objects: PlacedObject[];
  occupantCount: number;
}

/**
 * Per-player money, split the way the game is: `treasury` is the SimCity-side
 * city operating budget (zones/facilities cost it, taxes feed it, facility
 * upkeep drains it); `household` is the Sims-side family wallet (land and
 * furniture cost it, a salary feeds it once you have a home).
 */
export interface CityAccount {
  ownerId: string;
  treasury: number;
  household: number;
  lastIncome: number;
  lastUpkeep: number;
  lastSalary: number;
  unfundedFacilities: number;
  furniture: Record<string, number>;
}
