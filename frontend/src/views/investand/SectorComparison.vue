<template>
  <div class="sector-comparison-page animate-fadeIn">
    <!-- Header -->
    <div class="sector-header">
      <div class="header-content">
        <h1>Sector Performance <span class="text-primary">Comparison</span></h1>
        <div class="controls">
          <q-btn
            flat
            color="primary"
            label="Refresh Data"
            icon="refresh"
            @click="loadSectorData"
            :loading="loading"
          />
          <q-btn
            flat
            color="secondary"
            label="Collect"
            icon="cloud_download"
            @click="collectData"
            :loading="collecting"
          />
        </div>
      </div>
      <p class="subtitle">
        Compare sector performance using S&P 500 sector ETFs. Analyze relative strength, volatility, and correlations across 11 major sectors.
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.performanceRecords }}</div>
          <div class="stat-label">Performance Records</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔗</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.comparisonRecords }}</div>
          <div class="stat-label">Comparison Records</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatDate(stats.latestPerformanceDate) }}</div>
          <div class="stat-label">Latest Data</div>
        </div>
      </div>
    </div>

    <!-- Sector Performance Table -->
    <div class="sector-table-card">
      <div class="table-header">
        <h2>Latest Sector Performance</h2>
        <p>Real-time sector performance metrics from Yahoo Finance</p>
      </div>

      <q-table
        v-if="sectors.length > 0"
        :rows="sectors"
        :columns="performanceColumns"
        row-key="sectorCode"
        flat
        :rows-per-page-options="[0]"
        hide-pagination
      >
        <template v-slot:body-cell-sectorName="props">
          <q-td :props="props">
            <div class="sector-name-cell">
              <span class="sector-code">{{ props.row.sectorCode }}</span>
              <span class="sector-name">{{ props.row.sectorName }}</span>
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

      <div v-else class="no-data">
        <q-icon name="info" size="3rem" color="grey-5" />
        <p>No sector data available. Click "Collect" to fetch data from Yahoo Finance.</p>
      </div>
    </div>

    <!-- Sector Comparisons Table -->
    <div class="sector-table-card" v-if="comparisons.length > 0">
      <div class="table-header">
        <h2>Sector Rankings & Comparisons</h2>
        <p>Sector performance relative to S&P 500 (SPY)</p>
      </div>

      <q-table
        :rows="comparisons"
        :columns="comparisonColumns"
        row-key="sectorCode"
        flat
        :rows-per-page-options="[0]"
        hide-pagination
      >
        <template v-slot:body-cell-rank="props">
          <q-td :props="props">
            <q-badge
              :color="getRankColor(props.value)"
              :label="props.value"
              rounded
            />
          </q-td>
        </template>

        <template v-slot:body-cell-relativeStrength="props">
          <q-td :props="props">
            <span :class="getChangeClass(props.value)">
              {{ formatPercent(props.value) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-beta="props">
          <q-td :props="props">
            {{ formatDecimal(props.value) }}
          </q-td>
        </template>

        <template v-slot:body-cell-correlation="props">
          <q-td :props="props">
            {{ formatDecimal(props.value) }}
          </q-td>
        </template>

        <template v-slot:body-cell-volatility="props">
          <q-td :props="props">
            {{ formatPercent(props.value) }}
          </q-td>
        </template>

        <template v-slot:body-cell-sharpeRatio="props">
          <q-td :props="props">
            {{ formatDecimal(props.value) }}
          </q-td>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SectorApi, type SectorPerformance, type SectorComparison, type SectorStats } from '@/api/investand/sectorApi';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const loading = ref(false);
const collecting = ref(false);
const sectors = ref<SectorPerformance[]>([]);
const comparisons = ref<SectorComparison[]>([]);
const stats = ref<SectorStats | null>(null);

const performanceColumns = [
  { name: 'sectorName', label: 'Sector', field: 'sectorName', align: 'left', sortable: true },
  { name: 'closePrice', label: 'Price', field: 'closePrice', align: 'right', sortable: true, format: (val: number) => `$${val.toFixed(2)}` },
  { name: 'changePercent', label: 'Change', field: 'changePercent', align: 'right', sortable: true },
  { name: 'oneMonthReturn', label: '1M Return', field: 'oneMonthReturn', align: 'right', sortable: true },
  { name: 'threeMonthReturn', label: '3M Return', field: 'threeMonthReturn', align: 'right', sortable: true },
  { name: 'oneYearReturn', label: '1Y Return', field: 'oneYearReturn', align: 'right', sortable: true },
  { name: 'averagePE', label: 'P/E', field: 'averagePE', align: 'right', sortable: true, format: (val: number) => val ? val.toFixed(2) : 'N/A' },
];

const comparisonColumns = [
  { name: 'rank', label: 'Rank', field: 'rank', align: 'center', sortable: true },
  { name: 'sectorCode', label: 'Sector', field: 'sectorCode', align: 'left', sortable: true },
  { name: 'relativeStrength', label: 'Rel. Strength', field: 'relativeStrength', align: 'right', sortable: true },
  { name: 'beta', label: 'Beta', field: 'beta', align: 'right', sortable: true },
  { name: 'correlation', label: 'Correlation', field: 'correlation', align: 'right', sortable: true },
  { name: 'volatility', label: 'Volatility', field: 'volatility', align: 'right', sortable: true },
  { name: 'sharpeRatio', label: 'Sharpe', field: 'sharpeRatio', align: 'right', sortable: true },
];

async function loadSectorData() {
  loading.value = true;
  try {
    const [sectorsRes, comparisonsRes, statsRes] = await Promise.all([
      SectorApi.getAllSectors(),
      SectorApi.getLatestComparisons(),
      SectorApi.getSectorStats()
    ]);

    if (sectorsRes.data.success) {
      sectors.value = sectorsRes.data.data;
    }

    if (comparisonsRes.data.success) {
      comparisons.value = comparisonsRes.data.data;
    }

    if (statsRes.data.success) {
      stats.value = statsRes.data.data;
    }

    $q.notify({
      type: 'positive',
      message: 'Sector data loaded successfully',
      position: 'top'
    });
  } catch (error) {
    console.error('Error loading sector data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load sector data',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}

async function collectData() {
  collecting.value = true;
  try {
    const response = await SectorApi.collectSectorData();

    if (response.data.success) {
      $q.notify({
        type: 'positive',
        message: `Collected data for ${response.data.data?.sectorsCollected} sectors`,
        position: 'top'
      });

      // Reload data after collection
      await loadSectorData();
    } else {
      $q.notify({
        type: 'warning',
        message: response.data.message,
        position: 'top'
      });
    }
  } catch (error) {
    console.error('Error collecting sector data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to collect sector data',
      position: 'top'
    });
  } finally {
    collecting.value = false;
  }
}

function formatPercent(value?: number): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDecimal(value?: number): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
}

function formatDate(date?: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function getChangeClass(value?: number): string {
  if (value === null || value === undefined) return '';
  return value >= 0 ? 'text-positive' : 'text-negative';
}

function getRankColor(rank?: number): string {
  if (!rank) return 'grey';
  if (rank <= 3) return 'green';
  if (rank <= 6) return 'blue';
  if (rank <= 9) return 'orange';
  return 'red';
}

onMounted(() => {
  loadSectorData();
});
</script>

<style lang="scss" scoped>
@import '@/assets/sass/investand/findash/variables';

.sector-comparison-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 2rem;
}

.sector-header {
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
    letter-spacing: -0.025em;
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
    align-items: center;
    gap: 0.5rem;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;
  display: flex;
  gap: 1rem;
  align-items: center;

  .stat-icon {
    font-size: 2rem;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: $findash-slate-800;
  }

  .stat-label {
    font-size: 0.875rem;
    color: $findash-slate-500;
  }
}

.sector-table-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;

  .table-header {
    margin-bottom: 1.5rem;

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

  .no-data {
    text-align: center;
    padding: 3rem 1rem;
    color: $findash-slate-400;

    p {
      margin-top: 1rem;
    }
  }
}

.sector-name-cell {
  display: flex;
  flex-direction: column;

  .sector-code {
    font-weight: 600;
    color: $findash-slate-800;
  }

  .sector-name {
    font-size: 0.875rem;
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
