import { Request, Response } from 'express';
import { runsService } from '../services/RunsService';

export class RunsController {
  async streamLogs(req: Request, res: Response) {
    try {
      const { runId } = req.query;
      if (!runId || typeof runId !== 'string') {
        res.status(400).json({ message: 'runId is required' });
        return;
      }
      await runsService.streamLogs(runId, res);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}

export const runsController = new RunsController();
