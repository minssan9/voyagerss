<template>
  <div class="page-vision page-airspace">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('airspace.history.title') }}</h1>
      <p class="page-vision__lead">{{ t('airspace.history.lead') }}</p>
    </header>

    <q-banner v-if="historyDisabled" rounded class="page-airspace__hint" data-test="airspace-history-disabled">
      {{ t('airspace.history.disabled') }}
    </q-banner>

    <div class="page-airspace__history-filters">
      <q-input v-model="from" dense outlined type="datetime-local" :label="t('airspace.history.from')" data-test="airspace-history-from" />
      <q-input v-model="to" dense outlined type="datetime-local" :label="t('airspace.history.to')" data-test="airspace-history-to" />
      <q-select
        v-model="threat" dense outlined emit-value map-options clearable
        :options="threatOptions" :label="t('airspace.history.threat')"
        class="page-airspace__filter" data-test="airspace-history-threat"
      />
      <q-btn unelevated no-caps color="primary" icon="search" :label="t('airspace.history.search')" data-test="airspace-history-search" @click="reload" />
      <q-btn outline no-caps icon="download" :label="t('airspace.history.csv')" :loading="exporting" data-test="airspace-history-csv" @click="exportCsv" />
      <q-btn flat no-caps icon="radar" :label="t('airspace.history.back')" @click="router.push('/vision/airspace')" />
    </div>

    <q-tabs v-model="tab" dense align="left" class="page-airspace__history-tabs" @update:model-value="switchTab">
      <q-tab name="events" :label="t('airspace.history.events')" data-test="airspace-history-tab-events" />
      <q-tab name="tracks" :label="t('airspace.history.tracks')" data-test="airspace-history-tab-tracks" />
    </q-tabs>

    <q-card flat bordered class="page-vision__card">
      <q-table
        v-model:pagination="pagination"
        flat dense
        :row-key="rowKey"
        :rows="rows"
        :columns="tab === 'events' ? eventColumns : trackColumns"
        :loading="loading"
        :rows-per-page-options="[25, 50, 100]"
        :no-data-label="t('airspace.history.empty')"
        data-test="airspace-history-table"
        @request="onRequest"
      >
        <template #body-cell-threat="props">
          <q-td :props="props">
            <span v-if="props.value" :class="`page-airspace__threat page-airspace__threat--${String(props.value).toLowerCase()}`">
              {{ t(`airspace.threat.${props.value}`) }}
            </span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Notify } from 'quasar'
import type { QTableColumn, QTableProps } from 'quasar'
import {
  getAirspaceStatus,
  getHistoryEvents,
  getHistoryTracks,
  toCsv,
  type AirspaceEvent,
  type HistoryQuery,
  type ThreatLevel,
  type TrackSummary,
} from '@/modules/vision/api/api-airspace'

type Pagination = NonNullable<QTableProps['pagination']>

const EXPORT_LIMIT = 500

const { t } = useI18n()
const router = useRouter()
const tab = ref<'events' | 'tracks'>('events')
const rows = ref<(AirspaceEvent | TrackSummary)[]>([])
const loading = ref(false)
const exporting = ref(false)
const historyDisabled = ref(false)
const threat = ref<ThreatLevel | null>(null)
const pagination = ref<Pagination>({ page: 1, rowsPerPage: 25, rowsNumber: 0 })

function localInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const to = ref(localInput(new Date(Date.now() + 60_000)))
const from = ref(localInput(new Date(Date.now() - 24 * 3600_000)))

const threatOptions = computed(() =>
  (['HIGH', 'MEDIUM', 'LOW'] as ThreatLevel[]).map((v) => ({ value: v, label: t(`airspace.threat.${v}`) })),
)

const time = (v: string) => new Date(v).toLocaleString()
const num = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : v.toFixed(d))
// One key function for both tabs: rows of the previous tab are still on screen while
// the next tab loads.
const rowKey = (r: AirspaceEvent | TrackSummary) => ('seq' in r ? `e${r.seq}` : `t${r.sessionId}-${r.trackId}`)

const eventColumns = computed<QTableColumn[]>(() => [
  { name: 'at', label: t('airspace.history.at'), field: 'at', format: time, align: 'left' },
  { name: 'type', label: t('airspace.history.type'), field: 'type', format: (v: string) => t(`airspace.history.eventType.${v}`), align: 'left' },
  { name: 'trackId', label: t('airspace.tracks.id'), field: 'trackId', format: (v: number) => `T${v}`, align: 'left' },
  { name: 'threat', label: t('airspace.tracks.threat'), field: 'threat', align: 'left' },
  { name: 'label', label: t('airspace.tracks.label'), field: 'label', align: 'left' },
  { name: 'azimuth', label: t('airspace.tracks.azimuth'), field: 'azimuth', format: (v: number) => `${num(v)}°` },
  { name: 'elevation', label: t('airspace.tracks.elevation'), field: 'elevation', format: (v: number) => `${num(v)}°` },
  { name: 'range', label: t('airspace.tracks.range'), field: 'range', format: (v: number | null) => num(v, 0) },
])

const trackColumns = computed<QTableColumn[]>(() => [
  { name: 'firstSeen', label: t('airspace.history.firstSeen'), field: 'firstSeen', format: time, align: 'left' },
  { name: 'lastSeen', label: t('airspace.history.lastSeen'), field: 'lastSeen', format: time, align: 'left' },
  { name: 'trackId', label: t('airspace.tracks.id'), field: 'trackId', format: (v: number) => `T${v}`, align: 'left' },
  { name: 'threat', label: t('airspace.history.maxThreat'), field: 'maxThreat', align: 'left' },
  { name: 'label', label: t('airspace.tracks.label'), field: 'label', align: 'left' },
  { name: 'minRangeM', label: t('airspace.history.minRange'), field: 'minRangeM', format: (v: number | null) => num(v, 0) },
  { name: 'sources', label: t('airspace.tracks.sources'), field: 'sources', align: 'left' },
])

function query(limit: number, offset: number): HistoryQuery {
  return {
    from: from.value ? new Date(from.value).toISOString() : undefined,
    to: to.value ? new Date(to.value).toISOString() : undefined,
    threat: threat.value ?? undefined,
    limit,
    offset,
  }
}

async function load(p: Pagination) {
  loading.value = true
  const rpp = p.rowsPerPage || 25
  const q = query(rpp, ((p.page ?? 1) - 1) * rpp)
  const res = tab.value === 'events' ? await getHistoryEvents(q) : await getHistoryTracks(q)
  loading.value = false
  if (res.result !== 'SUCCESS' || !res.data) {
    Notify.create({ type: 'negative', message: res.message })
    return
  }
  rows.value = res.data.rows
  pagination.value = { ...p, rowsNumber: res.data.total }
}

function onRequest(props: { pagination: Pagination }) {
  void load(props.pagination)
}

function switchTab() {
  rows.value = []
  reload()
}

function reload() {
  void load({ ...pagination.value, page: 1 })
}

async function exportCsv() {
  exporting.value = true
  const q = query(EXPORT_LIMIT, 0)
  let csv: string
  if (tab.value === 'events') {
    const res = await getHistoryEvents(q)
    csv = toCsv(
      ['at', 'session', 'type', 'track', 'threat', 'label', 'azimuth', 'elevation', 'range_m'],
      (res.data?.rows ?? []).map((e) => [e.at, e.sessionId, e.type, e.trackId, e.threat, e.label, e.azimuth, e.elevation, e.range]),
    )
  } else {
    const res = await getHistoryTracks(q)
    csv = toCsv(
      ['first_seen', 'last_seen', 'session', 'track', 'max_threat', 'max_score', 'label', 'min_range_m', 'sources', 'last_azimuth', 'last_elevation'],
      (res.data?.rows ?? []).map((r) => [r.firstSeen, r.lastSeen, r.sessionId, r.trackId, r.maxThreat, r.maxScore, r.label, r.minRangeM, r.sources, r.lastAzimuth, r.lastElevation]),
    )
  }
  exporting.value = false
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `airspace-${tab.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  const status = await getAirspaceStatus()
  historyDisabled.value = status.result === 'SUCCESS' && status.data?.history === false
  reload()
})
</script>
