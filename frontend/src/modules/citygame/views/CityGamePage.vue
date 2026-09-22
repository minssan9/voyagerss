<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PickingInfo, PointerEventTypes } from '@babylonjs/core'
import { GameEngine } from '../engine/GameEngine'
import { CameraController } from '../engine/CameraController'
import { TileStreamer } from '../engine/TileStreamer'
import { CityGameSocket } from '../network/CityGameSocket'
import { useCityGameStore } from '../store/store_citygame'
import { useKeyboardControls } from '../composables/useKeyboardControls'
import { createGamepadPoller } from '../composables/useGamepadControls'
import { useGuestIdentity } from '../composables/useGuestIdentity'
import { CITYGAME_MAX_NEIGHBOR_RADIUS } from '../config/world'
import { tileIdOf } from '../geo/tileMath'
import { ACTION_TOOL, CONTINUOUS_ACTIONS, KEYBOARD_ACTION_MAP, type GameAction } from '../config/actions'
import GameHud from '../components/GameHud.vue'
import HotkeyHintOverlay from '../components/HotkeyHintOverlay.vue'
import CityMapPicker from '../components/CityMapPicker.vue'
import type { GeoPoint, PlaceableTool, TileCoord } from '../types'

const store = useCityGameStore()
const { guestName } = useGuestIdentity()
const canvasRef = ref<HTMLCanvasElement | null>(null)

let gameEngine: GameEngine | null = null
let cameraController: CameraController | null = null
let tileStreamer: TileStreamer | null = null
let citySocket: CityGameSocket | null = null
let viewportIntervalId: number | null = null
let lastFrameTime = performance.now()

const pollGamepad = createGamepadPoller()

/** One-shot actions (tool select, bulldoze, toggle camera/hints) — shared by keyboard keydown and gamepad button-just-pressed. */
function handleDiscreteAction(action: GameAction) {
    const tool = ACTION_TOOL[action]
    if (tool) {
        store.setActiveTool(tool)
        return
    }
    if (action === 'bulldoze') {
        store.setActiveTool('bulldoze')
    } else if (action === 'toggle-camera') {
        cameraController?.toggle()
    } else if (action === 'toggle-hints') {
        store.toggleHotkeyHints()
    }
}

const { pressedKeys } = useKeyboardControls({
    onKeyDown: (event) => {
        const action = KEYBOARD_ACTION_MAP[event.code]
        if (!action) return
        if (action === 'toggle-camera') event.preventDefault()
        if (!CONTINUOUS_ACTIONS.has(action)) handleDiscreteAction(action)
    },
})

function radiusForCameraDistance(camRadius: number): number {
    if (camRadius < 70) return 1
    if (camRadius < 160) return 2
    return CITYGAME_MAX_NEIGHBOR_RADIUS
}

async function syncViewport() {
    if (!tileStreamer || !citySocket?.connected || !cameraController) return

    const target = cameraController.getPlanningTarget()
    const resolved = tileStreamer.resolveTileAt(target.x, target.z) ?? store.originTile
    if (!resolved) return
    store.setCurrentTile(resolved)

    const radius = radiusForCameraDistance(cameraController.getPlanningRadius())
    store.setNeighborRadius(radius)

    tileStreamer.syncNeighborhood(resolved, radius)

    const snapshots = await citySocket.updateViewport(tileIdOf(resolved), radius)
    for (const snapshot of snapshots) {
        tileStreamer.applySnapshot(snapshot, store.localOwnerId)
        if (snapshot.claim) store.upsertClaim(snapshot.claim)
        store.setOccupantCount(snapshot.tileId, snapshot.occupantCount)
    }
}

function scheduleViewportSync() {
    if (viewportIntervalId !== null) return
    void syncViewport()
    viewportIntervalId = window.setInterval(syncViewport, 900)
}

function connectMultiplayer() {
    store.setConnectionStatus('connecting')
    citySocket = new CityGameSocket({
        onConnected: () => {
            store.setConnectionStatus('connected')
            store.setLocalOwnerId(citySocket?.id)
            scheduleViewportSync()
        },
        onDisconnected: () => store.setConnectionStatus('disconnected'),
        onTileClaimed: (claim) => {
            store.upsertClaim(claim)
            tileStreamer?.applyTileClaimed(claim)
        },
        onObjectPlaced: (object) => tileStreamer?.applyObjectPlaced(object),
        onObjectRemoved: (payload) => tileStreamer?.applyObjectRemoved(payload),
        onObjectUpgraded: (payload) => tileStreamer?.applyObjectUpgraded(payload),
        onPresenceUpdate: (payload) => store.setOccupantCount(payload.tileId, payload.occupantCount),
    })
}

function handleMapSelect(payload: { tile: TileCoord; center: GeoPoint }) {
    store.selectHome(payload.tile, payload.center)
    if (!gameEngine) return

    if (!tileStreamer) {
        tileStreamer = new TileStreamer(gameEngine.getScene(), payload.tile, (mesh) => gameEngine?.addShadowCaster(mesh))
    } else {
        tileStreamer.setOrigin(payload.tile)
    }

    connectMultiplayer()
}

function handleClaimTile() {
    const tileId = store.currentTileId()
    if (!tileId || !citySocket) return
    citySocket.claimTile(tileId, guestName)
}

let isPainting = false
let lastPaintedCellKey: string | null = null

/** Shared by a single click and every step of a click-drag "paint" stroke — SimCity-style multi-place. */
function attemptPlacementAt(pick: PickingInfo) {
    if (!tileStreamer || !citySocket || cameraController?.mode !== 'planning') return
    if (store.activeTool === 'select') return

    const cell = tileStreamer.pickCell(pick)
    if (!cell) return
    const cellKey = `${cell.tileId}:${cell.cellX}:${cell.cellY}`
    if (cellKey === lastPaintedCellKey) return
    lastPaintedCellKey = cellKey

    if (store.activeTool === 'bulldoze') {
        if (!store.spend('bulldoze')) return
        tileStreamer.applyObjectRemoved(cell)
        citySocket.removeObject(cell)
        return
    }

    if (!store.isClaimedByMe(cell.tileId)) return

    const tool = store.activeTool as PlaceableTool
    if (!store.spend(tool)) return

    tileStreamer.applyObjectPlaced({
        id: cellKey,
        tileId: cell.tileId,
        cellX: cell.cellX,
        cellY: cell.cellY,
        tool,
        level: 1,
        ownerId: store.localOwnerId ?? 'me',
        createdAt: Date.now(),
    })
    citySocket.placeObject({ tileId: cell.tileId, cellX: cell.cellX, cellY: cell.cellY, tool })
}

onMounted(async () => {
    if (!canvasRef.value) return

    gameEngine = new GameEngine(canvasRef.value)
    const { scene, backend } = await gameEngine.init()
    store.setBackend(backend)
    store.setEngineReady(true)

    cameraController = new CameraController(scene, canvasRef.value, (mode) => store.setCameraMode(mode))
    cameraController.setBuildModeActive(store.activeTool !== 'select')
    watch(
        () => store.activeTool,
        (tool) => cameraController?.setBuildModeActive(tool !== 'select'),
    )

    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                isPainting = true
                lastPaintedCellKey = null
                if (pointerInfo.pickInfo) attemptPlacementAt(pointerInfo.pickInfo)
                break
            case PointerEventTypes.POINTERMOVE:
                if (isPainting && pointerInfo.pickInfo) attemptPlacementAt(pointerInfo.pickInfo)
                break
            case PointerEventTypes.POINTERUP:
                isPainting = false
                lastPaintedCellKey = null
                break
        }
    })

    lastFrameTime = performance.now()
    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now()
        const deltaMs = now - lastFrameTime
        lastFrameTime = now

        const activeActions = new Set<GameAction>()
        for (const code of pressedKeys) {
            const action = KEYBOARD_ACTION_MAP[code]
            if (action) activeActions.add(action)
        }
        const gamepad = pollGamepad()
        gamepad.active.forEach((action) => activeActions.add(action))
        gamepad.justPressed.forEach(handleDiscreteAction)

        cameraController?.update(activeActions, deltaMs)
        store.setFps(gameEngine?.getFps() ?? 0)
    })
})

onBeforeUnmount(() => {
    if (viewportIntervalId !== null) window.clearInterval(viewportIntervalId)
    citySocket?.dispose()
    tileStreamer?.dispose()
    cameraController?.dispose()
    gameEngine?.dispose()
    store.setEngineReady(false)
})
</script>

<template>
    <div class="citygame-root">
        <canvas ref="canvasRef" class="citygame-canvas" />
        <GameHud :owner-name="guestName" @claim-tile="handleClaimTile" />
        <HotkeyHintOverlay />
        <CityMapPicker v-if="store.showMapPicker" @select="handleMapSelect" />
    </div>
</template>

<style scoped>
.citygame-root {
    position: fixed;
    inset: 0;
    background: #14161a;
    overflow: hidden;
}

.citygame-canvas {
    width: 100%;
    height: 100%;
    display: block;
    outline: none;
    touch-action: none;
}
</style>
