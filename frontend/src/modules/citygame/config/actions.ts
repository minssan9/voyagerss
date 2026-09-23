import type { PlaceableTool } from '../types'

/**
 * Canonical input actions. Both keyboard and gamepad map into this set so
 * camera control, tool selection, etc. don't care which device triggered
 * them — the layer a future gamepad/Steam Deck/console port needs is just
 * another entry in the maps below, not a rewrite of CameraController or
 * CityGamePage.
 */
export type GameAction =
    | 'tool-select'
    | 'tool-residential'
    | 'tool-commercial'
    | 'tool-industrial'
    | 'tool-road'
    | 'tool-home'
    | 'tool-park'
    | 'tool-hospital'
    | 'tool-police'
    | 'tool-school'
    | 'tool-landmark'
    | 'bulldoze'
    | 'enter-home'
    | 'toggle-camera'
    | 'toggle-hints'
    | 'pan-forward'
    | 'pan-back'
    | 'pan-left'
    | 'pan-right'
    | 'rotate-left'
    | 'rotate-right'

/** Held-down actions that drive continuous per-frame movement rather than a one-shot state change. */
export const CONTINUOUS_ACTIONS: ReadonlySet<GameAction> = new Set([
    'pan-forward',
    'pan-back',
    'pan-left',
    'pan-right',
    'rotate-left',
    'rotate-right',
])

export const ACTION_TOOL: Partial<Record<GameAction, PlaceableTool | 'select'>> = {
    'tool-select': 'select',
    'tool-residential': 'zone-residential',
    'tool-commercial': 'zone-commercial',
    'tool-industrial': 'zone-industrial',
    'tool-road': 'road',
    'tool-home': 'home',
    'tool-park': 'facility-park',
    'tool-hospital': 'facility-hospital',
    'tool-police': 'facility-police',
    'tool-school': 'facility-school',
    'tool-landmark': 'facility-landmark',
}

/** KeyboardEvent.code -> action. */
export const KEYBOARD_ACTION_MAP: Record<string, GameAction> = {
    Digit1: 'tool-select',
    Digit2: 'tool-residential',
    Digit3: 'tool-commercial',
    Digit4: 'tool-industrial',
    Digit5: 'tool-road',
    Digit6: 'tool-home',
    Digit7: 'tool-park',
    Digit8: 'tool-hospital',
    Digit9: 'tool-police',
    Digit0: 'tool-school',
    KeyL: 'tool-landmark',
    KeyI: 'enter-home',
    Delete: 'bulldoze',
    Tab: 'toggle-camera',
    KeyH: 'toggle-hints',
    KeyW: 'pan-forward',
    KeyS: 'pan-back',
    KeyA: 'pan-left',
    KeyD: 'pan-right',
    KeyQ: 'rotate-left',
    KeyE: 'rotate-right',
}

/**
 * Standard Gamepad API button indices (Xbox/PlayStation layout) -> action.
 * Continuous pan comes from the left stick axes instead (see
 * useGamepadControls) since there's no "pan" button to hold.
 */
export const GAMEPAD_BUTTON_ACTION_MAP: Record<number, GameAction> = {
    0: 'tool-select', // A / Cross
    1: 'bulldoze', // B / Circle
    2: 'tool-road', // X / Square
    3: 'tool-residential', // Y / Triangle
    4: 'rotate-left', // LB / L1
    5: 'rotate-right', // RB / R1
    8: 'toggle-hints', // Back / Share
    9: 'toggle-camera', // Start / Options
}

export const GAMEPAD_AXIS_DEADZONE = 0.25
