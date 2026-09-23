/**
 * Sims-style needs. Every need is 0 (critical) .. 100 (fully satisfied).
 * `room` isn't drained over time — it's derived from decor and from the
 * city services around the home (see InteriorScene.computeRoomScore).
 */
export type NeedKey = 'hunger' | 'energy' | 'comfort' | 'fun' | 'hygiene' | 'bladder' | 'social' | 'room'

export const NEED_KEYS: NeedKey[] = ['hunger', 'energy', 'comfort', 'fun', 'hygiene', 'bladder', 'social', 'room']

export const NEED_LABELS: Record<NeedKey, string> = {
    hunger: '배고픔',
    energy: '에너지',
    comfort: '편안함',
    fun: '재미',
    hygiene: '위생',
    bladder: '생리현상',
    social: '사교',
    room: '환경',
}

/** Drain per in-game hour, before any nearby-facility modifiers. */
export const NEED_DECAY_PER_HOUR: Record<Exclude<NeedKey, 'room'>, number> = {
    hunger: 6,
    energy: 4.5,
    comfort: 5,
    fun: 7,
    hygiene: 4,
    bladder: 9,
    social: 5,
}

export type FurnitureCategory = 'kitchen' | 'seating' | 'bedroom' | 'bathroom' | 'fun' | 'decor'

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
    kitchen: '주방',
    seating: '의자·소파',
    bedroom: '침실',
    bathroom: '욕실',
    fun: '여가',
    decor: '장식',
}

/**
 * How the Sim uses an item: `stand` = walks up to the cell in front and
 * faces it (fridge, TV); `onto` = walks up, then settles onto the item
 * itself (bed, sofa, toilet, shower).
 */
export type UseStyle = 'stand' | 'onto'

export interface FurnitureDef {
    id: string
    name: string
    category: FurnitureCategory
    /** Household (§) price — mirrors backend FURNITURE_PRICE. */
    price: number
    /** Footprint in grid cells at rotation 0 (w along x, d along z). */
    w: number
    d: number
    /** Need gain per in-game minute while the Sim uses it. */
    satisfies: Partial<Record<Exclude<NeedKey, 'room'>, number>>
    useStyle: UseStyle
    /** Height the Sim sits/lies at for `onto` items. */
    seatHeight?: number
    /** Lie down instead of sit (beds). */
    lie?: boolean
    /** Contribution to the `room` need just by being in the house. */
    decor: number
    /** Verb shown in the HUD while in use. */
    verb: string
}

export const FURNITURE: FurnitureDef[] = [
    { id: 'fridge', name: '냉장고', category: 'kitchen', price: 600, w: 1, d: 1, satisfies: { hunger: 1.8 }, useStyle: 'stand', decor: 1, verb: '간식 먹는 중' },
    { id: 'stove', name: '가스레인지', category: 'kitchen', price: 400, w: 1, d: 1, satisfies: { hunger: 2.6, fun: 0.2 }, useStyle: 'stand', decor: 1, verb: '요리하는 중' },
    { id: 'dining-table', name: '식탁', category: 'kitchen', price: 350, w: 2, d: 1, satisfies: {}, useStyle: 'stand', decor: 3, verb: '' },
    { id: 'chair', name: '의자', category: 'seating', price: 80, w: 1, d: 1, satisfies: { comfort: 0.8 }, useStyle: 'onto', seatHeight: 0.45, decor: 1, verb: '앉아 쉬는 중' },
    { id: 'sofa', name: '소파', category: 'seating', price: 700, w: 2, d: 1, satisfies: { comfort: 1.6, energy: 0.35 }, useStyle: 'onto', seatHeight: 0.42, decor: 4, verb: '소파에서 쉬는 중' },
    { id: 'armchair', name: '안락의자', category: 'seating', price: 300, w: 1, d: 1, satisfies: { comfort: 1.3 }, useStyle: 'onto', seatHeight: 0.42, decor: 3, verb: '안락의자에서 쉬는 중' },
    { id: 'bed', name: '침대', category: 'bedroom', price: 900, w: 1, d: 2, satisfies: { energy: 1.6, comfort: 0.6 }, useStyle: 'onto', seatHeight: 0.55, lie: true, decor: 3, verb: '자는 중' },
    { id: 'toilet', name: '변기', category: 'bathroom', price: 300, w: 1, d: 1, satisfies: { bladder: 6 }, useStyle: 'onto', seatHeight: 0.4, decor: 0, verb: '화장실 이용 중' },
    { id: 'shower', name: '샤워부스', category: 'bathroom', price: 650, w: 1, d: 1, satisfies: { hygiene: 4 }, useStyle: 'onto', seatHeight: 0.05, decor: 1, verb: '샤워하는 중' },
    { id: 'tv', name: 'TV', category: 'fun', price: 500, w: 1, d: 1, satisfies: { fun: 1.8, comfort: 0.2 }, useStyle: 'stand', decor: 2, verb: 'TV 보는 중' },
    { id: 'bookshelf', name: '책장', category: 'fun', price: 250, w: 1, d: 1, satisfies: { fun: 1.1 }, useStyle: 'stand', decor: 5, verb: '책 읽는 중' },
    { id: 'chess-table', name: '체스판', category: 'fun', price: 350, w: 1, d: 1, satisfies: { fun: 1.2, social: 1 }, useStyle: 'stand', decor: 3, verb: '체스 두는 중' },
    { id: 'computer', name: '컴퓨터', category: 'fun', price: 1200, w: 1, d: 1, satisfies: { fun: 1.6, social: 1.2 }, useStyle: 'stand', decor: 2, verb: '온라인 채팅 중' },
    { id: 'plant', name: '화분', category: 'decor', price: 60, w: 1, d: 1, satisfies: {}, useStyle: 'stand', decor: 7, verb: '' },
    { id: 'lamp', name: '스탠드', category: 'decor', price: 90, w: 1, d: 1, satisfies: {}, useStyle: 'stand', decor: 5, verb: '' },
    { id: 'clock', name: '괘종시계', category: 'decor', price: 400, w: 1, d: 1, satisfies: {}, useStyle: 'stand', decor: 10, verb: '' },
]

export const FURNITURE_BY_ID: Record<string, FurnitureDef> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]))

/** Rotation 0..3 in 90° steps; 0 = front faces +z (toward the camera side of the room). */
export type Rotation = 0 | 1 | 2 | 3

export interface PlacedFurniture {
    uid: string
    itemId: string
    x: number
    z: number
    rot: Rotation
    /** Came with the house for free — removing it gives no refund (the server never charged for it). */
    starter?: boolean
}

export function footprint(def: FurnitureDef, rot: Rotation): { w: number; d: number } {
    return rot % 2 === 0 ? { w: def.w, d: def.d } : { w: def.d, d: def.w }
}

/** Unit vector of the item's front face in grid space. */
export function frontVector(rot: Rotation): { dx: number; dz: number } {
    return [
        { dx: 0, dz: 1 },
        { dx: 1, dz: 0 },
        { dx: 0, dz: -1 },
        { dx: -1, dz: 0 },
    ][rot]
}

/**
 * City facilities near the home change how fast needs drain — but only
 * while funded. This is where the SimCity layer's budget reaches inside
 * the Sims layer: a bankrupt city closes the park, and your Sim gets bored
 * faster.
 */
export interface FacilityEffect {
    label: string
    decay: Partial<Record<Exclude<NeedKey, 'room'>, number>>
    room: number
    description: string
}

export const FACILITY_EFFECTS: Record<string, FacilityEffect> = {
    'facility-park': { label: '공원', decay: { fun: 0.8, comfort: 0.9 }, room: 10, description: '재미 −20% 감소, 환경 +10' },
    'facility-hospital': { label: '병원', decay: { energy: 0.85, hygiene: 0.85 }, room: 4, description: '에너지·위생 감소 −15%' },
    'facility-police': { label: '경찰서', decay: { comfort: 0.8 }, room: 6, description: '편안함 감소 −20% (치안)' },
    'facility-school': { label: '학교', decay: { fun: 0.9, social: 0.8 }, room: 4, description: '사교 감소 −20%, 재미 −10%' },
    'facility-landmark': { label: '랜드마크', decay: { fun: 0.9 }, room: 15, description: '환경 +15, 재미 −10%' },
}

export const STARTER_FURNITURE: Omit<PlacedFurniture, 'uid'>[] = [
    { itemId: 'bed', x: 10, z: 7, rot: 3, starter: true },
    { itemId: 'toilet', x: 0, z: 0, rot: 1, starter: true },
    { itemId: 'shower', x: 0, z: 2, rot: 1, starter: true },
    { itemId: 'fridge', x: 0, z: 9, rot: 1, starter: true },
    { itemId: 'chair', x: 3, z: 6, rot: 0, starter: true },
]
