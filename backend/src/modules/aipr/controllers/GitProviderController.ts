import { Response } from 'express';
import { z } from 'zod';
import { gitProviderService } from '../services/GitProviderService';
import { AiprRequest } from '../middleware/auth';

const CreateProviderSchema = z.object({
  type: z.enum(['GITHUB', 'GITLAB']),
  displayName: z.string().min(1),
  baseUrl: z.string().url(),
  token: z.string().min(1),
});

const UpdateProviderSchema = z.object({
  displayName: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  token: z.string().min(1).optional(),
});

export class GitProviderController {
  async list(_req: AiprRequest, res: Response) {
    try {
      const providers = await gitProviderService.listProviders();
      res.json(providers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async create(req: AiprRequest, res: Response) {
    const parsed = CreateProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
      return;
    }
    try {
      const provider = await gitProviderService.createProvider(parsed.data);
      res.status(201).json(provider);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async update(req: AiprRequest, res: Response) {
    const id = Number(req.params.id);
    const parsed = UpdateProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
      return;
    }
    try {
      const provider = await gitProviderService.updateProvider(id, parsed.data);
      res.json(provider);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async remove(req: AiprRequest, res: Response) {
    const id = Number(req.params.id);
    try {
      await gitProviderService.deleteProvider(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async testConnection(req: AiprRequest, res: Response) {
    const id = Number(req.params.id);
    try {
      const result = await gitProviderService.testConnection(id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}

export const gitProviderController = new GitProviderController();
