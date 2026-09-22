import type { HotkeyHint } from '../types'

export const HOTKEY_HINTS: HotkeyHint[] = [
    { keys: '1 - 5', description: '도구 선택 (Select / 주거 / 상업 / 공업 / 도로)' },
    { keys: 'Shift + Drag', description: '다중 배치 (Multi-place)' },
    { keys: 'Del', description: '철거 (Bulldoze)' },
    { keys: 'W A S D', description: '카메라 이동 (Planning view)' },
    { keys: 'Q / E', description: '카메라 회전 (Planning view)' },
    { keys: 'Tab', description: '평면도 / 도보 시점 전환' },
    { keys: 'H', description: '단축키 힌트 표시/숨김' },
    { keys: 'Gamepad', description: 'A/B/X/Y = 도구, LB/RB = 회전, 좌스틱 = 이동' },
]
