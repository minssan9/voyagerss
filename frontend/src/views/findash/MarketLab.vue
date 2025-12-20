<template>
  <div class="market-lab-page animate-fadeIn">
    <!-- Header -->
    <div class="lab-header">
      <div class="header-content">
        <h1>Global Market Lab <span class="text-primary">100</span></h1>
        <div class="controls">
          <span class="range-info">Base Date: {{ startDate }} = 100</span>
          <q-btn flat color="primary" label="Reset" icon="refresh" @click="store.resetAll" />
        </div>
      </div>
      <p class="subtitle">
        Normalized asset performance comparison. Analyze the relative strength of commodities, currencies, and indices on a single scale.
      </p>
    </div>

    <!-- Main Chart Section -->
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <h2>Performance Comparison</h2>
          <p>Normalized to 100 at start of period.</p>
        </div>
        <div class="time-controls">
          <q-btn-group unelevated>
            <q-btn
              v-for="range in ranges"
              :key="range"
              :label="range"
              :color="store.timeRange === range ? 'dark' : 'grey-3'"
              :text-color="store.timeRange === range ? 'white' : 'dark'"
              size="sm"
              @click="store.setTimeRange(range)"
            />
          </q-btn-group>
        </div>
      </div>

      <!-- Asset Toggles -->
      <div class="toggles-wrapper">
        <button
          v-for="asset in ASSETS"
          :key="asset.id"
          :class="['toggle-btn', { active: store.activeAssets.includes(asset.id) }]"
          @click="store.toggleAsset(asset.id)"
        >
          <span class="dot" :style="{ backgroundColor: asset.color }"></span>
          {{ asset.name }}
        </button>
      </div>

      <ComparisonChart />
      
      <p class="disclaimer">
        * Simulated data for research and visualization purposes only.
      </p>
    </div>

    <!-- Details Grid -->
    <div class="section-title">
      <h3>Asset Breakdown</h3>
      <p>Current trends and volatility snapshots.</p>
    </div>
    <AssetGrid />

    <!-- Correlation Matrix -->
    <CorrelationMatrix />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useMarketLabStore, ASSETS } from '@/stores/investand/store_marketlab';
import ComparisonChart from '@/components/findash/marketlab/ComparisonChart.vue';
import AssetGrid from '@/components/findash/marketlab/AssetGrid.vue';
import CorrelationMatrix from '@/components/findash/marketlab/CorrelationMatrix.vue';

const store = useMarketLabStore();
const ranges = ['1M', '3M', '6M', '1Y'] as const;

const startDate = computed(() => {
  if (!store.normalizedData || store.normalizedData.labels.length === 0) return 'Loading...';
  return store.normalizedData.labels[0];
});

onMounted(() => {
  store.generateMarketData();
});
</script>

<style lang="scss" scoped>
@import '@/assets/sass/findash/variables';

.market-lab-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 2rem;
}

.lab-header {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: $shadow-sm;
  border-bottom: 1px solid $findash-slate-200;

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
    max-width: 600px;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .range-info {
    font-size: 0.875rem;
    color: $findash-slate-400;
    display: none;

    @media (min-width: 640px) {
      display: block;
    }
  }
}

.chart-card {
  @include findash-card;
  padding: 1.5rem;
}

.chart-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

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

.toggles-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid $findash-slate-200;
  background: white;
  color: $findash-slate-600;
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
}

.disclaimer {
  text-align: center;
  font-size: 0.75rem;
  color: $findash-slate-400;
  margin-top: 1rem;
}

.section-title {
  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: $findash-slate-800;
    margin: 0;
  }

  p {
    color: $findash-slate-500;
    margin: 0.25rem 0 0;
  }
}
</style>
