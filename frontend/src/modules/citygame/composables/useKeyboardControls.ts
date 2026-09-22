import { onBeforeUnmount, onMounted, reactive } from 'vue'

export interface KeyboardControlsOptions {
    onKeyDown?: (event: KeyboardEvent) => void
    onKeyUp?: (event: KeyboardEvent) => void
}

/**
 * Tracks currently-held key codes for continuous (per-frame) input like
 * camera panning, plus one-shot keydown/keyup callbacks for discrete actions
 * (tool selection, bulldoze, mode toggles).
 */
export function useKeyboardControls(options: KeyboardControlsOptions = {}) {
    const pressedKeys = reactive(new Set<string>())

    const handleKeyDown = (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return
        pressedKeys.add(event.code)
        options.onKeyDown?.(event)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
        pressedKeys.delete(event.code)
        options.onKeyUp?.(event)
    }

    const handleBlur = () => pressedKeys.clear()

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('blur', handleBlur)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('blur', handleBlur)
        pressedKeys.clear()
    })

    return { pressedKeys }
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}
