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
import { computed, onMounted, onActivated, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMarketLabStore, ASSETS } from '@/stores/investand/store_marketlab';
import ComparisonChart from '@/components/investand/marketlab/ComparisonChart.vue';
import AssetGrid from '@/components/investand/marketlab/AssetGrid.vue';
import CorrelationMatrix from '@/components/investand/marketlab/CorrelationMatrix.vue';

const store = useMarketLabStore();
const route = useRoute();
const ranges = ['1M', '3M', '6M', '1Y'] as const;

const startDate = computed(() => {
  if (!store.normalizedData || store.normalizedData.labels.length === 0) return 'Loading...';
  return store.normalizedData.labels[0];
});

// Load data function
function loadData() {
  // Only generate if data is not already loaded
  if (!store.normalizedData || store.normalizedData.labels.length === 0) {
    store.generateMarketData();
  }
}

// Handle initial mount
onMounted(() => {
  loadData();
});

// Handle keep-alive activation (when navigating back to this component)
onActivated(() => {
  loadData();
});

// Also watch for route changes in case the component is reused
watch(() => route.fullPath, () => {
  if (route.name === 'FindashMarketLab') {
    loadData();
  }
});
</script>


