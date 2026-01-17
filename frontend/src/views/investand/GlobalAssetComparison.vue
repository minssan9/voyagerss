<template>
  <div class="global-asset-page animate-fadeIn">
    <!-- Header -->
    <div class="asset-header">
      <div class="header-content">
        <h1>Global Asset <span class="text-primary">Comparison</span></h1>
        <div class="controls">
          <q-btn
            flat
            color="primary"
            label="Collect"
            icon="cloud_download"
            @click="collectData"
            :loading="collecting"
            size="sm"
          />
          <q-btn
            flat
            color="secondary"
            label="Normalize"
            icon="equalizer"
            @click="normalizeData"
            :loading="normalizing"
            size="sm"
          />
        </div>
      </div>
      <p class="subtitle">
        Compare global assets on a unified 100-point scale. Track gold, oil, major indices, Bitcoin, forex, and more in real-time.
      </p>
    </div>

    <!-- Time Period Selector -->
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <h2>Normalized Performance (Base: 100)</h2>
          <p class="base-date">Base Date: {{ baseDate || 'Loading...' }}</p>
        </div>
        <div class="controls-row">
          <q-btn-group unelevated>
            <q-btn
              v-for="period in timePeriods"
              :key="period"
              :label="period"
              :color="selectedPeriod === period ? 'dark' : 'grey-3'"
              :text-color="selectedPeriod === period ? 'white' : 'dark'"
              size="sm"
              @click="selectPeriod(period)"
            />
          </q-btn-group>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="filter-section">
        <div class="filter-label">Filter by Category:</div>
        <div class="category-chips">
          <q-chip
            v-for="cat in categories"
            :key="cat"
            :selected="selectedCategories.includes(cat)"
            @click="toggleCategory(cat)"
            clickable
            color="primary"
            text-color="white"
            :outline="!selectedCategories.includes(cat)"
          >
            {{ formatCategoryName(cat) }}
          </q-chip>
        </div>
      </div>

      <!-- Asset Selection -->
      <div class="asset-toggles">
        <button
          v-for="asset in filteredAssets"
          :key="asset.assetCode"
          :class="['asset-toggle-btn', { active: selectedAssets.includes(asset.assetCode) }]"
          @click="toggleAsset(asset.assetCode)"
        >
          <span class="dot" :style="{ backgroundColor: getAssetColor(asset.assetCode) }"></span>
          <span class="asset-name">{{ asset.assetName }}</span>
          <span class="asset-code">{{ asset.assetCode }}</span>
        </button>
      </div>

      <!-- Chart -->
      <div class="chart-container" v-if="chartData && chartData.labels.length > 0">
        <canvas ref="chartCanvas"></canvas>
      </div>

      <div v-else class="no-data">
        <q-icon name="show_chart" size="4rem" color="grey-4" />
        <p>No normalized data available</p>
        <p class="hint">Click "Normalize" to generate comparison data</p>
      </div>
    </div>

    <!-- Performance Table -->
    <div class="performance-card" v-if="assets.length > 0">
      <div class="table-header">
        <h2>Latest Performance</h2>
        <p>Current prices and returns for selected period</p>
      </div>

      <q-table
        :rows="filteredTableData"
        :columns="performanceColumns"
        row-key="assetCode"
        flat
        :rows-per-page-options="[0]"
        hide-pagination
      >
        <template v-slot:body-cell-assetName="props">
          <q-td :props="props">
            <div class="asset-cell">
              <span class="dot" :style="{ backgroundColor: getAssetColor(props.row.assetCode) }"></span>
              <div>
                <div class="asset-name">{{ props.row.assetName }}</div>
                <div class="asset-meta">{{ props.row.assetCode }} · {{ formatCategoryName(props.row.category) }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-changePercent="props">
          <q-td :props="props">
            <span :class="getChangeClass(props.value)">
              {{ formatPercent(props.value) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-oneMonthReturn="props">
          <q-td :props="props">
            <span :class="getChangeClass(props.value)">
              {{ formatPercent(props.value) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-threeMonthReturn="props">
          <q-td :props="props">
            <span :class="getChangeClass(props.value)">
              {{ formatPercent(props.value) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-oneYearReturn="props">
          <q-td :props="props">
            <span :class="getChangeClass(props.value)">
              {{ formatPercent(props.value) }}
            </span>
          </q-td>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { GlobalAssetApi, type AssetPerformance, type NormalizedAssetData, type TimePeriod } from '@/api/investand/globalAssetApi';
import { useQuasar } from 'quasar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const $q = useQuasar();

// State
const loading = ref(false);
const collecting = ref(false);
const normalizing = ref(false);
const assets = ref<AssetPerformance[]>([]);
const normalizedData = ref<NormalizedAssetData[]>([]);
const selectedPeriod = ref<TimePeriod>('1Y');
const selectedCategories = ref<string[]>([]);
const selectedAssets = ref<string[]>([]);
const baseDate = ref<string>('');
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const timePeriods: TimePeriod[] = ['1M', '3M', '6M', '1Y'];
const categories = ['commodity', 'index', 'crypto', 'forex', 'dollar_index', 'real_estate'];

// Asset colors
const assetColors: Record<string, string> = {
  // Commodities
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  COPPER: '#B87333',
  WTI: '#000000',
  BRENT: '#1a1a1a',
  NATGAS: '#4169E1',
  // Indices
  SPX: '#2563EB',
  NDX: '#10B981',
  DJI: '#0284C7',
  KOSPI: '#DC2626',
  NIKKEI: '#EC4899',
  FTSE: '#8B5CF6',
  DAX: '#F59E0B',
  CAC: '#14B8A6',
  EUROSTOXX: '#06B6D4',
  HSI: '#EF4444',
  SSE: '#F97316',
  // Crypto
  BTC: '#F7931A',
  ETH: '#627EEA',
  // Forex
  USDKRW: '#3B82F6',
  EURUSD: '#22C55E',
  USDJPY: '#A855F7',
  GBPUSD: '#EC4899',
  USDCNY: '#F59E0B',
  // Dollar Index
  DXY: '#059669',
  // Real Estate
  REIT: '#8B5CF6',
  HOMZ: '#6366F1',
};

const performanceColumns = [
  { name: 'assetName', label: 'Asset', field: 'assetName', align: 'left', sortable: true },
  { name: 'closePrice', label: 'Price', field: 'closePrice', align: 'right', sortable: true, format: (val: number) => `$${val.toFixed(2)}` },
  { name: 'changePercent', label: 'Change', field: 'changePercent', align: 'right', sortable: true },
  { name: 'oneMonthReturn', label: '1M', field: 'oneMonthReturn', align: 'right', sortable: true },
  { name: 'threeMonthReturn', label: '3M', field: 'threeMonthReturn', align: 'right', sortable: true },
  { name: 'oneYearReturn', label: '1Y', field: 'oneYearReturn', align: 'right', sortable: true },
  { name: 'volatility', label: 'Vol', field: 'volatility', align: 'right', sortable: true, format: (val: number) => val ? `${val.toFixed(2)}%` : 'N/A' },
];

// Computed
const filteredAssets = computed(() => {
  if (normalizedData.value.length === 0) return [];

  if (selectedCategories.value.length === 0) {
    return normalizedData.value;
  }

  return normalizedData.value.filter(asset =>
    selectedCategories.value.includes(asset.category)
  );
});

const filteredTableData = computed(() => {
  if (assets.value.length === 0) return [];

  if (selectedCategories.value.length === 0) {
    return assets.value;
  }

  return assets.value.filter(asset =>
    selectedCategories.value.includes(asset.category)
  );
});

const chartData = computed(() => {
  if (selectedAssets.value.length === 0 || normalizedData.value.length === 0) {
    return null;
  }

  const selectedData = normalizedData.value.filter(asset =>
    selectedAssets.value.includes(asset.assetCode)
  );

  if (selectedData.length === 0) return null;

  // Get all dates
  const allDates = new Set<string>();
  selectedData.forEach(asset => {
    asset.data.forEach(d => allDates.add(d.date));
  });

  const labels = Array.from(allDates).sort();

  const datasets = selectedData.map(asset => {
    const dataMap = new Map(asset.data.map(d => [d.date, d.normalizedValue]));

    return {
      label: asset.assetName,
      data: labels.map(label => dataMap.get(label) || null),
      borderColor: getAssetColor(asset.assetCode),
      backgroundColor: getAssetColor(asset.assetCode) + '20',
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4,
    };
  });

  return { labels, datasets };
});

// Methods
async function loadAssetData() {
  loading.value = true;
  try {
    const [assetsRes] = await Promise.all([
      GlobalAssetApi.getAllAssets(),
    ]);

    if (assetsRes.data.success) {
      assets.value = assetsRes.data.data;
    }

    await loadNormalizedData();

  } catch (error) {
    console.error('Error loading asset data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load asset data',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}

async function loadNormalizedData() {
  try {
    const response = await GlobalAssetApi.getNormalizedData(selectedPeriod.value);

    if (response.data.success) {
      normalizedData.value = response.data.data;
      baseDate.value = new Date(response.data.baseDate).toLocaleDateString();

      // Auto-select top performing assets if none selected
      if (selectedAssets.value.length === 0 && normalizedData.value.length > 0) {
        selectedAssets.value = normalizedData.value.slice(0, 6).map(a => a.assetCode);
      }
    }
  } catch (error) {
    console.error('Error loading normalized data:', error);
  }
}

async function collectData() {
  collecting.value = true;
  try {
    const response = await GlobalAssetApi.collectAssetData();

    if (response.data.success) {
      $q.notify({
        type: 'positive',
        message: `Collected data for ${response.data.data?.assetsCollected} assets`,
        position: 'top'
      });

      await loadAssetData();
    }
  } catch (error) {
    console.error('Error collecting data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to collect asset data',
      position: 'top'
    });
  } finally {
    collecting.value = false;
  }
}

async function normalizeData() {
  normalizing.value = true;
  try {
    const response = await GlobalAssetApi.normalizeAssetData(selectedPeriod.value);

    if (response.data.success) {
      $q.notify({
        type: 'positive',
        message: `Normalized ${response.data.data?.assetsNormalized} assets for period ${selectedPeriod.value}`,
        position: 'top'
      });

      await loadNormalizedData();
    }
  } catch (error) {
    console.error('Error normalizing data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to normalize data',
      position: 'top'
    });
  } finally {
    normalizing.value = false;
  }
}

function selectPeriod(period: TimePeriod) {
  selectedPeriod.value = period;
  loadNormalizedData();
}

function toggleCategory(category: string) {
  const index = selectedCategories.value.indexOf(category);
  if (index > -1) {
    selectedCategories.value.splice(index, 1);
  } else {
    selectedCategories.value.push(category);
  }
}

function toggleAsset(assetCode: string) {
  const index = selectedAssets.value.indexOf(assetCode);
  if (index > -1) {
    selectedAssets.value.splice(index, 1);
  } else {
    selectedAssets.value.push(assetCode);
  }
}

function getAssetColor(assetCode: string): string {
  return assetColors[assetCode] || '#6B7280';
}

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    commodity: 'Commodities',
    index: 'Indices',
    crypto: 'Crypto',
    forex: 'Forex',
    dollar_index: 'Dollar Index',
    real_estate: 'Real Estate'
  };
  return names[category] || category;
}

function formatPercent(value?: number): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getChangeClass(value?: number): string {
  if (value === null || value === undefined) return '';
  return value >= 0 ? 'text-positive' : 'text-negative';
}

function renderChart() {
  if (!chartCanvas.value || !chartData.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Normalized Value (Base: 100)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 12
          }
        }
      }
    }
  });
}

// Watchers
watch([chartData, selectedAssets], () => {
  nextTick(() => {
    renderChart();
  });
});

onMounted(() => {
  loadAssetData();
});
</script>

<style lang="scss" scoped>
@import '@/assets/sass/investand/findash/variables';

.global-asset-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.asset-header {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: $findash-slate-800;
    margin: 0;
  }

  .text-primary {
    color: $findash-indigo;
  }

  .subtitle {
    color: $findash-slate-500;
    margin: 0;
    max-width: 700px;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
  }
}

.chart-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;

    h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: $findash-slate-800;
      margin: 0;
    }

    .base-date {
      font-size: 0.875rem;
      color: $findash-slate-500;
      margin: 0.25rem 0 0;
    }
  }
}

.filter-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: $findash-slate-50;
  border-radius: 0.5rem;

  .filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: $findash-slate-700;
    margin-bottom: 0.5rem;
  }

  .category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

.asset-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: $findash-slate-50;
  border-radius: 0.5rem;
}

.asset-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  border: 1px solid $findash-slate-200;
  background: white;
  color: $findash-slate-700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $findash-slate-400;
  }

  &.active {
    background: $findash-slate-800;
    color: white;
    border-color: $findash-slate-800;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .asset-code {
    font-size: 0.75rem;
    opacity: 0.7;
  }
}

.chart-container {
  position: relative;
  height: 400px;
  margin-top: 1rem;
}

.no-data {
  text-align: center;
  padding: 4rem 1rem;
  color: $findash-slate-400;

  p {
    margin: 0.5rem 0;
  }

  .hint {
    font-size: 0.875rem;
    color: $findash-slate-500;
  }
}

.performance-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;

  .table-header {
    margin-bottom: 1rem;

    h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: $findash-slate-800;
      margin: 0;
    }

    p {
      font-size: 0.875rem;
      color: $findash-slate-500;
      margin: 0.25rem 0 0;
    }
  }
}

.asset-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .asset-name {
    font-weight: 600;
    color: $findash-slate-800;
  }

  .asset-meta {
    font-size: 0.75rem;
    color: $findash-slate-500;
  }
}

.text-positive {
  color: #10b981;
  font-weight: 600;
}

.text-negative {
  color: #ef4444;
  font-weight: 600;
}
</style>
