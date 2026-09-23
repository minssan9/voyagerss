export type RendererBackend = 'webgpu' | 'webgl2'

export type CameraMode = 'planning' | 'walkthrough'

export type ZoneTool = 'zone-residential' | 'zone-commercial' | 'zone-industrial'

/** City services/landmarks: built from the city treasury, cost monthly upkeep, and only operate while funded. */
export type FacilityTool = 'facility-park' | 'facility-hospital' | 'facility-police' | 'facility-school' | 'facility-landmark'

export type BuildTool = 'select' | ZoneTool | 'road' | 'home' | FacilityTool | 'bulldoze'

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

/** SimCity-style growth stage: 1 = just built, 3 = fully developed. Roads don't level up. */
export type BuildingLevel = 1 | 2 | 3

export interface PlacedObject {
    id: string
    tileId: string
    cellX: number
    cellY: number
    tool: PlaceableTool
    level: BuildingLevel
    ownerId: string
    createdAt: number
    /** Facilities only: whether the owner's city treasury covered this month's upkeep. */
    funded?: boolean
}

/** `reserved` = 선점권 (time-limited exclusive right to buy); `owned` = paid for, buildable. */
export type ClaimStatus = 'reserved' | 'owned'

export interface TileClaim {
    tileId: string
    ownerId: string
    ownerName: string
    claimedAt: number
    status: ClaimStatus
    reservedUntil: number | null
    price: number
}

/** Server-authoritative money: `treasury` = city operating budget, `household` = the Sims-side family wallet (§). */
export interface CityAccount {
    ownerId: string
    treasury: number
    household: number
    lastIncome: number
    lastUpkeep: number
    lastSalary: number
    unfundedFacilities: number
    furniture: Record<string, number>
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
