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
}

export const repositoriesController = new RepositoriesController();
