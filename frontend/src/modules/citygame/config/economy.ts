import type { BuildTool } from '../types'

/** Flat, static costs — a SimCity-flavored placement UI needs a price tag per tool, not a real economic model. */
export const TOOL_COST: Record<BuildTool, number> = {
    select: 0,
    'zone-residential': 100,
    'zone-commercial': 150,
    'zone-industrial': 120,
    road: 20,
    bulldoze: 10,
}

export const STARTING_FUNDS = 20000
