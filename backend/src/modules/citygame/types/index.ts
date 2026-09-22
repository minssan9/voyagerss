export type BuildTool = 'zone-residential' | 'zone-commercial' | 'zone-industrial' | 'road';

export interface PlacedObject {
  id: string;
  tileId: string;
  cellX: number;
  cellY: number;
  tool: BuildTool;
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
