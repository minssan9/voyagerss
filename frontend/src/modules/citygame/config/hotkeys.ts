import type { HotkeyHint } from '../types'

export const HOTKEY_HINTS: HotkeyHint[] = [
    { keys: '1 - 5', description: '도구 선택 (Select / 주거 / 상업 / 공업 / 도로)' },
    { keys: '6', description: '내 집 짓기 (구매한 땅에 1채)' },
    { keys: '7 8 9 0 L', description: '공원 / 병원 / 경찰서 / 학교 / 랜드마크' },
    { keys: 'I', description: '내 집 들어가기 (심즈 모드)' },
    { keys: 'Shift + Drag', description: '다중 배치 (Multi-place)' },
    { keys: 'Del', description: '철거 (Bulldoze)' },
    { keys: 'W A S D', description: '카메라 이동 · 탐험 중엔 캐릭터/차 조작' },
    { keys: 'Q / E', description: '카메라 회전 (Planning view)' },
    { keys: 'Tab', description: '도시 설계 ⇄ 자유 탐험 (GTA 모드)' },
    { keys: 'Shift / Space', description: '탐험: 달리기 / 점프 · 차: 핸드브레이크' },
    { keys: 'F', description: '탐험: 차에 타기 / 내리기' },
    { keys: 'H', description: '단축키 힌트 표시/숨김' },
    { keys: 'Gamepad', description: 'A/B/X/Y = 도구, LB/RB = 회전, 좌스틱 = 이동' },
]
