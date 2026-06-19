import { Response } from 'express';
import { repositoriesService } from '../services/RepositoriesService';
import { AiprRequest } from '../middleware/auth';

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
}

export const repositoriesController = new RepositoriesController();
