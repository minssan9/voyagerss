export type RendererBackend = 'webgpu' | 'webgl2'

export type CameraMode = 'planning' | 'walkthrough'

export type BuildTool =
    | 'select'
    | 'zone-residential'
    | 'zone-commercial'
    | 'zone-industrial'
    | 'road'
    | 'bulldoze'

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
