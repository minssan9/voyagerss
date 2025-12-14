<template>
  <q-page padding class="q-px-sm q-px-md-lg">
    <div class="row q-col-gutter-md">
      <!-- Schedule Preferences -->
      <div class="col-12 col-sm-12 col-md-6">
        <q-card style="height: 100%" class="accountWorkHour-card">
          <q-card-section class="bg-primary text-white q-py-sm">
            <div class="text-subtitle1">{{ t('accountWorkHour.preferences.title', '스케줄 설정 (근무 가능 시간)') }}</div>
          </q-card-section>

          <q-card-section class="q-pa-sm-md card-content" style="height: 80%; position: relative; padding-bottom: 20px;">
            <div class="q-gutter-y-md">
              <div v-for="day in daysOfWeek" :key="day.value" class="q-mb-sm row">
                <div class="col-4 items-center q-mb-xs">
                  <q-checkbox v-model="daySchedules[day.value].enabled" :label="day.label" dense />
                </div>
                
                <div class="col-8 q-col-gutter-sm"  >
                  <div class="row">
                    <div class="col-6">
                      <q-select
                        v-model="daySchedules[day.value].startTime"
                        :label="t('accountWorkHour.preferences.startTime', '시작 시간')"
                        :options="timeOptions"
                        dense
                        outlined
                        options-dense
                        emit-value
                        map-options
                      />
                    </div>
                    <div class="col-6">
                      <q-select
                        v-model="daySchedules[day.value].endTime"
                        :label="t('accountWorkHour.preferences.endTime', '종료 시간')"
                        :options="timeOptions"
                        dense
                        outlined
                        options-dense
                        emit-value
                        map-options
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row justify-end" style="margin-top: 16px; bottom: 16px; right: 16px; width: calc(100% - 32px);">
              <q-btn
                :label="t('accountWorkHour.preferences.save', '설정 저장')"
                @click="handleScheduleUpdate"
                color="primary"
                :loading="isSaving"
                size="sm"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Schedule Calendar and Grid -->
      <div class="col-12 col-sm-12 col-md-6">
        <q-card style="height: 100%" class="accountWorkHour-card">
          <q-card-section class="bg-red text-white q-py-sm">
            <div class="text-subtitle1">{{ t('accountWorkHour.unavailable.title', '근무 불가능 일정') }}</div>
          </q-card-section>

          <q-card-section class="q-pa-sm-md card-content" style="height: 80%; position: relative; padding-bottom: 20px;">            
            <q-tabs
              v-model="activeTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
            >
              <q-tab name="calendar" :label="t('accountWorkHour.view.calendar', '달력')" />
              <q-tab name="grid" :label="t('accountWorkHour.view.grid', '목록')" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="activeTab" animated >
              <q-tab-panel name="calendar"  >
                <q-date
                  v-model="selectedDates"
                  multiple
                  minimal
                  color="red"
                  today-btn
                  mask="YYYY-MM-DD"                  
                  class="full-width"
                />
              </q-tab-panel>

              <q-tab-panel name="grid" class="q-pa-none" >
                <GridDefault 
                  :columnDefs="columnDefs"
                  :rowData="gridData"
                  @onCellClicked="onGridCellClicked"
                />
              </q-tab-panel>
            </q-tab-panels>

            <div class="row justify-end" style="margin-top: 16px; bottom: 16px; right: 16px; width: calc(100% - 32px);">
              <q-btn
                :label="t('accountWorkHour.unavailable.save', '저장')"
                color="primary"
                :loading="isSavingDates"
                @click="handleUnavailableDatesUpdate"
                size="sm"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import apiAccountSchedule from '@/api/modules/api-account-schedule'
import GridDefault from '@/components/grid/GridDefault.vue'
import type { ColDef } from 'ag-grid-community'
import { useUserStore } from '@/stores/modules/store_user'

const { t } = useI18n()
const $q = useQuasar()
const userStore = useUserStore()
const accountId = computed(() => userStore.accountId || '')

interface SchedulePreferences {
  preferredDays: string[]
  preferredShifts: string[]
}

interface DayScheduleDto {
  day: string
  enabled: boolean
  startTime: string
  endTime: string
}

interface DateItem {
  date: string
  reason?: string
}

const schedulePreferences = ref<SchedulePreferences>({
  preferredDays: [],
  preferredShifts: []
})

// Initialize day schedules
const daySchedules = ref<Record<string, DayScheduleDto>>({
  MONDAY: { day: 'MONDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  TUESDAY: { day: 'TUESDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  WEDNESDAY: { day: 'WEDNESDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  THURSDAY: { day: 'THURSDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  FRIDAY: { day: 'FRIDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  SATURDAY: { day: 'SATURDAY', enabled: false, startTime: '09:00', endTime: '18:00' },
  SUNDAY: { day: 'SUNDAY', enabled: false, startTime: '09:00', endTime: '18:00' }
})

// Generate time options for select (24-hour format)
const timeOptions = (() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, '0')
      const formattedMinute = minute.toString().padStart(2, '0')
      const timeValue = `${formattedHour}:${formattedMinute}`
      options.push({ label: timeValue, value: timeValue })
    }
  }
  return options
})()

const isSaving = ref(false)

const daysOfWeek = [
  { label: t('days.monday', '월요일'), value: 'MONDAY' },
  { label: t('days.tuesday', '화요일'), value: 'TUESDAY' },
  { label: t('days.wednesday', '수요일'), value: 'WEDNESDAY' },
  { label: t('days.thursday', '목요일'), value: 'THURSDAY' },
  { label: t('days.friday', '금요일'), value: 'FRIDAY' },
  { label: t('days.saturday', '토요일'), value: 'SATURDAY' },
  { label: t('days.sunday', '일요일'), value: 'SUNDAY' }
]

const activeTab = ref('calendar')
const selectedDates = ref<string[]>([])
const isSavingDates = ref(false)

const columnDefs = ref<ColDef[]>([
  { headerName: t('accountWorkHour.grid.date', '날짜'), field: 'date', sortable: true, filter: true, editable: false },
  { headerName: t('accountWorkHour.grid.dayOfWeek', '요일'), field: 'dayOfWeek', sortable: true, filter: true, editable: false },
  { headerName: t('accountWorkHour.grid.reason', '사유'), field: 'reason', sortable: true, filter: true, editable: true }
])

// Transform selected dates for grid display
const gridData = computed(() => {
  return selectedDates.value.map(date => ({
    date: format(new Date(date), 'yyyy-MM-dd'),
    dayOfWeek: format(new Date(date), 'EEEE', { locale: ko }),
    reason: ''
  }))
})

function onGridCellClicked(params: any) {
  console.log('Grid cell clicked:', params)
}

async function handleUnavailableDatesUpdate() {
  try {
    isSavingDates.value = true
    const unavailableDates = gridData.value.map(row => ({
      date: row.date,
      reason: row.reason
    }))
    
    await apiAccountSchedule.saveUnavailableDates(accountId.value, unavailableDates)
    
    $q.notify({ type: 'positive', message: t('accountWorkHour.unavailable.saveSuccess', '근무 불가능 일정이 저장되었습니다') })
  } catch (error) {
    console.error('Failed to update unavailable dates:', error)
    $q.notify({ type: 'negative', message: t('accountWorkHour.unavailable.saveError', '근무 불가능 일정 저장에 실패했습니다') })
  } finally {
    isSavingDates.value = false
  }
}

async function loadUnavailableDates() {
  try {
    const response = await apiAccountSchedule.getUnavailableDates(accountId.value)
    if (response?.data?.dates) {
      const dates = response.data.dates.map((item: DateItem) => item.date)
      selectedDates.value = dates
    }
  } catch (error) {
    console.error('Failed to load unavailable dates:', error)
    $q.notify({ type: 'negative', message: t('accountWorkHour.unavailable.loadError', '근무 불가능 일정 로드에 실패했습니다') })
  }
}

// Convert daySchedules to format for API
const formatSchedulePreferencesForApi = () => {
  const result = {
    daySchedules: Object.values(daySchedules.value)
      .filter((accountWorkHour: DayScheduleDto) => accountWorkHour.enabled)
      .map((accountWorkHour: DayScheduleDto) => ({
        day: accountWorkHour.day,
        startTime: accountWorkHour.startTime,
        endTime: accountWorkHour.endTime
      }))
  }
  return result
}

// Convert API response to daySchedules format
const parseDaySchedulesFromApi = (data: any) => {
  // Reset all days to disabled first
  Object.keys(daySchedules.value).forEach(day => {
    daySchedules.value[day].enabled = false
  })
  
  // Enable and set times for days from API
  if (data?.daySchedules && Array.isArray(data.daySchedules)) {
    data.daySchedules.forEach((accountWorkHour: DayScheduleDto) => {
      const day = accountWorkHour.day
      if (daySchedules.value[day]) {
        daySchedules.value[day].enabled = true
        daySchedules.value[day].startTime = accountWorkHour.startTime
        daySchedules.value[day].endTime = accountWorkHour.endTime
      }
    })
  }
}

const handleScheduleUpdate = async () => {
  try {
    isSaving.value = true
    const formattedPreferences = formatSchedulePreferencesForApi()
    await apiAccountSchedule.saveSchedulePreferences(accountId.value, formattedPreferences)
    
    $q.notify({ type: 'positive', message: t('accountWorkHour.preferences.saveSuccess', '스케줄 설정이 저장되었습니다') })
  } catch (error) {
    $q.notify({ type: 'negative', message: t('accountWorkHour.preferences.saveError', '스케줄 설정 저장에 실패했습니다') })
  } finally {
    isSaving.value = false
  }
}

// Load accountWorkHour preferences on mount
const loadSchedulePreferences = async () => {
  try {
    const response = await apiAccountSchedule.getSchedulePreferences(accountId.value)
    if (response?.data) {
      parseDaySchedulesFromApi(response.data)
    }
  } catch (error) {
    console.error('Failed to load accountWorkHour preferences:', error)
  }
}

onMounted(() => {
  loadSchedulePreferences()
  loadUnavailableDates()
})
</script>

<style lang="scss" scoped>
// Add responsive padding
@media (max-width: 599px) {
  .q-card-section {
    padding: 8px !important;
  }
  
  .q-gutter-y-md > * {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
  }
}

// Set fixed height for cards on larger screens
@media (min-width: 992px) {
  .accountWorkHour-card {
    height: 700px !important;
  }
  
  .card-content {
    height: 620px !important;
  }
}

// Make chips smaller on mobile
:deep(.q-chip) {
  font-size: 12px;
  padding: 0 6px;
  height: 24px;
}

// Add styles for calendar
:deep(.q-date) {
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

// Adjust grid panel padding
:deep(.q-tab-panel--grid) {
  padding: 0;
}

// Make grid more compact on mobile
@media (max-width: 599px) {
  :deep(.ag-header-cell-label) {
    font-size: 12px;
  }
  
  :deep(.ag-cell) {
    font-size: 12px;
    padding: 4px;
  }
}
</style> 