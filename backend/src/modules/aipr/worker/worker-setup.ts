import { Queue, Worker } from 'bullmq';
import { planProcessor } from './plan.processor';
import { buildProcessor } from './build.processor';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const planQueue = new Queue('plan', { connection });
export const buildQueue = new Queue('build', { connection });

let planWorker: Worker | null = null;
let buildWorker: Worker | null = null;

export function initWorkers() {
  if (planWorker || buildWorker) return; // avoid double init

  planWorker = new Worker('plan', async (job) => {
    await planProcessor(job);
  }, {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 1000 },
  });

  buildWorker = new Worker('build', async (job) => {
    await buildProcessor(job);
  }, {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 1000 },
  });

  planWorker.on('failed', (job, err) => {
    console.error(`Plan worker job ${job?.id} failed:`, err);
  });

  buildWorker.on('failed', (job, err) => {
    console.error(`Build worker job ${job?.id} failed:`, err);
  });

  console.log('🔧 Auto-PR Workers initialized (queues: plan, build)');
}

export async function shutdownWorkers() {
  await planWorker?.close();
  await buildWorker?.close();
  await planQueue.close();
  await buildQueue.close();
}
