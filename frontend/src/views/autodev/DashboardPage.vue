<template>
  <q-page class="page-bg q-pa-lg">
    <div class="text-h5 text-weight-semibold q-mb-lg" style="font-family:-apple-system,system-ui;">
      Dashboard
    </div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-3" v-for="kpi in kpis" :key="kpi.label">
        <q-card flat class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey q-mb-xs">{{ kpi.label }}</div>
            <div class="text-h4 text-weight-bold">{{ kpi.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Active Jobs -->
    <q-card flat class="dash-card q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Active Jobs</div>
        <div v-if="runningJobs.length === 0" class="text-grey text-center q-pa-md">
          No active jobs
        </div>
        <div v-for="job in runningJobs" :key="job.id" class="q-mb-sm">
          <div class="row items-center">
            <div class="col">
              <span class="text-weight-medium">{{ job.issueKey }}</span>
              <span class="text-grey text-caption q-ml-sm">{{ job.branch }}</span>
            </div>
            <StatusBadge :status="job.status" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Recent Issues -->
    <q-card flat class="dash-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Recent Issues</div>
        <IssueCard
          v-for="issue in recentIssues"
          :key="issue.id"
          :issue="issue"
          @trigger="triggerIssue"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useIssueStore } from '@/stores/autodev/store_issue';
import { useJobStore } from '@/stores/autodev/store_job';
import IssueCard from '@/components/autodev/IssueCard.vue';
import StatusBadge from '@/components/autodev/StatusBadge.vue';

const issueStore = useIssueStore();
const jobStore = useJobStore();

onMounted(async () => {
  await Promise.all([issueStore.fetchIssues(), jobStore.fetchJobs()]);
});

const kpis = computed(() => [
  { label: 'Total Issues',  value: issueStore.issues.length },
  { label: 'Done Today',    value: issueStore.issues.filter(i => i.status === 'DONE').length },
  { label: 'Running Jobs',  value: jobStore.jobs.filter(j => j.status === 'RUNNING').length },
  { label: 'Failed Today',  value: jobStore.jobs.filter(j => j.status === 'FAILED').length },
]);

const runningJobs  = computed(() => jobStore.jobs.filter(j => j.status === 'RUNNING'));
const recentIssues = computed(() => issueStore.issues.slice(0, 5));

function triggerIssue(issueKey: string) {
  issueStore.triggerIssue(issueKey);
}
</script>

<style scoped>
.page-bg { background: #0a0a0a; min-height: 100vh; }
.kpi-card, .dash-card {
  background: #1a1a1a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
}
</style>
