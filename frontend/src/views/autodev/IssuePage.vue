<template>
  <q-page class="page-bg q-pa-lg">
    <div class="row items-center q-mb-lg">
      <div class="text-h5 text-weight-semibold" style="font-family:-apple-system,system-ui;">Issues</div>
      <q-space />
      <q-btn flat dense icon="refresh" @click="issueStore.fetchIssues()" :loading="issueStore.loading" />
    </div>

    <q-card flat class="dash-card">
      <q-card-section>
        <IssueCard
          v-for="issue in issueStore.issues"
          :key="issue.id"
          :issue="issue"
          @trigger="handleTrigger"
        />
        <div
          v-if="!issueStore.issues.length && !issueStore.loading"
          class="text-grey text-center q-pa-lg"
        >
          No issues yet. Send a Jira or Slack webhook to create one.
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useIssueStore } from '@/stores/autodev/store_issue';
import { useQuasar } from 'quasar';
import IssueCard from '@/components/autodev/IssueCard.vue';

const issueStore = useIssueStore();
const $q = useQuasar();

onMounted(() => issueStore.fetchIssues());

async function handleTrigger(issueKey: string) {
  await issueStore.triggerIssue(issueKey);
  $q.notify({ type: 'positive', message: `Job triggered for ${issueKey}` });
}
</script>

<style scoped>
.page-bg { background: #0a0a0a; min-height: 100vh; }
.dash-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
</style>
