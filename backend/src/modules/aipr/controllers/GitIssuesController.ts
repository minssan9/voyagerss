import { Response } from 'express';
import { gitIssuesService } from '../services/GitIssuesService';
import { AiprRequest } from '../middleware/auth';

export class GitIssuesController {
  async listRemote(req: AiprRequest, res: Response) {
    const repoId = Number(req.params.repoId);
    try {
      const issues = await gitIssuesService.fetchRemoteIssues(repoId);
      res.json(issues);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async importIssue(req: AiprRequest, res: Response) {
    const repoId = Number(req.params.repoId);
    const issueNum = Number(req.params.num);
    try {
      const issue = await gitIssuesService.importIssue(repoId, issueNum);
      res.status(201).json(issue);
    } catch (err: any) {
      const status = (err as any).status ?? 500;
      res.status(status).json({ message: err.message });
    }
  }
}

export const gitIssuesController = new GitIssuesController();
