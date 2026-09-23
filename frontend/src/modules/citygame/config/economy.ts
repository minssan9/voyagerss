import type { BuildTool, FacilityTool } from '../types'

/**
 * Mirrors backend/src/modules/citygame/config/economy.ts (by convention, not
 * import). The server is authoritative for every charge; these values only
 * drive price labels and "can I afford this" hints before the round-trip.
 */
export const TOOL_COST: Record<BuildTool, number> = {
    select: 0,
    'zone-residential': 100,
    'zone-commercial': 150,
    'zone-industrial': 120,
    road: 20,
    home: 0,
    'facility-park': 500,
    'facility-hospital': 3000,
    'facility-police': 2000,
    'facility-school': 2500,
    'facility-landmark': 8000,
    bulldoze: 10,
}

export const STARTING_TREASURY = 20000
export const STARTING_HOUSEHOLD = 20000
export const LAND_PRICE = 5000

export const FACILITY_UPKEEP: Record<FacilityTool, number> = {
    'facility-park': 20,
    'facility-hospital': 150,
    'facility-police': 100,
    'facility-school': 120,
    'facility-landmark': 300,
}

export const FACILITY_TOOLS: FacilityTool[] = [
    'facility-park',
    'facility-hospital',
    'facility-police',
    'facility-school',
    'facility-landmark',
]

export function isFacilityTool(tool: string): tool is FacilityTool {
    return (FACILITY_TOOLS as string[]).includes(tool)
}
