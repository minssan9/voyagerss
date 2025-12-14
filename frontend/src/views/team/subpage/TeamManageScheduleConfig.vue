<template>
  <div>
    <h3 class="text-h5 q-mb-md">{{ t('team.accountWorkHour.title', 'Schedule Configuration') }}</h3>
    <div v-if="mode === 'view' || mode === 'edit'">
      <div class="row q-col-gutter-md">
        <!-- Minimum Staff Per Day Section -->
        <div class="col-12 col-md-6">
          <q-card class="config-card">
            <q-card-section>
              <div class="text-h6">{{ t('team.accountWorkHour.minStaffTitle', 'Minimum Staff Per Day') }}</div>
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
              <div class="text-h6">{{ t('team.accountWorkHour.maxOffDaysTitle', 'Maximum Off Days Per Month') }}</div>
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
              <div class="text-h6">{{ t('team.accountWorkHour.additionalOptions', 'Additional Options') }}</div>
              <q-separator class="q-my-sm" />
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="allowWeekendWork"
                    :label="t('team.accountWorkHour.allowWeekendWork', 'Allow Weekend Work')"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="enforceMinimumRest"
                    :label="t('team.accountWorkHour.enforceMinimumRest', 'Enforce Minimum Rest Between Shifts')"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-input
                    v-model="maxConsecutiveWorkDays"
                    :label="t('team.accountWorkHour.maxConsecutiveWorkDays', 'Maximum Consecutive Work Days')"
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
                    :label="t('team.accountWorkHour.generationFrequency', 'Schedule Generation Frequency')"
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
          :label="t('common.reset', 'Reset')"
          color="secondary"
          flat
          class="q-mr-sm"
          @click="resetConfiguration"
        />
        <q-btn
          v-if="mode === 'edit'"
          :label="t('team.accountWorkHour.saveConfig', 'Save Configuration')"
          color="primary"
          @click="saveConfiguration"
          :loading="isSaving"
        />
        <q-btn
          v-if="mode === 'view'"
          :label="t('common.edit', 'Edit')"
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
import { useTeamStore } from '@/stores/modules/store_team'
import { 
  apiTeamSchedule,
  ScheduleConfig,
  DayConfig,
  MonthConfig,
  AdditionalOptions, 
  defaultMinStaffPerDay,
  defaultMaxOffDaysPerMonth,
  defaultAdditionalOptions
} from '@/api/modules/api-team-schedule'

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
  { label: t('team.accountWorkHour.frequency.weekly', 'Weekly'), value: 'WEEKLY' },
  { label: t('team.accountWorkHour.frequency.biweekly', 'Bi-weekly'), value: 'BIWEEKLY' },
  { label: t('team.accountWorkHour.frequency.monthly', 'Monthly'), value: 'MONTHLY' }
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
    $q.notify({ type: 'negative', message: t('team.accountWorkHour.fetchError', 'Failed to load configuration') })
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
    $q.notify({ type: 'positive', message: t('team.accountWorkHour.saveSuccess', 'Configuration saved successfully') })
    mode.value = 'view'
  } catch {
    $q.notify({ type: 'negative', message: t('team.accountWorkHour.saveError', 'Failed to save configuration') })
  } finally {
    isSaving.value = false
  }
}

// Reset config
function resetConfiguration() {
  $q.dialog({
    title: t('team.accountWorkHour.resetConfirmTitle', 'Reset Configuration'),
    message: t('team.accountWorkHour.resetConfirmMessage', 'Are you sure you want to reset all configuration values to defaults?'),
    cancel: true,
    persistent: true
  }).onOk(() => {
    minStaffPerDay.value = { ...defaultMinStaffPerDay }
    maxOffDaysPerMonth.value = { ...defaultMaxOffDaysPerMonth }
    allowWeekendWork.value = defaultAdditionalOptions.allowWeekendWork
    enforceMinimumRest.value = defaultAdditionalOptions.enforceMinimumRest
    maxConsecutiveWorkDays.value = defaultAdditionalOptions.maxConsecutiveWorkDays
    scheduleGenerationFrequency.value = defaultAdditionalOptions.scheduleGenerationFrequency
    $q.notify({ type: 'info', message: t('team.accountWorkHour.resetSuccess', 'Configuration reset to defaults') })
  })
}

watch(() => props.teamId, fetchScheduleConfig)
onMounted(fetchScheduleConfig)
</script>

<style scoped>
.config-card {
  height: 100%;
  transition: all 0.3s ease;
}

.config-card:hover {
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
}

.q-card {
  border-radius: 8px;
}

.q-card__section {
  padding: 16px;
}

.text-h6 {
  font-weight: 500;
  margin-bottom: 8px;
}
</style>