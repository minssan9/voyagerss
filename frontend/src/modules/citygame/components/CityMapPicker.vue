<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { Map as LMap, Rectangle } from 'leaflet'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CITYGAME_DEFAULT_ORIGIN, CITYGAME_ZOOM } from '../config/world'
import { latLonToTile, tileBounds, tileIdOf } from '../geo/tileMath'
import type { GeoPoint, TileCoord } from '../types'

const emit = defineEmits<{ (event: 'select', payload: { tile: TileCoord; center: GeoPoint }): void }>()

const mapContainer = ref<HTMLDivElement | null>(null)
const selectedLabel = ref('')
let map: LMap | null = null
let highlight: Rectangle | null = null
let selectedTile: TileCoord | null = null

function highlightTile(point: GeoPoint) {
    const tile = latLonToTile(point)
    selectedTile = tile
    const bounds = tileBounds(tile)
    selectedLabel.value = tileIdOf(tile)

    const leafletBounds: L.LatLngBoundsExpression = [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
    ]

    if (!highlight) {
        highlight = L.rectangle(leafletBounds, { color: '#1d1d1f', weight: 2, fillColor: '#34c759', fillOpacity: 0.25 }).addTo(map!)
    } else {
        highlight.setBounds(leafletBounds)
    }
}

function confirmSelection() {
    if (!selectedTile) return
    const bounds = tileBounds(selectedTile)
    emit('select', {
        tile: selectedTile,
        center: { lat: (bounds.north + bounds.south) / 2, lon: (bounds.east + bounds.west) / 2 },
    })
}

function locateMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const point = { lat: pos.coords.latitude, lon: pos.coords.longitude }
            map?.setView([point.lat, point.lon], 17)
            highlightTile(point)
        },
        () => {
            /* geolocation denied/unavailable — keep the default origin already shown */
        },
        { timeout: 5000 },
    )
}

onMounted(() => {
    if (!mapContainer.value) return

    map = L.map(mapContainer.value).setView([CITYGAME_DEFAULT_ORIGIN.lat, CITYGAME_DEFAULT_ORIGIN.lon], 17)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
        highlightTile({ lat: e.latlng.lat, lon: e.latlng.lng })
    })

    highlightTile(CITYGAME_DEFAULT_ORIGIN)
    locateMe()
})

onBeforeUnmount(() => {
    map?.remove()
    map = null
})
</script>

<template>
    <div class="picker-overlay">
        <div class="picker-panel">
            <div class="picker-header">
                <span class="title">플레이할 위치 선택</span>
                <span class="subtitle">지도를 클릭해 도시 타일을 고르세요 · zoom {{ CITYGAME_ZOOM }}</span>
            </div>
            <div ref="mapContainer" class="picker-map" />
            <div class="picker-footer">
                <span class="tile-label">{{ selectedLabel }}</span>
                <div class="actions">
                    <button class="ghost-btn" @click="locateMe">내 위치</button>
                    <button class="primary-btn" @click="confirmSelection">이 타일 선점하기</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.picker-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 22, 26, 0.55);
    backdrop-filter: blur(6px);
    z-index: 20;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
}

.picker-panel {
    width: min(640px, 92vw);
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.picker-header {
    padding: 18px 22px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.title {
    font-size: 17px;
    font-weight: 600;
    color: #1d1d1f;
}

.subtitle {
    font-size: 12px;
    color: #6e6e73;
}

.picker-map {
    width: 100%;
    height: 340px;
}

.picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    gap: 12px;
}

.tile-label {
    font-size: 12px;
    color: #6e6e73;
    font-variant-numeric: tabular-nums;
}

.actions {
    display: flex;
    gap: 8px;
}

.ghost-btn,
.primary-btn {
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.ghost-btn {
    background: rgba(0, 0, 0, 0.06);
    color: #1d1d1f;
}

.primary-btn {
    background: #1d1d1f;
    color: #fff;
}
</style>
