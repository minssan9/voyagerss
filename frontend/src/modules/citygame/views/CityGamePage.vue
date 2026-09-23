<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PickingInfo, PointerEventTypes, Vector3 } from '@babylonjs/core'
import { GameEngine } from '../engine/GameEngine'
import { CameraController } from '../engine/CameraController'
import { TileStreamer } from '../engine/TileStreamer'
import { InteriorScene, type GameSpeed, type InteriorMode } from '../engine/interior/InteriorScene'
import { CityGameSocket } from '../network/CityGameSocket'
import { useCityGameStore } from '../store/store_citygame'
import { useKeyboardControls } from '../composables/useKeyboardControls'
import { createGamepadPoller } from '../composables/useGamepadControls'
import { useGuestIdentity } from '../composables/useGuestIdentity'
import { CITYGAME_GRID_SIZE, CITYGAME_MAX_NEIGHBOR_RADIUS } from '../config/world'
import { parseTileId, tileIdOf, tileSizeMeters } from '../geo/tileMath'
import { ACTION_TOOL, CONTINUOUS_ACTIONS, KEYBOARD_ACTION_MAP, type GameAction } from '../config/actions'
import GameHud from '../components/GameHud.vue'
import HotkeyHintOverlay from '../components/HotkeyHintOverlay.vue'
import CityMapPicker from '../components/CityMapPicker.vue'
import FreeRoamHud from '../components/FreeRoamHud.vue'
import InteriorHud from '../components/InteriorHud.vue'
import type { GeoPoint, PlaceableTool, PlacedObject, TileCoord } from '../types'

const store = useCityGameStore()
const { guestName, guestId } = useGuestIdentity()
store.setLocalOwnerId(guestId)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let gameEngine: GameEngine | null = null
let cameraController: CameraController | null = null
let tileStreamer: TileStreamer | null = null
let citySocket: CityGameSocket | null = null
let interior: InteriorScene | null = null
let interiorTileId: string | null = null
let viewportIntervalId: number | null = null
let lastFrameTime = performance.now()
/** Placements drawn before the server confirmed them — only these may be rolled back on rejection. */
const pendingPlacements = new Set<string>()
const placementKey = (p: { tileId: string; cellX: number; cellY: number }) => `${p.tileId}:${p.cellX}:${p.cellY}`

const pollGamepad = createGamepadPoller()

const REJECT_MESSAGES: Record<string, string> = {
    'tile-not-owned': '먼저 이 땅을 구매하세요',
    'not-your-tile': '다른 사람의 땅입니다',
    'insufficient-funds': '시 예산이 부족합니다',
    'home-exists': '이 땅에는 이미 집이 있어요 (땅 하나에 집 한 채)',
    'cell-occupied': '이미 건물이 있는 칸입니다',
    'already-claimed': '이미 누군가 선점한 땅입니다',
    'reservation-limit': '선점권은 한 번에 하나만 가질 수 있어요 — 먼저 구매하거나 만료를 기다리세요',
    'reserved-by-other': '다른 사람이 선점한 땅입니다',
    'not-reserved': '선점권이 만료되었습니다. 다시 선점하세요',
}

const notifyReason = (reason: string) => store.notify(REJECT_MESSAGES[reason] ?? `요청 거절됨 (${reason})`)

// ---- input ----

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
    } else if (action === 'enter-home') {
        enterHome()
    }
}

/** Sims-style keys while inside: B buy · L live · Del sell · R rotate · 1/2/3 speed · P pause · Esc leave. */
function handleInteriorKey(event: KeyboardEvent) {
    if (!interior) return
    switch (event.code) {
        case 'Escape':
            if (store.interior?.selectedItem) interior.selectItem(null)
            else exitHome()
            break
        case 'KeyB':
            interior.setMode('buy')
            break
        case 'KeyL':
            interior.setMode('live')
            break
        case 'Delete':
        case 'Backspace':
            interior.setMode('sell')
            break
        case 'KeyR':
            interior.rotateSelection()
            break
        case 'KeyP':
        case 'Digit0':
            interior.setSpeed(0)
            break
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
            interior.setSpeed(Number(event.code.slice(5)) as GameSpeed)
            break
    }
}

const { pressedKeys } = useKeyboardControls({
    onKeyDown: (event) => {
        if (store.view === 'interior') {
            handleInteriorKey(event)
            return
        }
        const action = KEYBOARD_ACTION_MAP[event.code]
        if (!action) return
        if (action === 'toggle-camera') event.preventDefault()
        // In free roam, keys drive the avatar/car — only camera toggle, hints and entering home stay live.
        if (store.cameraMode === 'walkthrough' && !['toggle-camera', 'toggle-hints', 'enter-home'].includes(action)) return
        if (!CONTINUOUS_ACTIONS.has(action)) handleDiscreteAction(action)
    },
})

// ---- tile streaming / multiplayer ----

function radiusForCameraDistance(camRadius: number): number {
    if (camRadius < 70) return 1
    if (camRadius < 160) return 2
    return CITYGAME_MAX_NEIGHBOR_RADIUS
}

function trackHome(object: PlacedObject) {
    if (object.tool === 'home') store.setHome(object.tileId, { cellX: object.cellX, cellY: object.cellY, ownerId: object.ownerId })
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
        tileStreamer.applySnapshot(snapshot)
        store.upsertClaim(snapshot.claim, snapshot.tileId)
        store.setOccupantCount(snapshot.tileId, snapshot.occupantCount)
        for (const object of snapshot.objects) trackHome(object)
    }
    if (store.view === 'interior') refreshInteriorFacilities()
}

function scheduleViewportSync() {
    if (viewportIntervalId !== null) return
    void syncViewport()
    viewportIntervalId = window.setInterval(syncViewport, 900)
}

function connectMultiplayer() {
    store.setConnectionStatus('connecting')
    citySocket = new CityGameSocket(guestId, guestName, {
        onConnected: () => {
            store.setConnectionStatus('connected')
            scheduleViewportSync()
        },
        onDisconnected: () => store.setConnectionStatus('disconnected'),
        onAccount: (account) => store.setAccount(account),
        onTileClaimed: (claim) => {
            store.upsertClaim(claim)
            tileStreamer?.applyTileClaimed(claim)
        },
        onTileReleased: ({ tileId }) => {
            if (store.isReservedByMe(tileId)) store.notify('선점권이 만료되어 땅이 해제되었습니다')
            store.releaseClaim(tileId)
            tileStreamer?.applyTileReleased(tileId)
        },
        onClaimRejected: ({ reason }) => notifyReason(reason),
        onObjectPlaced: (object) => {
            pendingPlacements.delete(placementKey(object))
            tileStreamer?.applyObjectPlaced(object)
            trackHome(object)
        },
        onObjectRejected: (payload) => {
            // Roll back only our own unconfirmed placement — never a confirmed building already in that cell.
            if (pendingPlacements.delete(placementKey(payload))) tileStreamer?.applyObjectRemoved(payload)
            notifyReason(payload.reason)
        },
        onObjectRemoved: (payload) => {
            tileStreamer?.applyObjectRemoved(payload)
            const home = store.homes.get(payload.tileId)
            if (home && home.cellX === payload.cellX && home.cellY === payload.cellY) store.setHome(payload.tileId, null)
        },
        onRemoveRejected: ({ reason }) => notifyReason(reason),
        onObjectUpgraded: (payload) => tileStreamer?.applyObjectUpgraded(payload),
        onObjectFunding: (payload) => {
            tileStreamer?.applyObjectFunding(payload)
            if (store.view === 'interior') refreshInteriorFacilities()
        },
        onPresenceUpdate: (payload) => store.setOccupantCount(payload.tileId, payload.occupantCount),
    })
}

function handleMapSelect(payload: { tile: TileCoord; center: GeoPoint }) {
    store.selectHome(payload.tile, payload.center)
    if (!gameEngine) return

    if (!tileStreamer) {
        tileStreamer = new TileStreamer(gameEngine.getScene(), payload.tile, (mesh) => gameEngine?.addShadowCaster(mesh))
        tileStreamer.setLocalOwnerId(guestId)
    } else {
        tileStreamer.setOrigin(payload.tile)
    }

    connectMultiplayer()
}

// ---- land: reserve (선점) → buy ----

function handleClaimTile() {
    const tileId = store.currentTileId()
    if (!tileId || !citySocket) return
    citySocket.claimTile(tileId)
}

async function handlePurchaseTile() {
    const tileId = store.currentTileId()
    if (!tileId || !citySocket) return
    const result = await citySocket.purchaseTile(tileId)
    if (result.ok) store.notify('땅을 구매했습니다! 6번 “내 집”으로 집을 지어보세요')
    else notifyReason(result.reason)
}

// ---- building ----

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
        if (!store.isOwnedByMe(cell.tileId)) return notifyReason('not-your-tile')
        if (!store.canAfford('bulldoze')) return notifyReason('insufficient-funds')
        // Removal waits for the server's ack (see onObjectRemoved) — no optimistic demolition to undo.
        citySocket.removeObject(cell)
        return
    }

    if (!store.isOwnedByMe(cell.tileId)) {
        notifyReason(store.isReservedByMe(cell.tileId) ? 'tile-not-owned' : 'not-your-tile')
        return
    }
    const tool = store.activeTool as PlaceableTool
    if (tileStreamer.hasObjectAt(cell.tileId, cell.cellX, cell.cellY)) return
    if (tool === 'home' && store.homes.has(cell.tileId)) return notifyReason('home-exists')
    if (!store.canAfford(tool)) return notifyReason('insufficient-funds')

    pendingPlacements.add(placementKey(cell))
    tileStreamer.applyObjectPlaced({
        id: cellKey,
        tileId: cell.tileId,
        cellX: cell.cellX,
        cellY: cell.cellY,
        tool,
        level: 1,
        ownerId: guestId,
        createdAt: Date.now(),
        ...(tool.startsWith('facility-') ? { funded: true } : {}),
    })
    citySocket.placeObject({ tileId: cell.tileId, cellX: cell.cellX, cellY: cell.cellY, tool })
}

/** Runs on every pointer move (not just while painting) so the ghost box tracks the cursor before the player commits to a placement. */
function updateHoverPreview(pick: PickingInfo | undefined) {
    if (!tileStreamer) return
    if (cameraController?.mode !== 'planning' || store.activeTool === 'select') {
        tileStreamer.hidePreview()
        return
    }
    const cell = pick ? tileStreamer.pickCell(pick) : null
    if (!cell) {
        tileStreamer.hidePreview()
        return
    }
    tileStreamer.showPreview(cell.tileId, cell.cellX, cell.cellY, store.activeTool)
}

// ---- home: exterior door ⇄ Sims-style interior ----

/** World position just outside the local player's front door (the home model's porch faces +z). */
function homeDoor(): Vector3 | null {
    const home = store.myHome
    const coord = home ? parseTileId(home.tileId) : null
    if (!home || !coord || !tileStreamer) return null
    const center = tileStreamer.cellWorldPosition(home.tileId, home.cellX, home.cellY)
    if (!center) return null
    const cellSize = tileSizeMeters(coord) / CITYGAME_GRID_SIZE
    return center.add(new Vector3(0, 0, cellSize * 0.44))
}

function refreshInteriorFacilities() {
    const home = store.myHome
    if (!interior || !home || !tileStreamer) return
    interior.setFacilities(tileStreamer.facilitiesNear(home.tileId, home.cellX, home.cellY))
}

function enterHome() {
    const home = store.myHome
    if (!home) {
        store.notify('아직 집이 없어요 — 구매한 땅에 6번 “내 집”을 지으세요')
        return
    }
    if (!gameEngine || !citySocket || store.view === 'interior') return

    if (!interior || interiorTileId !== home.tileId) {
        interior?.dispose()
        const socket = citySocket
        interior = new InteriorScene(gameEngine.getEngine(), {
            storageKey: `citygame:interior:${guestId}:${home.tileId}`,
            onChange: (snapshot) => store.setInterior(snapshot),
            buy: (itemId) => socket.buyFurniture(itemId),
            sell: (itemId) => socket.sellFurniture(itemId),
            notify: (text) => store.notify(text),
        })
        interiorTileId = home.tileId
        interior.scene.onBeforeRenderObservable.add(() => {
            const dt = (gameEngine?.getEngine().getDeltaTime() ?? 16) / 1000
            const speed = 6 * dt
            if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) interior?.panCamera(-speed * 0.7, speed * 0.7)
            if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) interior?.panCamera(speed * 0.7, -speed * 0.7)
            if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) interior?.panCamera(-speed * 0.7, -speed * 0.7)
            if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) interior?.panCamera(speed * 0.7, speed * 0.7)
        })
    }

    tileStreamer?.hidePreview()
    cameraController?.suspend()
    gameEngine.getScene().detachControl()
    refreshInteriorFacilities()
    interior.activate()
    gameEngine.setActiveScene(interior.scene)
    store.setView('interior')
}

function exitHome() {
    if (!gameEngine || store.view !== 'interior') return
    interior?.deactivate()
    gameEngine.getScene().attachControl()
    cameraController?.resume()
    gameEngine.setActiveScene(null)
    store.setView('city')
}

const onInteriorMode = (mode: InteriorMode) => interior?.setMode(mode)
const onInteriorSelect = (itemId: string | null) => interior?.selectItem(itemId)
const onInteriorSpeed = (speed: GameSpeed) => interior?.setSpeed(speed)
const minimapFeatures = (x: number, z: number, radius: number) => tileStreamer?.minimapFeatures(x, z, radius) ?? null

onMounted(async () => {
    if (!canvasRef.value) return

    gameEngine = new GameEngine(canvasRef.value)
    const { scene, backend } = await gameEngine.init()
    store.setBackend(backend)
    store.setEngineReady(true)

    cameraController = new CameraController(
        scene,
        canvasRef.value,
        (mode) => store.setCameraMode(mode),
        {
            isBlocked: (x, z, r) => tileStreamer?.isBlockedAt(x, z, r) ?? false,
            homeDoor,
            onEnterHome: enterHome,
            onHud: (state) => store.setRoam(state),
            addShadowCaster: (mesh) => gameEngine?.addShadowCaster(mesh),
        },
        () => {
            const door = homeDoor()
            return door ? door.add(new Vector3(0, 0, 2.5)) : null
        },
    )
    cameraController.setBuildModeActive(store.activeTool !== 'select')
    watch(
        () => store.activeTool,
        (tool) => {
            cameraController?.setBuildModeActive(tool !== 'select')
            if (tool === 'select') tileStreamer?.hidePreview()
        },
    )
    watch(
        () => store.cameraMode,
        (mode) => {
            if (mode === 'walkthrough') tileStreamer?.hidePreview()
            else store.setRoam(null)
        },
    )

    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:
                isPainting = true
                lastPaintedCellKey = null
                if (pointerInfo.pickInfo) attemptPlacementAt(pointerInfo.pickInfo)
                break
            case PointerEventTypes.POINTERMOVE:
                updateHoverPreview(pointerInfo.pickInfo ?? undefined)
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
    interior?.dispose()
    tileStreamer?.dispose()
    cameraController?.dispose()
    gameEngine?.dispose()
    store.setEngineReady(false)
})
</script>

<template>
    <div class="citygame-root" @contextmenu.prevent>
        <canvas ref="canvasRef" class="citygame-canvas" />
        <template v-if="store.view === 'city'">
            <GameHud :owner-name="guestName" @claim-tile="handleClaimTile" @purchase-tile="handlePurchaseTile" @enter-home="enterHome" @toggle-camera="cameraController?.toggle()" />
            <FreeRoamHud v-if="store.cameraMode === 'walkthrough'" :features="minimapFeatures" />
            <HotkeyHintOverlay v-if="store.cameraMode === 'planning'" />
        </template>
        <InteriorHud
            v-else
            :snapshot="store.interior"
            :household="store.household"
            :sim-name="guestName"
            @mode="onInteriorMode"
            @select="onInteriorSelect"
            @rotate="interior?.rotateSelection()"
            @speed="onInteriorSpeed"
            @exit="exitHome"
        />
        <transition name="notice">
            <div v-if="store.view === 'interior' && store.lastNotice" :key="store.lastNotice.at" class="interior-notice">{{ store.lastNotice.text }}</div>
        </transition>
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

.interior-notice {
    position: absolute;
    left: 50%;
    top: 90px;
    transform: translateX(-50%);
    background: rgba(29, 29, 31, 0.85);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, sans-serif;
}
</style>
