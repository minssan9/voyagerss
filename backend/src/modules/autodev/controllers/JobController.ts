import { Router, Request, Response } from 'express';
import { JobService } from '../services/JobService';
import { ClaudeRunnerService } from '../services/ClaudeRunnerService';
import { SseRegistry } from '../services/SseRegistry';
import { autodevPrisma } from '../../../config/prisma';

const router = Router();
const jobService = new JobService();
const claudeRunnerService = new ClaudeRunnerService();

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const jobs = await jobService.list(status);
    res.json(jobs);
  } catch (err) {
    console.error('[JobController] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = await jobService.findById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('[JobController] findById error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/trigger/:issueKey', async (req: Request, res: Response) => {
  try {
    const { issueKey } = req.params;
    const job = await jobService.create(issueKey);
    // Fire-and-forget
    claudeRunnerService.triggerIssueImplementation(job.id, issueKey).catch((err) => {
      console.error(`[JobController] triggerIssueImplementation failed for job ${job.id}:`, err);
    });
    res.status(201).json(job);
  } catch (err) {
    console.error('[JobController] trigger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = await jobService.update(id, req.body);
    res.json(job);
  } catch (err) {
    console.error('[JobController] update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SSE streaming endpoint
router.get('/:jobId/stream', async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.jobId, 10);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Replay existing logs from DB
    const history = await autodevPrisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
    for (const log of history) {
      res.write(`event: log\ndata: ${JSON.stringify(log.line)}\n\n`);
    }
  } catch (err) {
    console.error('[JobController] Failed to replay logs:', err);
  }

  // Register for live updates
  SseRegistry.register(jobId, res);

  req.on('close', () => {
    SseRegistry.remove(jobId);
  });
});

export default router;
