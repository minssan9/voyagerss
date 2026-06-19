import { Response } from 'express';
import { RunnerMode } from '@prisma/client-aipr';
import { repositoriesService } from '../services/RepositoriesService';
import { AiprRequest } from '../middleware/auth';

const RUNNER_MODES = Object.values(RunnerMode);
const RUNNER_FIELDS = ['planRunner', 'buildRunner'] as const;

export class RepositoriesController {
  async list(req: AiprRequest, res: Response) {
    const providerId = Number(req.params.providerId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    try {
      const result = await repositoriesService.listRepositories(providerId, page, limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async sync(req: AiprRequest, res: Response) {
    const providerId = Number(req.params.providerId);
    try {
      const result = await repositoriesService.syncRepositories(providerId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async patchAutoPilot(req: AiprRequest, res: Response) {
    const repoId = Number(req.params.repoId);
    if (isNaN(repoId)) {
      res.status(400).json({ message: 'repoId must be a valid number' });
      return;
    }
    const { autoPilot } = req.body;
    if (typeof autoPilot !== 'boolean') {
      res.status(400).json({ message: 'autoPilot must be a boolean' });
      return;
    }
    try {
      const result = await repositoriesService.updateAutoPilot(repoId, autoPilot);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async patchRunnerMode(req: AiprRequest, res: Response) {
    const repoId = Number(req.params.repoId);
    if (isNaN(repoId)) {
      res.status(400).json({ message: 'repoId must be a valid number' });
      return;
    }
    const { field, mode } = req.body;
    if (!RUNNER_FIELDS.includes(field)) {
      res.status(400).json({ message: `field must be one of: ${RUNNER_FIELDS.join(', ')}` });
      return;
    }
    if (!RUNNER_MODES.includes(mode)) {
      res.status(400).json({ message: `mode must be one of: ${RUNNER_MODES.join(', ')}` });
      return;
    }
    try {
      const result = await repositoriesService.updateRunnerMode(repoId, field, mode);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}

export const repositoriesController = new RepositoriesController();
