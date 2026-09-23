import { CITYGAME_ZOOM } from '../config/world';

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export function tileId(coord: TileCoord): string {
  return `${coord.z}/${coord.x}/${coord.y}`;
}

export function parseTileId(id: string): TileCoord | null {
  const parts = id.split('/');
  if (parts.length !== 3) return null;
  const [z, x, y] = parts.map(Number);
  if (![z, x, y].every((n) => Number.isInteger(n))) return null;
  const maxIndex = 2 ** z;
  if (z !== CITYGAME_ZOOM || x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) return null;
  return { z, x, y };
}

/** All tile ids within `radius` tiles of `center` (inclusive), Chebyshev distance. */
export function neighborhood(center: TileCoord, radius: number): string[] {
  const ids: string[] = [];
  const maxIndex = 2 ** center.z;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (x < 0 || y < 0 || x >= maxIndex || y >= maxIndex) continue;
      ids.push(tileId({ z: center.z, x, y }));
    }
  }
  return ids;
}
