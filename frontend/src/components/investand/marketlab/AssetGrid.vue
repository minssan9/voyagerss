<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div
      v-for="asset in store.assetDetails"
      :key="asset.id"
      class="asset-card"
    >
      <div class="card-header">
        <div>
          <span class="category-badge">{{ asset.category }}</span>
          <h4>{{ asset.name }}</h4>
        </div>
        <div class="text-right">
          <div :class="['value', asset.changePercent >= 0 ? 'text-red' : 'text-blue']">
            {{ asset.currentValue.toFixed(2) }}
          </div>
          <div :class="['change', asset.changePercent >= 0 ? 'text-red-light' : 'text-blue-light']">
            {{ asset.changePercent >= 0 ? '▲' : '▼' }} {{ Math.abs(asset.changePercent).toFixed(2) }}%
          </div>
        </div>
      </div>
      
      <div class="mini-chart-container">
        <Line :data="getSparkData(asset)" :options="sparkOptions" />
      </div>

      <p class="description">{{ getDescription(asset.id) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { useMarketLabStore } from '@/stores/investand/store_marketlab';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const store = useMarketLabStore();

const sparkOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } }
};

function getSparkData(asset: any) {
  return {
    labels: Array(30).fill(''),
    datasets: [{
      data: asset.sparkline,
      borderColor: asset.changePercent >= 0 ? '#f56565' : '#4299e1',
      borderWidth: 2,
      tension: 0.3,
      fill: false
    }]
  };
}

function getDescription(id: string) {
  const desc: Record<string, string> = {
    'gold': 'Hedge against inflation and safe haven asset. often inverse to USD.',
    'silver': 'Similar to Gold but more volatile due to industrial demand.',
    'copper': 'Leading indicator for real economy ("Dr. Copper").',
    'wti': 'Global energy cost benchmark. Sensitive to geopolitical risks.',
    'usdkrw': 'Proxy for global risk appetite and Korean economic fundamentals.',
    'snp500': 'Key benchmark for global equity markets.',
    'kospi': 'Heavily influenced by semi-conductors and foreign capital flow.',
    'nikkei': 'Correlated with Yen movements and BOJ policy.'
  };
  return desc[id] || '';
}
</script>

<style lang="scss" scoped>
@import '@/assets/sass/investand/findash/variables';

.asset-card {
  @include findash-card;
  padding: 1.25rem;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;

  h4 {
    font-size: 1.125rem;
    font-weight: 700;
    color: $findash-slate-800;
    margin: 0;
  }
}

.category-badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: $findash-slate-400;
  letter-spacing: 0.05em;
}

.value {
  font-size: 1.25rem;
  font-weight: 700;
}

.change {
  font-size: 0.75rem;
  font-weight: 500;
}

.text-red { color: $findash-rose; }
.text-red-light { color: lighten($findash-rose, 10%); }
.text-blue { color: $findash-primary; }
.text-blue-light { color: lighten($findash-primary, 10%); }

.mini-chart-container {
  height: 80px;
  width: 100%;
  margin: 0.5rem 0;
}

.description {
  font-size: 0.75rem;
  color: $findash-slate-400;
  margin: 0.75rem 0 0;
  line-height: 1.4;
  height: 2.8em; // approx 2 lines
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
