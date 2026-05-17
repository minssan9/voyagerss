import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getJobs, type Job } from '@/api/autodev/api-autodev';

export const useJobStore = defineStore('autodev-job', () => {
  const jobs = ref<Job[]>([]);
  const loading = ref(false);

  async function fetchJobs(status?: string): Promise<void> {
    loading.value = true;
    try {
      const { data } = await getJobs(status);
      jobs.value = data;
    } finally {
      loading.value = false;
    }
  }

  return { jobs, loading, fetchJobs };
});
