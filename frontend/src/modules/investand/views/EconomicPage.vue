<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-lg">
      <div class="col-12">
        <div class="text-h4 q-mb-md">🏦 BOK 경제지표 (Bank of Korea)</div>
        <q-banner class="bg-indigo-1 text-indigo-9 rounded-borders q-mb-lg">
          <template v-slot:avatar>
            <q-icon name="info" color="indigo" />
          </template>
          한국은행(BOK) 경제통계시스템(ECOS)에서 수집된 주요 경제 지표를 시각화합니다.
        </q-banner>
      </div>

      <!-- Placeholder Cards -->
      <div class="col-12 col-md-4" v-for="item in indicators" :key="item.title">
        <q-card flat bordered class="indicator-card">
          <q-card-section>
            <div class="text-subtitle1 text-grey-7">{{ item.title }}</div>
            <div class="row items-baseline q-mt-sm">
              <span class="text-h4 text-weight-bold">{{ item.value }}</span>
              <span class="text-caption q-ml-sm" :class="item.change >= 0 ? 'text-positive' : 'text-negative'">
                {{ item.change >= 0 ? '▲' : '▼' }} {{ Math.abs(item.change) }}%
              </span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">{{ item.date }} 기준</div>
          </q-card-section>
          
          <q-separator />
          
          <q-card-section class="q-py-sm">
            <div class="row items-center justify-between text-caption text-grey-7">
              <span>소스: {{ item.source }}</span>
              <q-btn flat dense round icon="open_in_new" size="xs" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Chart Placeholder -->
      <div class="col-12">
        <q-card flat bordered class="q-mt-lg">
          <q-card-section>
            <div class="text-h6">📈 지표 추이 (데이터 준비 중)</div>
            <div class="chart-box flex flex-center text-grey-6 q-pa-xl">
              <div class="text-center">
                <q-icon name="query_stats" size="4rem" class="q-mb-md" />
                <div>BOK API 연동 및 시각화 구현 예정입니다.</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const indicators = ref([
  { title: '한국 기준금리', value: '3.50%', change: 0, date: '2024-01-11', source: '한국은행' },
  { title: '달러/원 환율', value: '1,324.50', change: -0.25, date: '2024-01-18', source: '한국은행' },
  { title: '국고채 3년물', value: '3.28%', change: 0.12, date: '2024-01-18', source: '한국은행' }
])
</script>

<style scoped>
.indicator-card {
  transition: all 0.3s;
  border-radius: 12px;
}
.indicator-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.chart-box {
  min-height: 300px;
  background: #fcfcfc;
  border: 2px dashed #eee;
  border-radius: 8px;
}
</style>
