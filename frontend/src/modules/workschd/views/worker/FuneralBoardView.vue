<template>
  <WorkschdPage
    :title="t('funeral.title')"
    :subtitle="t('funeral.subtitle')"
    test-id="funeral-board"
    body-class="funeral-board"
  >
    <template #actions>
      <span v-if="lastScrapedAt" class="workschd-page__meta">
        {{ t('funeral.lastUpdated', { date: formatDate(lastScrapedAt) }) }}
      </span>
      <q-btn
        v-if="isTeamLeader"
        class="workschd-btn"
        unelevated
        no-caps
        dense
        :loading="scraping"
        :label="t('funeral.refresh')"
        @click="handleScrape"
      />
    </template>
    <template #toolbar>
      <q-btn-toggle
        v-model="selectedRegion"
        :options="regions"
        dense
        no-caps
        unelevated
        toggle-color="dark"
        color="white"
        text-color="grey-8"
        @update:model-value="onRegionChange"
      />
      <q-input
        v-model="searchQuery"
        dense
        outlined
        :placeholder="t('funeral.searchPlaceholder')"
        @update:model-value="debouncedSearch"
      >
        <template #prepend>
          <q-icon name="search" size="16px" />
        </template>
      </q-input>
    </template>

    <q-banner v-if="scrapeReport" class="funeral-board__toast bg-grey-10 text-white" rounded>
      {{ t('funeral.scrapeComplete', { total: scrapeReport.totalScraped, sites: scrapeReport.bySource.length }) }}
      <span v-if="scrapeReport.errors.length">{{ t('funeral.scrapeErrors', { count: scrapeReport.errors.length }) }}</span>
      <template #action>
        <q-btn flat dense :label="t('common.close')" @click="scrapeReport = null" />
      </template>
    </q-banner>

    <div class="lp-card q-mb-md">
      <div class="lp-card__title q-mb-md">장례식장 기준 정보</div>
      <div v-if="homes.length === 0" class="workschd-page__meta">등록된 장례식장이 없습니다.</div>
      <div v-for="home in homes" :key="home.id" class="funeral-catalog__row">
        <div class="funeral-catalog__name">
          {{ home.name }}
          <span v-if="home.district" class="region-badge incheon">{{ home.district }}</span>
          <span v-if="home.roomCount" class="workschd-page__meta">빈소 {{ home.roomCount }}</span>
        </div>
        <div v-if="home.address" class="workschd-page__meta">{{ home.address }}</div>
      </div>
    </div>

    <div v-if="loading" class="funeral-board__empty">
      <q-spinner size="36px" color="grey-8" />
      <p>{{ t('funeral.loading') }}</p>
    </div>

    <div v-else-if="funerals.length === 0" class="funeral-board__empty">
      <p>{{ t('funeral.empty') }}</p>
      <p v-if="isTeamLeader">{{ t('funeral.emptyLeaderHint') }}</p>
    </div>

    <div v-else class="funeral-board__grid">
      <div
        v-for="funeral in funerals"
        :key="funeral.id"
        class="funeral-card"
        @click="openDetail(funeral)"
      >
        <div class="funeral-card__header">
          <span class="region-badge" :class="funeral.region.toLowerCase()">
            {{ regionLabel(funeral.region) }}
          </span>
          <span v-if="funeral.taskId" class="linked-badge">{{ t('funeral.linked') }}</span>
        </div>
        <div class="funeral-card__name">故 {{ funeral.deceasedName }}</div>
        <div class="funeral-card__home">{{ funeral.funeralHomeName }}</div>
        <div v-if="funeral.roomNumber" class="funeral-card__row">
          <span class="funeral-card__label">{{ t('funeral.labels.room') }}</span>
          <span>{{ funeral.roomNumber }}</span>
        </div>
        <div v-if="funeral.chiefMourner" class="funeral-card__row">
          <span class="funeral-card__label">{{ t('funeral.labels.chiefMourner') }}</span>
          <span>{{ funeral.chiefMourner }}</span>
        </div>
        <div v-if="funeral.funeralDate" class="funeral-card__row">
          <span class="funeral-card__label">{{ t('funeral.labels.funeralDate') }}</span>
          <span>{{ funeral.funeralDate }}</span>
        </div>
        <div class="funeral-card__footer">
          <span class="funeral-card__time">{{ formatRelative(funeral.scrapedAt) }}</span>
          <q-icon name="chevron_right" color="grey-5" />
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="row justify-center items-center q-gutter-md q-mt-lg">
      <q-btn flat no-caps :label="t('funeral.pagination.previous')" :disable="currentPage === 0" @click="goPage(currentPage - 1)" />
      <span class="workschd-page__meta">{{ currentPage + 1 }} / {{ totalPages }}</span>
      <q-btn flat no-caps :label="t('funeral.pagination.next')" :disable="currentPage >= totalPages - 1" @click="goPage(currentPage + 1)" />
    </div>

    <FuneralDetailModal
      v-if="selectedFuneral"
      :funeral="selectedFuneral"
      :is-team-leader="isTeamLeader"
      @close="selectedFuneral = null"
      @task-created="onTaskCreated"
    />
  </WorkschdPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/common/store_user';
import scraperApi, { FuneralHome, ScrapedFuneral, ScrapeReport } from '@/modules/workschd/api/api-scraper';
import FuneralDetailModal from '@/modules/workschd/components/dialog/FuneralDetailModal.vue';
import WorkschdPage from '@/modules/workschd/components/WorkschdPage.vue';

const { t } = useI18n();
const userStore = useUserStore();

const funerals = ref<ScrapedFuneral[]>([]);
const homes = ref<FuneralHome[]>([]);
const loading = ref(false);
const scraping = ref(false);
const scrapeReport = ref<ScrapeReport | null>(null);
const selectedFuneral = ref<ScrapedFuneral | null>(null);
const selectedRegion = ref<'ALL' | 'INCHEON' | 'BUCHEON'>('ALL');
const searchQuery = ref('');
const currentPage = ref(0);
const totalPages = ref(0);
const totalElements = ref(0);
const lastScrapedAt = ref<string | null>(null);

const regions = computed(() => [
  { label: t('funeral.region.all'), value: 'ALL' },
  { label: t('funeral.region.incheon'), value: 'INCHEON' },
  { label: t('funeral.region.bucheon'), value: 'BUCHEON' }
]);

const isTeamLeader = computed(() => {
  const roles = userStore.user?.accountRoles?.map(r => r.roleType) ?? [];
  return roles.includes('TEAM_LEADER') || roles.includes('ADMIN')
    || roles.includes('MANAGER') || roles.includes('OWNER');
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function regionLabel(region: string): string {
  if (region === 'INCHEON') return t('funeral.region.incheon');
  if (region === 'BUCHEON') return t('funeral.region.bucheon');
  return region;
}

async function fetchHomes() {
  try {
    const res = await scraperApi.getFuneralHomes({
      region: selectedRegion.value === 'ALL' ? undefined : selectedRegion.value,
      page: 0,
      size: 100,
    });
    homes.value = res.data.content ?? [];
  } catch (e) {
    console.error('Failed to fetch funeral homes:', e);
  }
}

async function fetchFunerals() {
  loading.value = true;
  try {
    const res = await scraperApi.getScrapedFunerals({
      region: selectedRegion.value === 'ALL' ? undefined : selectedRegion.value,
      funeralHomeName: searchQuery.value || undefined,
      page: currentPage.value,
      size: 20
    });
    funerals.value = res.data.content;
    totalPages.value = res.data.totalPages;
    totalElements.value = res.data.totalElements;
    if (funerals.value.length > 0) {
      lastScrapedAt.value = funerals.value[0].scrapedAt;
    }
  } catch (e) {
    console.error('Failed to fetch funerals:', e);
  } finally {
    loading.value = false;
  }
}

async function handleScrape() {
  if (scraping.value) return;
  scraping.value = true;
  scrapeReport.value = null;
  try {
    const res = await scraperApi.triggerScrape();
    scrapeReport.value = res.data.report;
    await fetchFunerals();
    setTimeout(() => { scrapeReport.value = null; }, 6000);
  } catch (e) {
    console.error('Scrape failed:', e);
  } finally {
    scraping.value = false;
  }
}

function onRegionChange() {
  currentPage.value = 0;
  fetchFunerals();
  fetchHomes();
}

function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 0;
    fetchFunerals();
  }, 400);
}

function goPage(page: number) {
  currentPage.value = page;
  fetchFunerals();
}

function openDetail(funeral: ScrapedFuneral) {
  selectedFuneral.value = funeral;
}

function onTaskCreated(taskId: number) {
  if (selectedFuneral.value) {
    selectedFuneral.value = { ...selectedFuneral.value, taskId };
    const idx = funerals.value.findIndex(f => f.id === selectedFuneral.value!.id);
    if (idx !== -1) funerals.value[idx] = { ...funerals.value[idx], taskId };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('funeral.time.justNow');
  if (mins < 60) return t('funeral.time.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('funeral.time.hoursAgo', { count: hrs });
  return t('funeral.time.daysAgo', { count: Math.floor(hrs / 24) });
}

onMounted(() => {
  fetchFunerals();
  fetchHomes();
});
</script>
