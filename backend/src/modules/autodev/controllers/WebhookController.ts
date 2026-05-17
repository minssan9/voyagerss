import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookParserService } from '../services/WebhookParserService';
import { PrMergeService } from '../services/PrMergeService';

const router = Router();
const webhookParserService = new WebhookParserService();
const prMergeService = new PrMergeService();

router.post('/jira', async (req: Request, res: Response) => {
  try {
    await webhookParserService.processJira(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WebhookController] Jira webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/slack', async (req: Request, res: Response) => {
  try {
    // Slack URL verification challenge
    if (req.body?.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }
    await webhookParserService.processSlack(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WebhookController] Slack webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bitbucket webhook — needs raw body for HMAC verification.
// Mount with express.raw() before this router in routes.ts.
router.post('/bitbucket', async (req: Request, res: Response) => {
  try {
    const secret = process.env.AUTODEV_BITBUCKET_WEBHOOK_SECRET ?? '';

    if (secret) {
      const signature = req.headers['x-hub-signature'] as string | undefined;
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const digest = `sha256=${hmac.digest('hex')}`;

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.headers['x-event-key'] as string | undefined;

    if (event === 'pullrequest:fulfilled') {
      await prMergeService.processMerged(req.body);
    } else if (event === 'pullrequest:rejected') {
      await prMergeService.processDeclined(req.body);
    } else {
      console.log(`[WebhookController] Unhandled Bitbucket event: ${event}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[WebhookController] Bitbucket webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
