<template>
  <q-page padding>
    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="q-my-none">Admin Dashboard</h4>
        <p class="text-grey-7 q-mb-none">Overview of workschd system</p>
      </div>
      <q-btn
        color="primary"
        label="Refresh"
        icon="refresh"
        @click="refreshData"
        :loading="loading"
      />
    </div>

    <!-- Statistics Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Total Tasks -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="assignment" size="40px" color="blue" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.totalTasks }}</div>
                <div class="text-grey-7">Total Tasks</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Open Tasks -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="schedule" size="40px" color="green" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.openTasks }}</div>
                <div class="text-grey-7">Open Tasks</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Total Workers -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="group" size="40px" color="orange" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.totalWorkers }}</div>
                <div class="text-grey-7">Total Workers</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Active Workers -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="person_check" size="40px" color="purple" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.activeWorkers }}</div>
                <div class="text-grey-7">Active Workers</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Task Status Chart -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Task Status Distribution</div>
            <div class="chart-container">
              <!-- 차트 라이브러리 사용 (Chart.js, ApexCharts 등) -->
              <div class="text-center text-grey-7">
                Chart placeholder - Implement with Chart.js or ApexCharts
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Recent Activity -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Recent Activity</div>
            <q-list separator>
              <q-item v-for="activity in recentActivities" :key="activity.id">
                <q-item-section avatar>
                  <q-avatar
                    :icon="activity.icon"
                    :color="activity.color"
                    text-color="white"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ activity.title }}</q-item-label>
                  <q-item-label caption>{{ activity.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ formatDate(activity.timestamp) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Teams Table -->
    <div class="row q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Teams Overview</div>
            <q-table
              :rows="teams"
              :columns="teamColumns"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.row.status === 'ACTIVE' ? 'green' : 'grey'"
                    text-color="white"
                    dense
                  >
                    {{ props.row.status }}
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    round
                    icon="visibility"
                    @click="viewTeam(props.row.id)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    @click="editTeam(props.row.id)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'

const router = useRouter()

const loading = ref(false)

const statistics = ref({
  totalTasks: 0,
  openTasks: 0,
  totalWorkers: 0,
  activeWorkers: 0
})

const recentActivities = ref([
  {
    id: 1,
    icon: 'add_task',
    color: 'blue',
    title: 'New task created',
    description: 'Seoul Funeral Service',
    timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
  },
  {
    id: 2,
    icon: 'person_add',
    color: 'green',
    title: 'Worker joined',
    description: 'John Doe joined team',
    timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  },
  {
    id: 3,
    icon: 'check_circle',
    color: 'orange',
    title: 'Task completed',
    description: 'Busan Funeral Service',
    timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
  }
])

const teams = ref([
  {
    id: 1,
    name: 'Seoul Team',
    region: 'Seoul',
    members: 15,
    status: 'ACTIVE'
  },
  {
    id: 2,
    name: 'Busan Team',
    region: 'Busan',
    members: 12,
    status: 'ACTIVE'
  },
  {
    id: 3,
    name: 'Incheon Team',
    region: 'Incheon',
    members: 8,
    status: 'INACTIVE'
  }
])

const teamColumns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Team Name', field: 'name', align: 'left' },
  { name: 'region', label: 'Region', field: 'region', align: 'left' },
  { name: 'members', label: 'Members', field: 'members', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const refreshData = async () => {
  loading.value = true
  try {
    // TODO: Fetch real data from API
    // const response = await dashboardApi.getStatistics()
    // statistics.value = response.data

    // Mock data for now
    statistics.value = {
      totalTasks: 156,
      openTasks: 42,
      totalWorkers: 89,
      activeWorkers: 35
    }
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true })
}

const viewTeam = (teamId: number) => {
  router.push({ name: 'TeamManage (Manager)', query: { teamId } })
}

const editTeam = (teamId: number) => {
  router.push({ name: 'TeamManage (Manager)', query: { teamId, edit: 'true' } })
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.chart-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
