<template>
  <svg class="airspace-scope" viewBox="-1.12 -1.12 2.24 2.24" role="img" :aria-label="t('airspace.scope.aria')">
    <circle class="airspace-scope__disc" r="1" />
    <path class="airspace-scope__coverage" :d="sector(-90, 90, 1)" />
    <path v-if="hfov" class="airspace-scope__fov" :d="sector(pan - hfov / 2, pan + hfov / 2, 1)" />
    <circle v-for="ring in rings" :key="ring" class="airspace-scope__ring" :r="ring / maxRange" />
    <text v-for="ring in rings" :key="`l${ring}`" class="airspace-scope__ring-label" x="0.02" :y="-ring / maxRange + 0.05">
      {{ ring }}m
    </text>
    <line class="airspace-scope__axis" x1="0" y1="-1" x2="0" y2="1" />
    <line class="airspace-scope__axis" x1="-1" y1="0" x2="1" y2="0" />
    <line class="airspace-scope__heading" x1="0" y1="0" :x2="polar(pan, 1)[0]" :y2="polar(pan, 1)[1]" />

    <g v-for="m in markers" :key="m.id" :class="['airspace-scope__track', `airspace-scope__track--${m.threat.toLowerCase()}`]">
      <template v-if="m.ranged">
        <circle :cx="m.x" :cy="m.y" :r="m.target ? 0.05 : 0.035" :class="{ 'airspace-scope__track-target': m.target }" />
        <text :x="m.x + 0.06" :y="m.y - 0.04" class="airspace-scope__track-label">T{{ m.id }}</text>
      </template>
      <template v-else>
        <line :x1="m.x * 0.92" :y1="m.y * 0.92" :x2="m.x * 1.06" :y2="m.y * 1.06" class="airspace-scope__bearing" />
        <text :x="m.x * 1.1" :y="m.y * 1.1" class="airspace-scope__track-label">T{{ m.id }}</text>
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AirspaceTrack } from '@/modules/vision/api/api-airspace'

const props = withDefaults(defineProps<{
  tracks: AirspaceTrack[]
  pan: number
  hfov?: number
  targetId?: number | null
  maxRange?: number
}>(), { hfov: 0, targetId: null, maxRange: 150 })

const { t } = useI18n()
const rings = computed(() => [50, 100, 150].filter((r) => r <= props.maxRange))

// 위가 정면(방위각 0°), 오른쪽이 +. SVG y 는 아래로 증가한다.
function polar(azDeg: number, radius: number): [number, number] {
  const a = (azDeg * Math.PI) / 180
  return [radius * Math.sin(a), -radius * Math.cos(a)]
}

function sector(fromDeg: number, toDeg: number, radius: number): string {
  const [x0, y0] = polar(fromDeg, radius)
  const [x1, y1] = polar(toDeg, radius)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M0 0 L${x0} ${y0} A${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`
}

const markers = computed(() =>
  props.tracks
    .filter((tr) => tr.status === 'confirmed')
    .map((tr) => {
      const ranged = tr.range !== null
      const ground = ranged ? Math.min(1, (tr.range! * Math.cos((tr.elevation * Math.PI) / 180)) / props.maxRange) : 1
      const [x, y] = polar(tr.azimuth, ground)
      return { id: tr.id, threat: tr.threat, ranged, x, y, target: tr.id === props.targetId }
    }),
)
</script>
