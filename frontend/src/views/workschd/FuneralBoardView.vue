<template>
  <div class="funeral-board">
    <!-- Header -->
    <div class="board-header">
      <div class="header-left">
        <h1 class="board-title">빈소 현황</h1>
        <span class="board-subtitle">인천 · 부천 장례식장</span>
      </div>
      <div class="header-right">
        <span v-if="lastScrapedAt" class="last-updated">
          마지막 업데이트: {{ formatDate(lastScrapedAt) }}
        </span>
        <button
          v-if="isTeamLeader"
          class="btn-scrape"
          :class="{ loading: scraping }"
          :disabled="scraping"
          @click="handleScrape"
        >
          <span v-if="!scraping">새로고침</span>
          <span v-else>수집 중...</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-chips">
        <button
          v-for="r in regions"
          :key="r.value"
          class="chip"
          :class="{ active: selectedRegion === r.value }"
          @click="setRegion(r.value)"
        >
          {{ r.label }}
        </button>
      </div>
      <div class="filter-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="장례식장 검색..."
          class="search-input"
          @input="debouncedSearch"
        />
      </div>
    </div>

    <!-- Scrape Report Toast -->
    <transition name="fade">
      <div v-if="scrapeReport" class="scrape-toast">
        <div class="toast-title">수집 완료</div>
        <div class="toast-body">
          {{ scrapeReport.totalScraped }}건 수집
          · {{ scrapeReport.bySource.length }}개 사이트
          <span v-if="scrapeReport.errors.length" class="toast-error">
            · {{ scrapeReport.errors.length }}개 오류
          </span>
        </div>
        <button class="toast-close" @click="scrapeReport = null">×</button>
      </div>
    </transition>

    <!-- Loading State -->
    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p class="state-text">불러오는 중...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && funerals.length === 0" class="state-container">
      <div class="empty-icon">⚰</div>
      <p class="state-text">표시할 빈소 정보가 없습니다.</p>
      <p class="state-sub" v-if="isTeamLeader">
        「새로고침」 버튼을 눌러 장례식장 정보를 수집하세요.
      </p>
    </div>

    <!-- Funeral Cards Grid -->
    <div v-else class="cards-grid">
      <div
        v-for="funeral in funerals"
        :key="funeral.id"
        class="funeral-card"
        @click="openDetail(funeral)"
      >
        <div class="card-header">
          <span class="region-badge" :class="funeral.region.toLowerCase()">
            {{ funeral.region === 'INCHEON' ? '인천' : '부천' }}
          </span>
          <span v-if="funeral.taskId" class="linked-badge">배정됨</span>
        </div>
        <div class="card-body">
          <div class="deceased-name">故 {{ funeral.deceasedName }}</div>
          <div class="funeral-home">{{ funeral.funeralHomeName }}</div>
          <div v-if="funeral.roomNumber" class="detail-row">
            <span class="detail-label">빈소</span>
            <span class="detail-value">{{ funeral.roomNumber }}</span>
          </div>
          <div v-if="funeral.chiefMourner" class="detail-row">
            <span class="detail-label">상주</span>
            <span class="detail-value">{{ funeral.chiefMourner }}</span>
          </div>
          <div v-if="funeral.funeralDate" class="detail-row">
            <span class="detail-label">발인</span>
            <span class="detail-value">{{ funeral.funeralDate }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="scraped-time">{{ formatRelative(funeral.scrapedAt) }}</span>
          <span class="card-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 0"
        @click="goPage(currentPage - 1)"
      >이전</button>
      <span class="page-info">{{ currentPage + 1 }} / {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages - 1"
        @click="goPage(currentPage + 1)"
      >다음</button>
    </div>

    <!-- Detail Modal -->
    <FuneralDetailModal
      v-if="selectedFuneral"
      :funeral="selectedFuneral"
      :is-team-leader="isTeamLeader"
      @close="selectedFuneral = null"
      @task-created="onTaskCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/common/store_user';
import scraperApi, { ScrapedFuneral, ScrapeReport } from '@/api/workschd/api-scraper';
import FuneralDetailModal from './task/dialog/FuneralDetailModal.vue';

const userStore = useUserStore();

const funerals = ref<ScrapedFuneral[]>([]);
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

const regions = [
  { label: '전체', value: 'ALL' },
  { label: '인천', value: 'INCHEON' },
  { label: '부천', value: 'BUCHEON' }
];

const isTeamLeader = computed(() =>
  userStore.roles?.includes('TEAM_LEADER') || userStore.roles?.includes('ADMIN')
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

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
    // Auto-hide toast after 6s
    setTimeout(() => { scrapeReport.value = null; }, 6000);
  } catch (e) {
    console.error('Scrape failed:', e);
  } finally {
    scraping.value = false;
  }
}

function setRegion(region: typeof selectedRegion.value) {
  selectedRegion.value = region;
  currentPage.value = 0;
  fetchFunerals();
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
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

onMounted(() => {
  fetchFunerals();
});
</script>

<style scoped>
.funeral-board {
  min-height: 100vh;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  padding: 0 0 48px;
}

/* ── Header ── */
.board-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 40px 40px 24px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.board-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #1d1d1f;
  margin: 0 0 2px;
}

.board-subtitle {
  font-size: 14px;
  color: #6e6e73;
  font-weight: 400;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.last-updated {
  font-size: 12px;
  color: #6e6e73;
}

.btn-scrape {
  background: #1d1d1f;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-scrape:hover { opacity: 0.8; }
.btn-scrape:disabled { opacity: 0.4; cursor: default; }
.btn-scrape.loading { animation: pulse 1.2s infinite; }

@keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.4; } }

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 40px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.filter-chips { display: flex; gap: 8px; }

.chip {
  background: #f5f5f7;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #6e6e73;
  cursor: pointer;
  transition: all 0.15s;
}

.chip.active {
  background: #1d1d1f;
  color: #fff;
}

.search-input {
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  outline: none;
  width: 200px;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: #0071e3; }

/* ── Toast ── */
.scrape-toast {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 1000;
  background: #1d1d1f;
  color: #fff;
  border-radius: 12px;
  padding: 14px 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 260px;
}

.toast-title { font-weight: 600; font-size: 14px; }
.toast-body { font-size: 13px; color: #d2d2d7; flex: 1; }
.toast-error { color: #ff6b6b; }
.toast-close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 0; }

/* ── States ── */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 12px;
}

.empty-icon { font-size: 48px; }
.state-text { font-size: 17px; color: #1d1d1f; font-weight: 500; margin: 0; }
.state-sub { font-size: 14px; color: #6e6e73; margin: 0; }

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #d2d2d7;
  border-top-color: #1d1d1f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cards Grid ── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 28px 40px;
}

.funeral-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 1px solid rgba(0,0,0,0.06);
}

.funeral-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.region-badge {
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 3px 8px;
  letter-spacing: 0.2px;
}

.region-badge.incheon { background: #e8f0fe; color: #1a73e8; }
.region-badge.bucheon { background: #fce8e6; color: #d93025; }

.linked-badge {
  font-size: 11px;
  font-weight: 500;
  background: #e6f4ea;
  color: #137333;
  border-radius: 6px;
  padding: 3px 8px;
}

.card-body { margin-bottom: 16px; }

.deceased-name {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.3px;
  margin-bottom: 4px;
}

.funeral-home {
  font-size: 13px;
  color: #6e6e73;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.detail-label {
  font-size: 12px;
  color: #aeaeb2;
  min-width: 28px;
}

.detail-value {
  font-size: 13px;
  color: #3a3a3c;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f2f2f7;
  padding-top: 12px;
}

.scraped-time { font-size: 12px; color: #aeaeb2; }
.card-arrow { font-size: 18px; color: #aeaeb2; font-weight: 300; }

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
}

.page-btn {
  background: #fff;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  color: #1d1d1f;
}

.page-btn:hover:not(:disabled) { background: #f5f5f7; }
.page-btn:disabled { opacity: 0.35; cursor: default; }

.page-info { font-size: 14px; color: #6e6e73; min-width: 60px; text-align: center; }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .board-header { padding: 24px 20px 16px; flex-direction: column; align-items: flex-start; gap: 12px; }
  .filter-bar { padding: 12px 20px; flex-wrap: wrap; }
  .cards-grid { padding: 16px 16px; gap: 12px; }
}
</style>
