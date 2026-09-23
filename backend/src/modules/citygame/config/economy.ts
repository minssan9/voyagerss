import type { BuildTool, FacilityTool, ZoneTool } from '../types';

/**
 * Economy constants shared (by convention, not by import) with
 * frontend/src/modules/citygame/config/economy.ts. The server is
 * authoritative for every number here; the client copy only drives
 * affordability hints and price labels.
 */
export const STARTING_TREASURY = 20000;
export const STARTING_HOUSEHOLD = 20000;

export const LAND_PRICE = 5000;
export const LAND_RESERVATION_MS = 5 * 60 * 1000;

/** One economy tick = one in-game "month" of taxes, upkeep and salary. */
export const ECONOMY_TICK_MS = 5000;

export const TOOL_COST: Record<BuildTool, number> = {
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
};

export const BULLDOZE_COST = 10;

export const FACILITY_TOOLS: FacilityTool[] = [
  'facility-park',
  'facility-hospital',
  'facility-police',
  'facility-school',
  'facility-landmark',
];

export const FACILITY_UPKEEP: Record<FacilityTool, number> = {
  'facility-park': 20,
  'facility-hospital': 150,
  'facility-police': 100,
  'facility-school': 120,
  'facility-landmark': 300,
};

/** Monthly tax per zone building, indexed by level - 1. */
export const ZONE_TAX: Record<ZoneTool, [number, number, number]> = {
  'zone-residential': [10, 25, 50],
  'zone-commercial': [15, 35, 70],
  'zone-industrial': [12, 30, 60],
};

/** Paid into the household wallet each month once the player has a home. */
export const HOUSEHOLD_SALARY = 60;

/** Furniture catalog prices (household wallet). Selling refunds half. */
export const FURNITURE_PRICE: Record<string, number> = {
  fridge: 600,
  stove: 400,
  'dining-table': 350,
  chair: 80,
  sofa: 700,
  armchair: 300,
  tv: 500,
  bed: 900,
  toilet: 300,
  shower: 650,
  bookshelf: 250,
  plant: 60,
  lamp: 90,
  clock: 400,
  'chess-table': 350,
  computer: 1200,
};

export const FURNITURE_SELL_RATIO = 0.5;
