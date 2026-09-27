<template>
  <div class="team-schedule" data-testid="team-schedule-config">
    <h3 class="text-h5 q-mb-md">{{ t('team.accountWorkHour.title') }}</h3>
    <div v-if="mode === 'view' || mode === 'edit'">
      <div class="row q-col-gutter-md">
        <!-- Minimum Staff Per Day Section -->
        <div class="col-12 col-md-6">
          <q-card class="config-card">
            <q-card-section>
              <div class="text-h6">{{ t('team.accountWorkHour.minStaffTitle') }}</div>
              <q-separator class="q-my-sm" />
              
              <div class="row q-col-gutter-sm">
                <div v-for="day in daysOfWeek" :key="day.value" class="col-12 col-sm-6">
                  <q-input
                    v-model="minStaffPerDay[day.value]"
                    :label="t(`days.${day.value.toLowerCase()}`, day.label)"
                    type="number"
                    filled
                    dense
                    min="0"
                  >
                    <template v-slot:prepend>
                      <q-icon name="event" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Maximum Off Days Per Month Section -->
        <div class="col-12 col-md-6">
          <q-card class="config-card">
            <q-card-section>
              <div class="text-h6">{{ t('team.accountWorkHour.maxOffDaysTitle') }}</div>
              <q-separator class="q-my-sm" />
              
              <div class="row q-col-gutter-sm">
                <div v-for="month in months" :key="month.value" class="col-12 col-sm-6 col-lg-4">
                  <q-input
                    v-model="maxOffDaysPerMonth[month.value]"
                    :label="t(`months.${month.value}`, month.label)"
                    type="number"
                    filled
                    dense
                    min="0"
                  >
                    <template v-slot:prepend>
                      <q-icon name="calendar_month" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
        
        <!-- Additional Configuration Options -->
        <div class="col-12">
          <q-card class="config-card">
            <q-card-section>
              <div class="text-h6">{{ t('team.accountWorkHour.additionalOptions') }}</div>
              <q-separator class="q-my-sm" />
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="allowWeekendWork"
                    :label="t('team.accountWorkHour.allowWeekendWork')"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="enforceMinimumRest"
                    :label="t('team.accountWorkHour.enforceMinimumRest')"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-input
                    v-model="maxConsecutiveWorkDays"
                    :label="t('team.accountWorkHour.maxConsecutiveWorkDays')"
                    type="number"
                    filled
                    dense
                    min="1"
                    max="14"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="scheduleGenerationFrequency"
                    :options="scheduleFrequencyOptions"
                    :label="t('team.accountWorkHour.generationFrequency')"
                    filled
                    dense
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row justify-end q-mt-md">
        <q-btn
          v-if="mode === 'edit'"
          :label="t('common.reset')"
          color="secondary"
          flat
          class="q-mr-sm"
          @click="resetConfiguration"
        />
        <q-btn
          v-if="mode === 'edit'"
          :label="t('team.accountWorkHour.saveConfig')"
          color="primary"
          @click="saveConfiguration"
          :loading="isSaving"
        />
        <q-btn
          v-if="mode === 'view'"
          :label="t('common.edit')"
          color="primary"
          @click="mode = 'edit'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useTeamStore } from '@/modules/workschd/store/store_team'
import { 
  apiTeamSchedule,
  ScheduleConfig,
  DayConfig,
  MonthConfig,
  AdditionalOptions, 
  defaultMinStaffPerDay,
  defaultMaxOffDaysPerMonth,
  defaultAdditionalOptions
} from '@/modules/workschd/api/api-team-schedule'

const props = defineProps({ teamId: { type: Number, required: true } })
const { t } = useI18n()
const $q = useQuasar()
const isSaving = ref(false)
const mode = ref<'view' | 'edit'>('view') // Add mode if needed

const teamStore = useTeamStore()

// State
const minStaffPerDay = ref<DayConfig>({ ...defaultMinStaffPerDay })
const maxOffDaysPerMonth = ref<MonthConfig>({ ...defaultMaxOffDaysPerMonth })
const allowWeekendWork = ref(defaultAdditionalOptions.allowWeekendWork)
const enforceMinimumRest = ref(defaultAdditionalOptions.enforceMinimumRest)
const maxConsecutiveWorkDays = ref(defaultAdditionalOptions.maxConsecutiveWorkDays)
const scheduleGenerationFrequency = ref(defaultAdditionalOptions.scheduleGenerationFrequency)
const scheduleFrequencyOptions = [
  { label: t('team.accountWorkHour.frequency.weekly'), value: 'WEEKLY' },
  { label: t('team.accountWorkHour.frequency.biweekly'), value: 'BIWEEKLY' },
  { label: t('team.accountWorkHour.frequency.monthly'), value: 'MONTHLY' }
]

// Fetch config
async function fetchScheduleConfig() {
  try {
    const { data } = await apiTeamSchedule.getTeamScheduleConfig(props.teamId)
    if (data) {
      minStaffPerDay.value = data.minStaffPerDay || { ...defaultMinStaffPerDay }
      maxOffDaysPerMonth.value = data.maxOffDaysPerMonth || { ...defaultMaxOffDaysPerMonth }
      Object.assign(
        { allowWeekendWork, enforceMinimumRest, maxConsecutiveWorkDays, scheduleGenerationFrequency },
        data.additionalOptions || defaultAdditionalOptions
      )
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: t('team.accountWorkHour.fetchError') })
  }
}

// Save config
async function saveConfiguration() {
  isSaving.value = true
  try {
    await apiTeamSchedule.saveTeamScheduleConfig(props.teamId, {
      minStaffPerDay: minStaffPerDay.value,
      maxOffDaysPerMonth: maxOffDaysPerMonth.value,
      additionalOptions: {
        allowWeekendWork: allowWeekendWork.value,
        enforceMinimumRest: enforceMinimumRest.value,
        maxConsecutiveWorkDays: maxConsecutiveWorkDays.value,
        scheduleGenerationFrequency: scheduleGenerationFrequency.value
      }
    })
    $q.notify({ type: 'positive', message: t('team.accountWorkHour.saveSuccess') })
    mode.value = 'view'
  } catch {
    $q.notify({ type: 'negative', message: t('team.accountWorkHour.saveError') })
  } finally {
    isSaving.value = false
  }
}

// Reset config
function resetConfiguration() {
  $q.dialog({
    title: t('team.accountWorkHour.resetConfirmTitle'),
    message: t('team.accountWorkHour.resetConfirmMessage'),
    cancel: true,
    persistent: true
  }).onOk(() => {
    minStaffPerDay.value = { ...defaultMinStaffPerDay }
    maxOffDaysPerMonth.value = { ...defaultMaxOffDaysPerMonth }
    allowWeekendWork.value = defaultAdditionalOptions.allowWeekendWork
    enforceMinimumRest.value = defaultAdditionalOptions.enforceMinimumRest
    maxConsecutiveWorkDays.value = defaultAdditionalOptions.maxConsecutiveWorkDays
    scheduleGenerationFrequency.value = defaultAdditionalOptions.scheduleGenerationFrequency
    $q.notify({ type: 'info', message: t('team.accountWorkHour.resetSuccess') })
  })
}

watch(() => props.teamId, fetchScheduleConfig)
onMounted(fetchScheduleConfig)
</script>
