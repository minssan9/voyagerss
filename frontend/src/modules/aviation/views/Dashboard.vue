<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">대시보드</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-card class="bg-primary text-white">
                  <q-card-section>
                    <div class="text-h6">총 토픽 수</div>
                    <div class="text-h4">{{ stats?.totalTopics || 0 }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-6">
                <q-card class="bg-positive text-white">
                  <q-card-section>
                    <div class="text-h6">활성 토픽</div>
                    <div class="text-h4">{{ stats?.activeTopics || 0 }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">주간 스케줄</div>
          </q-card-section>
          <q-card-section>
            <q-list bordered separator>
              <q-item v-for="day in weeklySchedule" :key="day.day_of_month || day.dayOfWeek">
                <q-item-section>
                  <q-item-label>{{ dayNames[day.day_of_month || day.dayOfWeek] }}</q-item-label>
                  <q-item-label caption>{{ day.name }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { topicsApi } from '../api/client';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const stats = ref<any>(null);
const weeklySchedule = ref<any[]>([]);
const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

async function loadStats() {
  try {
    stats.value = await topicsApi.getStats();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '통계 로딩 실패: ' + error.message
    });
  }
}

async function loadSchedule() {
  try {
    weeklySchedule.value = await topicsApi.getSchedule();
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '스케줄 로딩 실패: ' + error.message
    });
  }
}

onMounted(() => {
  loadStats();
  loadSchedule();
});
</script>

<style scoped lang="sass">
</style>

