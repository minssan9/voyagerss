import { Response } from 'express';
import { z } from 'zod';
import { adminService } from '../services/AdminService';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { AiprRequest } from '../middleware/auth';

const IssueListQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.string().transform(Number).optional(),
  limit:  z.string().transform(Number).optional(),
});

const PatchIssueSchema = z.object({
  status:        z.string().optional(),
  title:         z.string().optional(),
  body:          z.string().optional(),
  repoFullName:  z.string().optional(),
  baseBranch:    z.string().optional(),
});

const OriginSchema = z.object({
  origin: z.string().url(),
});

export class AdminController {
  async listIssues(req: AiprRequest, res: Response) {
    try {
      const query = IssueListQuerySchema.parse(req.query);
      const result = await adminService.listIssues(query);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async getIssue(req: AiprRequest, res: Response) {
    try {
      const { id } = req.params;
      const issue = await adminService.getIssue(id);
      res.json(issue);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  async patchIssue(req: AiprRequest, res: Response) {
    try {
      const { id } = req.params;
      const parsed = PatchIssueSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: 'Invalid inputs', errors: parsed.error.flatten() });
        return;
      }
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const issue = await adminService.patchIssue(id, parsed.data, adminId);
      res.json(issue);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async listOrigins(req: AiprRequest, res: Response) {
    try {
      const origins = await prisma.allowedOrigin.findMany({ orderBy: { createdAt: 'asc' } });
      res.json(origins);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async addOrigin(req: AiprRequest, res: Response) {
    try {
      const r = OriginSchema.safeParse(req.body);
      if (!r.success) {
        res.status(400).json({ message: 'Invalid origin', errors: r.error.flatten() });
        return;
      }
      const added = await prisma.allowedOrigin.upsert({
        where:  { origin: r.data.origin },
        update: {},
        create: { origin: r.data.origin, appId: 'default' },
      });
      res.status(201).json(added);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}

export const adminController = new AdminController();
