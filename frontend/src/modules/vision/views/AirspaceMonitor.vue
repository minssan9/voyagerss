<template>
  <div class="page-vision page-airspace">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('airspace.title') }}</h1>
      <p class="page-vision__lead">{{ t('airspace.lead') }}</p>
      <div class="page-airspace__status">
        <span :class="['page-airspace__pill', online ? 'page-airspace__pill--online' : 'page-airspace__pill--offline']" data-test="airspace-online">
          <q-icon name="sensors" size="14px" />{{ online ? t('airspace.online') : t('airspace.offline') }}
        </span>
        <span v-if="snapshot?.sensors" class="page-airspace__pill">
          <q-icon name="radar" size="14px" />{{ t('airspace.radar', { mode: snapshot.sensors.radar }) }}
        </span>
        <span v-if="snapshot" class="page-airspace__pill" data-test="airspace-gimbal">
          <q-icon name="control_camera" size="14px" />{{ t('airspace.gimbal', { pan: snapshot.gimbal.pan.toFixed(1), tilt: snapshot.gimbal.tilt.toFixed(1) }) }}
        </span>
        <span v-for="level in levels" :key="level" :class="`page-airspace__pill page-airspace__count--${level.toLowerCase()}`">
          {{ t(`airspace.threat.${level}`) }} {{ counts[level] }}
        </span>
      </div>
    </header>

    <q-banner v-if="!online" rounded class="page-airspace__hint" data-test="airspace-offline-hint">
      {{ t('airspace.offlineHint') }}
      <code class="page-airspace__code">python -m vision_cam.airspace --simulate --backend {{ backendHint }}</code>
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-5">
        <q-card flat bordered class="page-vision__card page-airspace__scope-card">
          <q-card-section>
            <div class="page-vision__card-title">{{ t('airspace.scope.title') }}</div>
            <AirspaceRadarScope
              :tracks="tracks"
              :pan="snapshot?.gimbal.pan ?? 0"
              :hfov="snapshot?.camera?.hfov ?? 0"
              :target-id="snapshot?.gimbal.targetId ?? null"
            />
            <p class="page-vision__meta page-airspace__legend">{{ t('airspace.scope.legend') }}</p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-7">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">{{ t('airspace.tracks.title') }}</div>
            <q-table
              flat
              dense
              row-key="id"
              :rows="tracks"
              :columns="columns"
              :pagination="{ rowsPerPage: 0 }"
              hide-pagination
              :no-data-label="t('airspace.tracks.empty')"
              data-test="airspace-tracks"
            >
              <template #body-cell-id="props">
                <q-td :props="props">
                  T{{ props.row.id }}
                  <q-icon v-if="props.row.id === snapshot?.gimbal.targetId" name="center_focus_strong" color="primary" size="16px">
                    <q-tooltip>{{ t('airspace.tracks.following') }}</q-tooltip>
                  </q-icon>
                </q-td>
              </template>
              <template #body-cell-threat="props">
                <q-td :props="props">
                  <span :class="`page-airspace__threat page-airspace__threat--${props.row.threat.toLowerCase()}`">
                    {{ t(`airspace.threat.${props.row.threat}`) }}
                  </span>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">{{ t('airspace.events.title') }}</div>
            <q-list dense separator class="page-airspace__events" data-test="airspace-events">
              <q-item v-if="!events.length">
                <q-item-section class="page-vision__meta">{{ t('airspace.events.empty') }}</q-item-section>
              </q-item>
              <q-item v-for="ev in events" :key="ev.seq">
                <q-item-section avatar>
                  <q-icon :name="eventIcon(ev)" :class="ev.threat ? `page-airspace__threat--${ev.threat.toLowerCase()}` : ''" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ describe(ev) }}</q-item-label>
                  <q-item-label caption>{{ new Date(ev.at).toLocaleTimeString() }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QTableColumn } from 'quasar'
import AirspaceRadarScope from '@/modules/vision/components/AirspaceRadarScope.vue'
import {
  getAirspaceEvents,
  getAirspaceStatus,
  openAirspaceStream,
  type AirspaceEvent,
  type AirspaceSnapshot,
  type ThreatLevel,
} from '@/modules/vision/api/api-airspace'

const STALE_MS = 3000
const MAX_EVENTS = 100

const { t } = useI18n()
const snapshot = ref<AirspaceSnapshot | null>(null)
const events = ref<AirspaceEvent[]>([])
const lastSnapshotAt = ref(0)
const now = ref(Date.now())
const levels: ThreatLevel[] = ['HIGH', 'MEDIUM', 'LOW']
const backendHint = window.location.origin

const online = computed(() => snapshot.value !== null && now.value - lastSnapshotAt.value <= STALE_MS)

const tracks = computed(() =>
  (snapshot.value?.tracks ?? [])
    .filter((tr) => tr.status === 'confirmed')
    .sort((a, b) => b.threatScore - a.threatScore),
)

const counts = computed(() => {
  const c: Record<ThreatLevel, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const tr of tracks.value) c[tr.threat] += 1
  return c
})

const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? '—' : v.toFixed(digits))

const columns = computed<QTableColumn[]>(() => [
  { name: 'id', label: t('airspace.tracks.id'), field: 'id', align: 'left' },
  { name: 'label', label: t('airspace.tracks.label'), field: 'label', align: 'left' },
  { name: 'threat', label: t('airspace.tracks.threat'), field: 'threat', align: 'left' },
  { name: 'azimuth', label: t('airspace.tracks.azimuth'), field: 'azimuth', format: (v: number) => `${fmt(v)}°` },
  { name: 'elevation', label: t('airspace.tracks.elevation'), field: 'elevation', format: (v: number) => `${fmt(v)}°` },
  { name: 'range', label: t('airspace.tracks.range'), field: 'range', format: (v: number | null) => fmt(v, 0) },
  { name: 'radialVelocity', label: t('airspace.tracks.velocity'), field: 'radialVelocity', format: (v: number | null) => fmt(v) },
  { name: 'sources', label: t('airspace.tracks.sources'), field: 'sources', format: (v: string[]) => v.map((s) => t(`airspace.source.${s}`)).join(' + '), align: 'left' },
])

function eventIcon(ev: AirspaceEvent): string {
  return ev.type === 'track_lost' ? 'flight_land' : ev.type === 'threat_up' ? 'warning' : 'flight_takeoff'
}

function describe(ev: AirspaceEvent): string {
  if (ev.type === 'track_lost') return t('airspace.events.lost', { id: ev.trackId })
  const where = t('airspace.events.where', {
    az: fmt(ev.azimuth),
    el: fmt(ev.elevation),
    range: ev.range === null || ev.range === undefined ? '—' : `${ev.range.toFixed(0)}m`,
  })
  const level = ev.threat ? t(`airspace.threat.${ev.threat}`) : ''
  const key = ev.type === 'threat_up' ? 'airspace.events.threatUp' : 'airspace.events.new'
  return t(key, { id: ev.trackId, level, where })
}

let close: (() => void) | null = null
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const [status, recent] = await Promise.all([getAirspaceStatus(), getAirspaceEvents(MAX_EVENTS)])
  if (status.result === 'SUCCESS' && status.data?.snapshot) {
    snapshot.value = status.data.snapshot
    lastSnapshotAt.value = status.data.online ? Date.now() : 0
  }
  if (recent.result === 'SUCCESS' && recent.data) events.value = recent.data

  close = openAirspaceStream({
    onSnapshot: (s) => {
      snapshot.value = s
      lastSnapshotAt.value = Date.now()
    },
    onEvent: (ev) => {
      events.value = [ev, ...events.value].slice(0, MAX_EVENTS)
    },
    onConnection: () => {},
  })
  ticker = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => {
  close?.()
  if (ticker) clearInterval(ticker)
})
</script>
