import cron from 'node-cron';

export function startJiraSyncScheduler(): void {
  // Runs daily at 08:00
  cron.schedule('0 8 * * *', () => {
    console.log('[jiraSync] Jira sync ran (placeholder)');
  });

  console.log('[jiraSync] Scheduler registered (0 8 * * *)');
}
