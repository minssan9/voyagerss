<template>
  <q-page class="page-bg q-pa-lg">
    <div class="text-h5 text-weight-semibold q-mb-lg" style="font-family:-apple-system,system-ui;">Jobs</div>

    <q-card flat class="dash-card q-mb-md">
      <q-card-section>
        <q-table
          :rows="jobStore.jobs"
          :columns="columns"
          row-key="id"
          dark
          flat
          :loading="jobStore.loading"
          @row-click="(_, row) => selectJob(row)"
        >
          <template #body-cell-status="props">
            <q-td :props="props"><StatusBadge :status="props.value" /></q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <div v-if="selectedJob">
      <div class="text-subtitle1 text-weight-medium q-mb-sm">
        Log: Job #{{ selectedJob.id }} — {{ selectedJob.issueKey }}
      </div>
      <JobLogViewer :job-id="selectedJob.id" :auto-connect="true" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useJobStore } from '@/stores/autodev/store_job';
import StatusBadge from '@/components/autodev/StatusBadge.vue';
import JobLogViewer from '@/components/autodev/JobLogViewer.vue';
import type { Job } from '@/api/autodev/api-autodev';
import type { QTableColumn } from 'quasar';

const jobStore = useJobStore();
const selectedJob = ref<Job | null>(null);

const columns: QTableColumn[] = [
  { name: 'id',       label: 'ID',     field: 'id',       sortable: true, align: 'left' },
  { name: 'issueKey', label: 'Issue',  field: 'issueKey', sortable: true, align: 'left' },
  { name: 'status',   label: 'Status', field: 'status',   sortable: true, align: 'left' },
  { name: 'branch',   label: 'Branch', field: 'branch',                   align: 'left' },
  { name: 'prUrl',    label: 'PR',     field: 'prUrl',                    align: 'left' },
];

onMounted(() => jobStore.fetchJobs());

function selectJob(row: Job) {
  selectedJob.value = row;
}
</script>

<style scoped>
.page-bg { background: #0a0a0a; min-height: 100vh; }
.dash-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
</style>
