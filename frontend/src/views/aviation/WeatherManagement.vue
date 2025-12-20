<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="text-h6">날씨 이미지 관리</div>
              <div>
                <q-btn
                  color="primary"
                  icon="refresh"
                  label="이미지 수집"
                  @click="collectImage"
                  :loading="collecting"
                  class="q-mr-md"
                />
                <q-btn
                  color="warning"
                  icon="delete_sweep"
                  label="정리"
                  @click="showCleanupDialog = true"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-section>
            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center justify-between">
                  <div>
                    <div class="text-subtitle2">자동 수집 설정</div>
                    <div class="text-caption text-grey">
                      스케줄러가 자동으로 날씨 이미지를 수집합니다 (10분마다)
                    </div>
                  </div>
                  <q-toggle
                    v-model="gatheringEnabled"
                    @update:model-value="toggleGathering"
                    :loading="togglingGathering"
                    color="primary"
                    size="lg"
                  />
                </div>
              </q-card-section>
            </q-card>
          </q-card-section>

          <q-card-section>
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle2">서비스 상태</div>
                <div v-if="status">
                  <div>상태: {{ status.status }}</div>
                  <div>최근 타임스탬프: {{ status.currentTimestamp }}</div>
                  <div v-if="status.error" class="text-negative">
                    오류: {{ status.error }}
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- Date Range Filter -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle2 q-mb-md">날짜 범위 필터</div>
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="startDate"
                      label="시작 날짜"
                      type="date"
                      outlined
                      dense
                      clearable
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="endDate"
                      label="종료 날짜"
                      type="date"
                      outlined
                      dense
                      clearable
                    />
                  </div>
                  <div class="col-12 col-sm-2">
                    <q-btn
                      color="primary"
                      icon="search"
                      label="조회"
                      @click="loadImages"
                      :loading="loading"
                      class="full-width"
                    />
                  </div>
                  <div class="col-12 col-sm-2">
                    <q-btn
                      flat
                      color="primary"
                      icon="clear"
                      label="초기화"
                      @click="clearDateFilter"
                      class="full-width"
                    />
                  </div>
                </div>
                <div class="row q-mt-sm">
                  <div class="col-12">
                    <q-btn-toggle
                      v-model="quickDateRange"
                      :options="quickDateOptions"
                      @update:model-value="applyQuickDateRange"
                      toggle-color="primary"
                      size="sm"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-table
              :rows="weatherImages"
              :columns="imageColumns"
              row-key="filename"
              :loading="loading"
              :rows-per-page-options="[10, 20, 50]"
              @row-click="(_evt, row) => openImageDialog(row)"
            >
              <template v-slot:body-cell-size="props">
                <q-td :props="props">
                  {{ props.row.sizeMB }} MB
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Cleanup Dialog -->
    <q-dialog v-model="showCleanupDialog" persistent>
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">이미지 정리</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model.number="cleanupDays"
            type="number"
            label="보관할 일수"
            :rules="[val => val > 0 || '1 이상의 값을 입력하세요']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="primary" v-close-popup />
          <q-btn
            flat
            label="정리 실행"
            color="warning"
            @click="performCleanup"
            :loading="cleaning"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Image Viewer Dialog -->
    <q-dialog v-model="showImageDialog" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ selectedImage?.filename }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey">촬영일시</div>
              <div>{{ selectedImage?.capturedAt ? new Date(selectedImage.capturedAt).toLocaleString('ko-KR') : '-' }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey">파일 크기</div>
              <div>{{ selectedImage?.sizeMB }} MB</div>
            </div>
          </div>
          <div class="image-container">
            <img
              v-if="imageUrl"
              :src="imageUrl"
              :alt="selectedImage?.filename"
              class="weather-image"
              @error="handleImageError"
            />
            <div v-else-if="imageLoading" class="flex flex-center" style="min-height: 400px">
              <q-spinner color="primary" size="3em" />
            </div>
            <div v-else class="flex flex-center text-negative" style="min-height: 400px">
              이미지를 불러올 수 없습니다
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { weatherApi } from '@/api/aviation/client';
import { useQuasar } from 'quasar';
import type { WeatherImage, WeatherStatus } from '@/types/aviation/api';

const $q = useQuasar();
const weatherImages = ref<WeatherImage[]>([]);
const status = ref<WeatherStatus | null>(null);
const loading = ref(false);
const collecting = ref(false);
const cleaning = ref(false);
const showCleanupDialog = ref(false);
const cleanupDays = ref(7);
const showImageDialog = ref(false);
const selectedImage = ref<WeatherImage | null>(null);
const imageUrl = ref<string>('');
const imageLoading = ref(false);
const gatheringEnabled = ref(true);
const togglingGathering = ref(false);

// Helper function to format date for input field
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Set default dates: 2 weeks ago and today
function getDefaultDates() {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0); // Start of day
  
  return {
    start: formatDateForInput(twoWeeksAgo),
    end: formatDateForInput(today)
  };
}

const defaultDates = getDefaultDates();
const startDate = ref<string>(defaultDates.start);
const endDate = ref<string>(defaultDates.end);
const quickDateRange = ref<string>('');

const imageColumns = [
  {
    name: 'filename',
    required: true,
    label: '파일명',
    align: 'left' as const,
    field: 'filename',
    sortable: true
  },
  {
    name: 'size',
    label: '크기',
    align: 'right' as const,
    field: 'sizeMB',
    sortable: true
  },
  {
    name: 'capturedAt',
    label: '촬영일시',
    align: 'left' as const,
    field: 'capturedAt',
    format: (val: string) => val ? new Date(val).toLocaleString('ko-KR') : '-',
    sortable: true
  },
  {
    name: 'created',
    label: '생성일',
    align: 'left' as const,
    field: 'created',
    format: (val: string) => new Date(val).toLocaleString('ko-KR'),
    sortable: true
  }
];

const quickDateOptions = [
  { label: '오늘', value: 'today' },
  { label: '최근 7일', value: '7days' },
  { label: '최근 30일', value: '30days' },
  { label: '이번 달', value: 'thisMonth' },
  { label: '지난 달', value: 'lastMonth' }
];

async function loadImages() {
  loading.value = true;
  try {
    const response = await weatherApi.getImages(50, startDate.value || undefined, endDate.value || undefined);
    if (response.success) {
      // Handle both response.data.images and response.images formats
      if (response.data && response.data.images) {
        weatherImages.value = response.data.images;
      } else if (response.images) {
        weatherImages.value = response.images;
      } else {
        weatherImages.value = [];
      }
    } else {
      throw new Error(response.error || '이미지 조회 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '이미지 로딩 실패: ' + (error.message || error)
    });
    weatherImages.value = [];
  } finally {
    loading.value = false;
  }
}

function clearDateFilter() {
  const defaults = getDefaultDates();
  startDate.value = defaults.start;
  endDate.value = defaults.end;
  quickDateRange.value = '';
  loadImages();
}

function applyQuickDateRange(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (value) {
    case 'today':
      startDate.value = formatDateForInput(today);
      endDate.value = formatDateForInput(today);
      break;
    case '7days':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      startDate.value = formatDateForInput(sevenDaysAgo);
      endDate.value = formatDateForInput(today);
      break;
    case '30days':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate.value = formatDateForInput(thirtyDaysAgo);
      endDate.value = formatDateForInput(today);
      break;
    case 'thisMonth':
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.value = formatDateForInput(firstDayOfMonth);
      endDate.value = formatDateForInput(today);
      break;
    case 'lastMonth':
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate.value = formatDateForInput(firstDayOfLastMonth);
      endDate.value = formatDateForInput(lastDayOfLastMonth);
      break;
  }
  
  loadImages();
}

async function loadStatus() {
  try {
    const response = await weatherApi.getStatus();
    if (response.success && response.data) {
      status.value = response.data;
    }
  } catch (error: any) {
    console.error('Status loading failed:', error);
  }
}

async function collectImage() {
  collecting.value = true;
  try {
    const response = await weatherApi.collect();
    if (response.success) {
      $q.notify({
        type: 'positive',
        message: '이미지 수집이 완료되었습니다'
      });
      await loadImages();
      await loadStatus();
    } else {
      throw new Error(response.error || '수집 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '이미지 수집 실패: ' + error.message
    });
  } finally {
    collecting.value = false;
  }
}

async function performCleanup() {
  cleaning.value = true;
  try {
    const response = await weatherApi.cleanup(cleanupDays.value);
    if (response.success && response.data) {
      $q.notify({
        type: 'positive',
        message: `${response.data.deletedCount}개 파일이 삭제되었습니다`
      });
      showCleanupDialog.value = false;
      await loadImages();
    } else {
      throw new Error(response.error || '정리 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '정리 실패: ' + error.message
    });
  } finally {
    cleaning.value = false;
  }
}

function openImageDialog(row: WeatherImage) {
  selectedImage.value = row;
  imageLoading.value = true;
  imageUrl.value = '';
  showImageDialog.value = true;
  
  // Load image
  if (row.filename) {
    imageUrl.value = `/api/weather/image/${encodeURIComponent(row.filename)}`;
    imageLoading.value = false;
  }
}

function handleImageError() {
  imageLoading.value = false;
  imageUrl.value = '';
  $q.notify({
    type: 'negative',
    message: '이미지를 불러올 수 없습니다'
  });
}

async function loadGatheringStatus() {
  try {
    const response = await weatherApi.getGatheringEnabled();
    if (response.success && response.data) {
      gatheringEnabled.value = response.data.enabled;
    }
  } catch (error: any) {
    console.error('Gathering status loading failed:', error);
  }
}

async function toggleGathering(enabled: boolean) {
  togglingGathering.value = true;
  try {
    const response = await weatherApi.setGatheringEnabled(enabled);
    if (response.success) {
      gatheringEnabled.value = enabled;
      $q.notify({
        type: 'positive',
        message: response.data?.message || `자동 수집이 ${enabled ? '활성화' : '비활성화'}되었습니다`
      });
    } else {
      // Revert toggle on error
      gatheringEnabled.value = !enabled;
      throw new Error(response.error || '설정 변경 실패');
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '설정 변경 실패: ' + (error.message || error)
    });
  } finally {
    togglingGathering.value = false;
  }
}

onMounted(() => {
  // Load images with default date range (2 weeks ago to today)
  loadImages();
  loadStatus();
  loadGatheringStatus();
});
</script>

<style scoped lang="sass">
.weather-image
  width: 100%
  height: auto
  max-height: calc(100vh - 200px)
  object-fit: contain
  border: 1px solid #e0e0e0
  border-radius: 4px

.image-container
  display: flex
  justify-content: center
  align-items: center
  background-color: #f5f5f5
  border-radius: 4px
  padding: 16px
</style>




