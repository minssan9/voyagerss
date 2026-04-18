import { Router, Request, Response } from 'express';
import { IssueService } from '../services/IssueService';
import { PrMergeService } from '../services/PrMergeService';

const router = Router();
const issueService = new IssueService();
const prMergeService = new PrMergeService();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const issues = await issueService.list();
    res.json(issues);
  } catch (err) {
    console.error('[IssueController] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:issueKey', async (req: Request, res: Response) => {
  try {
    const issue = await issueService.findByKey(req.params.issueKey);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    console.error('[IssueController] findByKey error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:issueKey/completion', async (req: Request, res: Response) => {
  try {
    const history = await issueService.getCompletionHistory(req.params.issueKey);
    res.json(history);
  } catch (err) {
    console.error('[IssueController] getCompletionHistory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:issueKey/complete', async (req: Request, res: Response) => {
  try {
    await prMergeService.manualComplete(req.params.issueKey);
    res.json({ message: 'Issue marked complete' });
  } catch (err) {
    console.error('[IssueController] manualComplete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:issueKey/reopen', async (req: Request, res: Response) => {
  try {
    await prMergeService.reopen(req.params.issueKey);
    res.json({ message: 'Issue reopened' });
  } catch (err) {
    console.error('[IssueController] reopen error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
