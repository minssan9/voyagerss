import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    claudeBin: process.env.AUTODEV_CLAUDE_BIN ?? '/usr/local/bin/claude',
    maxTurns: parseInt(process.env.AUTODEV_CLAUDE_MAX_TURNS ?? '30', 10),
    bitbucketWorkspace: process.env.AUTODEV_BITBUCKET_WORKSPACE ?? '',
    jiraBaseUrl: process.env.AUTODEV_JIRA_BASE_URL ?? '',
    jiraProjectKey: process.env.AUTODEV_JIRA_PROJECT_KEY ?? '',
    slackConfigured: Boolean(process.env.AUTODEV_SLACK_WEBHOOK_URL),
  });
});

export default router;
