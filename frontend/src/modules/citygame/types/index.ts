export type RendererBackend = 'webgpu' | 'webgl2'

export type CameraMode = 'planning' | 'walkthrough'

export type BuildTool =
    | 'select'
    | 'zone-residential'
    | 'zone-commercial'
    | 'zone-industrial'
    | 'road'
    | 'bulldoze'

/** Tools that can actually be placed on the grid (excludes select/bulldoze). */
export type PlaceableTool = Exclude<BuildTool, 'select' | 'bulldoze'>

export interface GeoPoint {
    lat: number
    lon: number
}

export interface TileCoord {
    z: number
    x: number
    y: number
}

export interface PlacedObject {
    id: string
    tileId: string
    cellX: number
    cellY: number
    tool: PlaceableTool
    ownerId: string
    createdAt: number
}

export interface TileClaim {
    tileId: string
    ownerId: string
    ownerName: string
    claimedAt: number
}

export interface TileSnapshot {
    tileId: string
    claim: TileClaim | null
    objects: PlacedObject[]
    occupantCount: number
}

export interface HotkeyBinding {
    /** KeyboardEvent.code, e.g. 'KeyW', 'Digit1', 'ShiftLeft' */
    code: string
    shiftKey?: boolean
    label: string
    description: string
    action: string
}

export interface HotkeyHint {
    keys: string
    description: string
}
