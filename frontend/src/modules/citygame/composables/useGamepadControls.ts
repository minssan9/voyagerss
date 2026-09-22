import { GAMEPAD_AXIS_DEADZONE, GAMEPAD_BUTTON_ACTION_MAP, type GameAction } from '../config/actions'

export interface GamepadPollResult {
    /** Every action currently held (buttons down or stick past deadzone) — for continuous movement. */
    active: Set<GameAction>
    /** Button actions that transitioned from released to pressed this poll — for one-shot actions. */
    justPressed: GameAction[]
}

/**
 * Creates a per-frame Gamepad API poller. Kept as a small stateful closure
 * (rather than a Vue composable with lifecycle hooks) because it's driven
 * from the Babylon render loop, not Vue's reactivity — call `poll()` once
 * per frame and merge its result with keyboard input.
 */
export function createGamepadPoller() {
    const previouslyPressed = new Set<number>()

    return function poll(): GamepadPollResult {
        const active = new Set<GameAction>()
        const justPressed: GameAction[] = []

        const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
        const pad = pads?.[0]
        if (!pad) {
            previouslyPressed.clear()
            return { active, justPressed }
        }

        const stillPressed = new Set<number>()
        pad.buttons.forEach((button, index) => {
            const action = GAMEPAD_BUTTON_ACTION_MAP[index]
            if (!action || !button.pressed) return
            active.add(action)
            stillPressed.add(index)
            if (!previouslyPressed.has(index)) justPressed.push(action)
        })
        previouslyPressed.clear()
        stillPressed.forEach((index) => previouslyPressed.add(index))

        const [leftX = 0, leftY = 0] = pad.axes
        if (leftY < -GAMEPAD_AXIS_DEADZONE) active.add('pan-forward')
        if (leftY > GAMEPAD_AXIS_DEADZONE) active.add('pan-back')
        if (leftX < -GAMEPAD_AXIS_DEADZONE) active.add('pan-left')
        if (leftX > GAMEPAD_AXIS_DEADZONE) active.add('pan-right')

        return { active, justPressed }
    }
}
