<template>
  <WorkschdPage
    :title="t('admin.title')"
    :subtitle="t('admin.subtitle')"
    test-id="admin-dashboard"
    body-class="admin-dashboard"
  >
    <template #actions>
      <q-btn class="workschd-btn" unelevated no-caps dense :label="t('admin.refresh')" icon="refresh" @click="refreshData" :loading="loading" />
    </template>

    <!-- Statistics Cards Row 1 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- 전체 업무 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="assignment" size="40px" color="blue" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.totalTasks }}</div>
                <div class="text-grey-7">{{ t('admin.stats.totalTasks') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 모집 중 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="schedule" size="40px" color="green" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.openTasks }}</div>
                <div class="text-grey-7">{{ t('admin.stats.openTasks') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 마감 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="check_circle" size="40px" color="teal" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.closedTasks }}</div>
                <div class="text-grey-7">{{ t('admin.stats.closedTasks') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 취소 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="cancel" size="40px" color="red" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.cancelledTasks }}</div>
                <div class="text-grey-7">{{ t('admin.stats.cancelledTasks') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Statistics Cards Row 2 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- 전체 인력 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="group" size="40px" color="orange" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.totalWorkers }}</div>
                <div class="text-grey-7">{{ t('admin.stats.totalWorkers') }}</div>
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
                <div class="text-grey-7">{{ t('admin.stats.activeWorkers') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 전체 팀 -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="groups" size="40px" color="indigo" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.totalTeams }}</div>
                <div class="text-grey-7">{{ t('admin.stats.totalTeams') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Active Teams -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="verified" size="40px" color="pink" class="q-mr-md" />
              <div>
                <div class="text-h4">{{ statistics.activeTeams }}</div>
                <div class="text-grey-7">{{ t('admin.stats.activeTeams') }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- 업무 상태 -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ t('admin.taskStatusDistribution') }}</div>
            <q-list separator>
              <q-item v-for="status in statistics.tasksByStatus" :key="status.status">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ status.status }}</q-item-label>
                  <q-linear-progress
                    :value="status.count / statistics.totalTasks"
                    :color="getStatusColor(status.status)"
                    size="20px"
                    class="q-mt-xs"
                  >
                    <div class="absolute-full flex flex-center">
                      <q-badge color="white" text-color="black" :label="status.count" />
                    </div>
                  </q-linear-progress>
                </q-item-section>
              </q-item>
              <q-item v-if="statistics.tasksByStatus.length === 0">
                <q-item-section class="text-center text-grey-7">
                  {{ t('admin.noData') }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- 지역별 업무 -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ t('admin.tasksByRegion') }}</div>
            <q-list separator>
              <q-item v-for="region in statistics.tasksByRegion.slice(0, 8)" :key="region.region">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ region.region }}</q-item-label>
                  <q-linear-progress
                    :value="region.count / statistics.totalTasks"
                    color="blue"
                    size="20px"
                    class="q-mt-xs"
                  >
                    <div class="absolute-full flex flex-center">
                      <q-badge color="white" text-color="black" :label="region.count" />
                    </div>
                  </q-linear-progress>
                </q-item-section>
              </q-item>
              <q-item v-if="statistics.tasksByRegion.length === 0">
                <q-item-section class="text-center text-grey-7">
                  {{ t('admin.noData') }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 최근 활동 Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ t('admin.recentActivity') }}</div>
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
              <q-item v-if="recentActivities.length === 0">
                <q-item-section class="text-center text-grey-7">
                  {{ t('admin.noRecentActivity') }}
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
            <div class="text-h6 q-mb-md">{{ t('admin.teamsOverview') }}</div>
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

    <!-- 관리 바로가기 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ t('admin.adminMenu') }}</div>
            <div class="row q-gutter-sm">
              <q-btn
                outline color="primary" icon="admin_panel_settings" :label="t('admin.rbacManage')"
                @click="router.push('/workschd/admin/rbac')"
              />
              <q-btn
                outline color="grey-7" icon="settings" :label="t('admin.systemSettings')"
                @click="router.push('/workschd/admin/config')"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </WorkschdPage>
</template>

<script setup lang="ts">
import WorkschdPage from '@/modules/workschd/components/WorkschdPage.vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { formatDistanceToNow } from 'date-fns'
import apiStatistics, { DashboardStatistics, RecentActivity } from '@/modules/workschd/api/api-statistics'

const { t } = useI18n()
const router = useRouter()
const $q = useQuasar()

const loading = ref(false)

const statistics = ref<DashboardStatistics>({
  totalTasks: 0,
  openTasks: 0,
  closedTasks: 0,
  cancelledTasks: 0,
  totalWorkers: 0,
  activeWorkers: 0,
  totalTeams: 0,
  activeTeams: 0,
  totalNotifications: 0,
  unreadNotifications: 0,
  tasksByStatus: [],
  tasksByRegion: [],
  workersByTeam: [],
  recentActivities: []
})

const recentActivities = ref<RecentActivity[]>([])

const teams = ref([
  {
    id: 1,
    name: '서울 팀',
    region: 'Seoul',
    members: 15,
    status: 'ACTIVE'
  },
  {
    id: 2,
    name: '부산 팀',
    region: 'Busan',
    members: 12,
    status: 'ACTIVE'
  },
  {
    id: 3,
    name: '인천 팀',
    region: 'Incheon',
    members: 8,
    status: 'INACTIVE'
  }
])

const teamColumns = computed(() => [
  { name: 'id', label: t('admin.columns.id'), field: 'id', align: 'left' },
  { name: 'name', label: t('admin.columns.teamName'), field: 'name', align: 'left' },
  { name: 'region', label: t('admin.columns.region'), field: 'region', align: 'left' },
  { name: 'members', label: t('admin.columns.members'), field: 'members', align: 'center' },
  { name: 'status', label: t('admin.columns.status'), field: 'status', align: 'center' },
  { name: 'actions', label: t('admin.columns.actions'), field: 'actions', align: 'center' },
])

const refreshData = async () => {
  loading.value = true
  try {
    const response = await apiStatistics.getDashboardStatistics()
    statistics.value = response.data
    recentActivities.value = response.data.recentActivities
  } catch (error: any) {
    console.error('Failed to fetch statistics:', error)
    $q.notify({
      type: 'negative',
      message: t('admin.notifyLoadFailed'),
      caption: error.response?.data?.message || error.message,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'OPEN':
      return 'green'
    case 'CLOSED':
      return 'teal'
    case 'CANCELLED':
      return 'red'
    case 'IN_PROGRESS':
      return 'blue'
    default:
      return 'grey'
  }
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
