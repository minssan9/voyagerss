export type BuildTool = 'zone-residential' | 'zone-commercial' | 'zone-industrial' | 'road';

/** SimCity-style growth stage: 1 = just built, 3 = fully developed. Roads don't level up. */
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
}

export interface TileClaim {
  tileId: string;
  ownerId: string;
  ownerName: string;
  claimedAt: number;
}

export interface TileSnapshot {
  tileId: string;
  claim: TileClaim | null;
  objects: PlacedObject[];
  occupantCount: number;
}
