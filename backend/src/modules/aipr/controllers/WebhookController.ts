import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { webhookService } from '../services/WebhookService';
import { aiprConfigService } from '../../../config/aipr-config-service';

export function githubHmacMiddleware(req: Request, res: Response, next: NextFunction) {
  const sig256 = req.headers['x-hub-signature-256'] as string | undefined;
  if (!sig256) {
    res.status(401).json({ message: 'Missing x-hub-signature-256' });
    return;
  }

  const secret = aiprConfigService.get('GITHUB_WEBHOOK_SECRET');
  if (!secret) {
    res.status(401).json({ message: 'Webhook secret not configured' });
    return;
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    res.status(401).json({ message: 'Raw body unavailable' });
    return;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const sigBuf = Buffer.from(sig256);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    res.status(401).json({ message: 'Invalid webhook signature' });
    return;
  }

  next();
}

export function gitlabTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-gitlab-token'] as string | undefined;
  const secret = aiprConfigService.get('GITLAB_WEBHOOK_SECRET');

  if (!secret) {
    res.status(401).json({ message: 'GitLab webhook secret not configured' });
    return;
  }

  if (!token || token !== secret) {
    res.status(401).json({ message: 'Invalid GitLab webhook token' });
    return;
  }

  next();
}

export class WebhookController {
  async handleGithub(req: Request, res: Response) {
    try {
      const event = req.headers['x-github-event'] as string;
      const payload = req.body;

      if (event === 'pull_request') {
        await webhookService.handlePullRequest(payload);
      }

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async handleGitlab(req: Request, res: Response) {
    try {
      const event = req.headers['x-gitlab-event'] as string;
      const payload = req.body;

      if (event === 'Merge Request Hook') {
        await webhookService.handleMergeRequest(payload);
      }

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}

export const webhookController = new WebhookController();
