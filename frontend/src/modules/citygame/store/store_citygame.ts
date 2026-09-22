import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { CITYGAME_DEFAULT_NEIGHBOR_RADIUS } from '../config/world'
import { STARTING_FUNDS, TOOL_COST } from '../config/economy'
import { tileIdOf } from '../geo/tileMath'
import type { BuildTool, CameraMode, GeoPoint, RendererBackend, TileClaim, TileCoord } from '../types'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export const useCityGameStore = defineStore('citygame', () => {
    const backend = ref<RendererBackend>('webgl2')
    const cameraMode = ref<CameraMode>('planning')
    const activeTool = ref<BuildTool>('select')
    const showHotkeyHints = ref(true)
    const fps = ref(0)
    const isEngineReady = ref(false)

    // Real-world map sync
    const showMapPicker = ref(true)
    const originTile = ref<TileCoord | null>(null)
    const currentTile = ref<TileCoord | null>(null)
    const geoCenter = ref<GeoPoint | null>(null)
    const neighborRadius = ref(CITYGAME_DEFAULT_NEIGHBOR_RADIUS)

    // Economy (local-only, cosmetic — not synced across players)
    const funds = ref(STARTING_FUNDS)

    // Multiplayer
    const connectionStatus = ref<ConnectionStatus>('disconnected')
    const localOwnerId = ref<string | undefined>(undefined)
    const claims = reactive(new Map<string, TileClaim>())
    const occupantCounts = reactive(new Map<string, number>())

    function setBackend(value: RendererBackend) {
        backend.value = value
    }

    function setCameraMode(value: CameraMode) {
        cameraMode.value = value
    }

    function setActiveTool(value: BuildTool) {
        activeTool.value = value
    }

    function toggleHotkeyHints() {
        showHotkeyHints.value = !showHotkeyHints.value
    }

    function setFps(value: number) {
        fps.value = value
    }

    function setEngineReady(value: boolean) {
        isEngineReady.value = value
    }

    function selectHome(tile: TileCoord, center: GeoPoint) {
        originTile.value = tile
        currentTile.value = tile
        geoCenter.value = center
        showMapPicker.value = false
    }

    function setCurrentTile(tile: TileCoord) {
        currentTile.value = tile
    }

    function setNeighborRadius(radius: number) {
        neighborRadius.value = radius
    }

    function setConnectionStatus(status: ConnectionStatus) {
        connectionStatus.value = status
    }

    function setLocalOwnerId(id: string | undefined) {
        localOwnerId.value = id
    }

    function upsertClaim(claim: TileClaim) {
        claims.set(claim.tileId, claim)
    }

    function isClaimedByMe(tileId: string): boolean {
        const claim = claims.get(tileId)
        return !!claim && claim.ownerId === localOwnerId.value
    }

    function setOccupantCount(tileId: string, count: number) {
        occupantCounts.set(tileId, count)
    }

    function currentTileId(): string | null {
        return currentTile.value ? tileIdOf(currentTile.value) : null
    }

    function canAfford(tool: BuildTool): boolean {
        return funds.value >= TOOL_COST[tool]
    }

    /** Deducts the tool's cost if affordable; returns whether the spend happened. */
    function spend(tool: BuildTool): boolean {
        if (!canAfford(tool)) return false
        funds.value -= TOOL_COST[tool]
        return true
    }

    return {
        backend,
        cameraMode,
        activeTool,
        showHotkeyHints,
        fps,
        isEngineReady,
        showMapPicker,
        originTile,
        currentTile,
        geoCenter,
        neighborRadius,
        funds,
        connectionStatus,
        localOwnerId,
        claims,
        occupantCounts,
        setBackend,
        setCameraMode,
        setActiveTool,
        toggleHotkeyHints,
        setFps,
        setEngineReady,
        selectHome,
        setCurrentTile,
        setNeighborRadius,
        setConnectionStatus,
        setLocalOwnerId,
        upsertClaim,
        isClaimedByMe,
        setOccupantCount,
        currentTileId,
        canAfford,
        spend,
    }
})
