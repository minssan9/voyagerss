<template>
  <div class="chart-wrapper">
    <div v-if="store.loading" class="loading-overlay">
      <q-spinner color="primary" size="3em" />
    </div>
    <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    <div v-else-if="!store.loading" class="no-data">
      No data available for the selected period.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { useMarketLabStore } from '@/stores/investand/store_marketlab';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const store = useMarketLabStore();

const chartData = computed(() => store.normalizedData);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { family: "'Noto Sans KR', sans-serif" }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1a202c',
      bodyColor: '#4a5568',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        label: function(context: any) {
          return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxTicksLimit: 8 }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'Index (Base = 100)'
      },
      grid: {
        borderDash: [2, 4],
        color: '#edf2f7'
      }
    }
  }
};
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  height: 400px;
  width: 100%;
}

.loading-overlay, .no-data {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  z-index: 2;
}

.no-data {
  color: #718096;
  font-style: italic;
}
</style>
