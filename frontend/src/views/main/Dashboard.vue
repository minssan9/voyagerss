<template>
  <q-page padding class="page-container">
    <!-- Dashboard Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 q-my-none">{{ t('dashboard.title', 'Dashboard') }}</h1>
        <p class="text-subtitle1 q-my-sm">{{ formattedDate }}</p>
      </div>
      <q-btn
        color="primary"
        :label="t('dashboard.weeklySchedule', 'WEEKLY SCHEDULE')"
        icon="calendar_today"
        class="q-px-md"
        @click="navigateToSchedule"
      />
    </div>

    <!-- Dashboard Stats Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Shifts Today Card -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">{{ t('dashboard.shiftsToday', 'Shifts Today') }}</div>
            <div class="text-h3 text-primary q-my-md">{{ statistics.shiftsToday }}</div>
            <q-btn
              flat
              color="primary"
              :label="t('dashboard.viewSchedule', 'VIEW SCHEDULE')"
              class="full-width"
              @click="navigateToSchedule"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Active Employees Card -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">{{ t('dashboard.activeEmployees', 'Active Employees') }}</div>
            <div class="text-h3 text-teal q-my-md">{{ statistics.activeEmployees }}</div>
            <q-btn
              flat
              color="teal"
              :label="t('dashboard.viewEmployees', 'VIEW EMPLOYEES')"
              class="full-width"
              @click="navigateToEmployees"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Weekly Labor Card -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">{{ t('dashboard.weeklyLabor', 'Weekly Labor') }}</div>
            <div class="text-h3 text-orange q-my-md">${{ statistics.weeklyLabor.toFixed(2) }}</div>
            <q-btn
              flat
              color="orange"
              :label="t('dashboard.viewReports', 'VIEW REPORTS')"
              class="full-width"
              @click="navigateToReports"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Attendance Rate Card -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="dashboard-card">
          <q-card-section>
            <div class="text-subtitle2">{{ t('dashboard.attendanceRate', 'Attendance Rate') }}</div>
            <div class="text-h3 text-green q-my-md">{{ statistics.attendanceRate }}%</div>
            <q-btn
              flat
              color="green"
              :label="t('dashboard.attendance', 'ATTENDANCE')"
              class="full-width"
              @click="navigateToAttendance"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick Actions Section -->
    <div class="q-mb-lg">
      <h2 class="text-h5 q-mb-md">{{ t('dashboard.quickActions', 'Quick Actions') }}</h2>
      <div class="row q-col-gutter-md">
        <!-- Only show Add Employee and Create Schedule for Managers -->
        <div v-if="isManager" class="col-12 col-sm-6 col-md-3">
          <q-card class="action-card q-pa-md text-center cursor-pointer" @click="navigateToAddEmployee">
            <q-icon name="person_add" size="2.5rem" color="primary" class="q-mb-sm" />
            <div class="text-subtitle1 text-primary">{{ t('dashboard.addEmployee', 'Add Employee') }}</div>
          </q-card>
        </div>
        <div v-if="isManager" class="col-12 col-sm-6 col-md-3">
          <q-card class="action-card q-pa-md text-center cursor-pointer" @click="navigateToCreateSchedule">
            <q-icon name="event" size="2.5rem" color="teal" class="q-mb-sm" />
            <div class="text-subtitle1 text-teal">{{ t('dashboard.createSchedule', 'Create Schedule') }}</div>
          </q-card>
        </div>
        <!-- Show for all users -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="action-card q-pa-md text-center cursor-pointer" @click="navigateToTrackAttendance">
            <q-icon name="schedule" size="2.5rem" color="orange" class="q-mb-sm" />
            <div class="text-subtitle1 text-orange">{{ t('dashboard.trackAttendance', 'Track Attendance') }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="action-card q-pa-md text-center cursor-pointer" @click="navigateToReports">
            <q-icon name="bar_chart" size="2.5rem" color="blue" class="q-mb-sm" />
            <div class="text-subtitle1 text-blue">{{ t('dashboard.viewReports', 'View Reports') }}</div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Today's Schedule Section -->
    <div>
      <h2 class="text-h5 q-mb-md">{{ t('dashboard.todaysSchedule', "Today's Schedule") }}</h2>
      <div v-if="todayShifts.length > 0">
        <q-card v-for="shift in todayShifts" :key="shift.id" class="q-mb-sm">
          <q-card-section class="row items-center">
            <q-avatar size="40px">
              <img :src="shift.avatar || 'https://cdn.quasar.dev/img/boy-avatar.png'" />
            </q-avatar>
            <div class="q-ml-md">
              <div class="text-subtitle1">{{ shift.employeeName }}</div>
              <div class="text-caption">{{ shift.position }}</div>
            </div>
            <q-space />
            <div class="text-subtitle2">{{ formatTime(shift.startTime) }} - {{ formatTime(shift.endTime) }}</div>
            <q-badge color="grey-6" class="q-ml-sm">{{ shift.shiftType }}</q-badge>
          </q-card-section>
        </q-card>
      </div>
      <div v-else class="text-center q-pa-md">
        <q-icon name="event_busy" size="3rem" color="grey-7" />
        <p class="text-subtitle1">{{ t('dashboard.noShifts', 'No shifts scheduled for today') }}</p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/modules/store_user'

const { t } = useI18n()
const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()

// Check if user is a manager
const isManager = computed(() => {
  return userStore.user.accountRoles?.some(role => 
    ['MANAGER', 'OWNER'].includes(role.roleType)
  ) ?? false
})

// Format current date
const formattedDate = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
})

// Dashboard statistics
const statistics = ref({
  shiftsToday: 1,
  activeEmployees: 4,
  weeklyLabor: 1976.00,
  attendanceRate: 95
})

// Today's shifts data
const todayShifts = ref([
  {
    id: 1,
    employeeName: 'Jane Smith',
    position: 'Cashier',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    shiftType: 'Regular cashier shift',
    avatar: 'https://cdn.quasar.dev/img/avatar2.jpg'
  }
])

// Format time helper function
function formatTime(time) {
  return time
}

// Navigation functions
function navigateToSchedule() {
  router.push('/schedule')
}

function navigateToEmployees() {
  router.push('/employees')
}

function navigateToReports() {
  router.push('/reports')
}

function navigateToAttendance() {
  router.push('/attendance')
}

function navigateToAddEmployee() {
  router.push('/employees/add')
}

function navigateToCreateSchedule() {
  router.push('/schedule/create')
}

function navigateToTrackAttendance() {
  router.push('/attendance/track')
}

// Fetch data on component mount
onMounted(async () => {
  try {
    // Simulated API call for dashboard data (replace with actual API call)
    await loadDashboardData()
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: t('dashboard.error.loading', 'Failed to load dashboard data'),
      icon: 'error'
    })
  }
})

// Load dashboard data
async function loadDashboardData() {
  // This would be replaced with an actual API call
  // Example: const data = await api.getDashboardData()
  
  // For now, we'll use the placeholder data already defined
  // In a real implementation, we would set:
  // statistics.value = data.statistics
  // todayShifts.value = data.todayShifts
}
</script>

<style lang="scss" scoped>
.dashboard-card {
  transition: transform 0.3s;
  height: 100%;
  
  &:hover {
    transform: translateY(-4px);
  }
}

.action-card {
  transition: all 0.3s;
  height: 100%;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
}
</style> 