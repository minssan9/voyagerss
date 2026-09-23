import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { CITYGAME_DEFAULT_NEIGHBOR_RADIUS } from '../config/world'
import { STARTING_HOUSEHOLD, STARTING_TREASURY, TOOL_COST } from '../config/economy'
import { tileIdOf } from '../geo/tileMath'
import type { BuildTool, CameraMode, CityAccount, GeoPoint, RendererBackend, TileClaim, TileCoord } from '../types'
import type { FreeRoamHudState } from '../engine/FreeRoamController'
import type { InteriorSnapshot } from '../engine/interior/InteriorScene'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

/** `city` = shared SimCity map; `interior` = your own home, Sims-style. */
export type GameView = 'city' | 'interior'

export const useCityGameStore = defineStore('citygame', () => {
    const backend = ref<RendererBackend>('webgl2')
    const cameraMode = ref<CameraMode>('planning')
    const activeTool = ref<BuildTool>('select')
    const showHotkeyHints = ref(true)
    const fps = ref(0)
    const isEngineReady = ref(false)
    const view = ref<GameView>('city')

    // Real-world map sync
    const showMapPicker = ref(true)
    const originTile = ref<TileCoord | null>(null)
    const currentTile = ref<TileCoord | null>(null)
    const geoCenter = ref<GeoPoint | null>(null)
    const neighborRadius = ref(CITYGAME_DEFAULT_NEIGHBOR_RADIUS)

    // Economy — server-authoritative; these are the last values the server pushed.
    const account = ref<CityAccount | null>(null)
    const treasury = computed(() => account.value?.treasury ?? STARTING_TREASURY)
    const household = computed(() => account.value?.household ?? STARTING_HOUSEHOLD)

    // Multiplayer
    const connectionStatus = ref<ConnectionStatus>('disconnected')
    const localOwnerId = ref<string | undefined>(undefined)
    const claims = reactive(new Map<string, TileClaim>())
    const occupantCounts = reactive(new Map<string, number>())
    /** tileId -> cell of the home placed there (one per tile), so the HUD can offer "enter home". */
    const homes = reactive(new Map<string, { cellX: number; cellY: number; ownerId: string }>())

    const lastNotice = ref<{ text: string; at: number } | null>(null)

    // Free roam (GTA-style) and home interior (Sims-style) live state, pushed from the engine a few times a second.
    const roam = ref<FreeRoamHudState | null>(null)
    const interior = ref<InteriorSnapshot | null>(null)

    function setRoam(value: FreeRoamHudState | null) {
        roam.value = value
    }

    function setInterior(value: InteriorSnapshot | null) {
        interior.value = value
    }

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

    function setView(value: GameView) {
        view.value = value
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

    function setAccount(value: CityAccount | null) {
        account.value = value
    }

    function upsertClaim(claim: TileClaim | null, tileId?: string) {
        if (claim) claims.set(claim.tileId, claim)
        else if (tileId) claims.delete(tileId)
    }

    function releaseClaim(tileId: string) {
        claims.delete(tileId)
    }

    /** Owned (paid for) by me — the only state that allows building. */
    function isOwnedByMe(tileId: string): boolean {
        const claim = claims.get(tileId)
        return !!claim && claim.status === 'owned' && claim.ownerId === localOwnerId.value
    }

    function isReservedByMe(tileId: string): boolean {
        const claim = claims.get(tileId)
        return !!claim && claim.status === 'reserved' && claim.ownerId === localOwnerId.value
    }

    /** Any claim (reserved or owned) held by me — drives the ground-plate "mine" color. */
    function isClaimedByMe(tileId: string): boolean {
        const claim = claims.get(tileId)
        return !!claim && claim.ownerId === localOwnerId.value
    }

    function setHome(tileId: string, home: { cellX: number; cellY: number; ownerId: string } | null) {
        if (home) homes.set(tileId, home)
        else homes.delete(tileId)
    }

    const myHome = computed(() => {
        for (const [tileId, home] of homes) {
            if (home.ownerId === localOwnerId.value) return { tileId, ...home }
        }
        return null
    })

    function setOccupantCount(tileId: string, count: number) {
        occupantCounts.set(tileId, count)
    }

    function currentTileId(): string | null {
        return currentTile.value ? tileIdOf(currentTile.value) : null
    }

    function canAfford(tool: BuildTool): boolean {
        return treasury.value >= TOOL_COST[tool]
    }

    function notify(text: string) {
        const at = Date.now()
        lastNotice.value = { text, at }
        // Compare by timestamp: the ref hands back a reactive proxy, so object identity never matches.
        setTimeout(() => {
            if (lastNotice.value?.at === at) lastNotice.value = null
        }, 2800)
    }

    return {
        backend,
        cameraMode,
        activeTool,
        showHotkeyHints,
        fps,
        isEngineReady,
        view,
        showMapPicker,
        originTile,
        currentTile,
        geoCenter,
        neighborRadius,
        account,
        treasury,
        household,
        connectionStatus,
        localOwnerId,
        claims,
        occupantCounts,
        homes,
        myHome,
        lastNotice,
        roam,
        interior,
        setRoam,
        setInterior,
        setBackend,
        setCameraMode,
        setActiveTool,
        toggleHotkeyHints,
        setFps,
        setEngineReady,
        setView,
        selectHome,
        setCurrentTile,
        setNeighborRadius,
        setConnectionStatus,
        setLocalOwnerId,
        setAccount,
        upsertClaim,
        releaseClaim,
        isOwnedByMe,
        isReservedByMe,
        isClaimedByMe,
        setHome,
        setOccupantCount,
        currentTileId,
        canAfford,
        notify,
    }
})
