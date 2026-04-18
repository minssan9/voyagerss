import cron from 'node-cron';

export function startWorktreeCleanupScheduler(): void {
  // Runs daily at 02:00
  cron.schedule('0 2 * * *', () => {
    console.log('[worktreeCleanup] Worktree cleanup ran (placeholder)');
  });

  console.log('[worktreeCleanup] Scheduler registered (0 2 * * *)');
}
