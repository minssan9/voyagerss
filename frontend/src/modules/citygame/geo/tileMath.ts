import { CITYGAME_ZOOM } from '../config/world'
import type { GeoPoint, TileCoord } from '../types'

export interface TileBounds {
    north: number
    south: number
    east: number
    west: number
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

export function tileIdOf(coord: TileCoord): string {
    return `${coord.z}/${coord.x}/${coord.y}`
}

export function parseTileId(id: string): TileCoord | null {
    const parts = id.split('/')
    if (parts.length !== 3) return null
    const [z, x, y] = parts.map(Number)
    if (![z, x, y].every((n) => Number.isInteger(n))) return null
    return { z, x, y }
}

/** Standard slippy-map (OSM/Mapbox) tile containing the given point, at `zoom`. */
export function latLonToTile(point: GeoPoint, zoom: number = CITYGAME_ZOOM): TileCoord {
    const latRad = (point.lat * Math.PI) / 180
    const n = 2 ** zoom
    const x = Math.floor(((point.lon + 180) / 360) * n)
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
    return { z: zoom, x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

function tileYToLat(y: number, n: number): number {
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
    return (latRad * 180) / Math.PI
}

export function tileBounds(coord: TileCoord): TileBounds {
    const n = 2 ** coord.z
    return {
        west: (coord.x / n) * 360 - 180,
        east: ((coord.x + 1) / n) * 360 - 180,
        north: tileYToLat(coord.y, n),
        south: tileYToLat(coord.y + 1, n),
    }
}

export function tileCenter(coord: TileCoord): GeoPoint {
    const b = tileBounds(coord)
    return { lat: (b.north + b.south) / 2, lon: (b.east + b.west) / 2 }
}

/** Approximate real-world width/height of a tile in meters, at its center latitude. */
export function tileSizeMeters(coord: TileCoord): number {
    const { lat } = tileCenter(coord)
    const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** coord.z
    return metersPerPixel * 256
}

export function tileEquals(a: TileCoord, b: TileCoord): boolean {
    return a.z === b.z && a.x === b.x && a.y === b.y
}

/** All tiles within `radius` tiles of `center` (inclusive), Chebyshev distance. */
export function neighborhood(center: TileCoord, radius: number): TileCoord[] {
    const n = 2 ** center.z
    const coords: TileCoord[] = []
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const x = center.x + dx
            const y = center.y + dy
            if (x < 0 || y < 0 || x >= n || y >= n) continue
            coords.push({ z: center.z, x, y })
        }
    }
    return coords
}

/**
 * Flat-earth local projection: meters offset of `target` tile's center from
 * `origin` tile's center. Good enough at city-block scale (a handful of
 * neighboring tiles) — not suitable far from `origin`.
 * +X = east, +Z = north.
 */
export function tileOffsetMeters(origin: TileCoord, target: TileCoord): { x: number; z: number } {
    const originCenter = tileCenter(origin)
    const targetCenter = tileCenter(target)
    const originLatRad = (originCenter.lat * Math.PI) / 180
    const metersPerDegLat = 111320
    const metersPerDegLon = 111320 * Math.cos(originLatRad)
    return {
        x: (targetCenter.lon - originCenter.lon) * metersPerDegLon,
        z: (targetCenter.lat - originCenter.lat) * metersPerDegLat,
    }
}
