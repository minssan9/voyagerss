import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getIssues, triggerJob, type Issue } from '@/api/autodev/api-autodev';

export const useIssueStore = defineStore('autodev-issue', () => {
  const issues = ref<Issue[]>([]);
  const loading = ref(false);

  async function fetchIssues(): Promise<void> {
    loading.value = true;
    try {
      const { data } = await getIssues();
      issues.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function triggerIssue(issueKey: string): Promise<void> {
    await triggerJob(issueKey);
  }

  return { issues, loading, fetchIssues, triggerIssue };
});
