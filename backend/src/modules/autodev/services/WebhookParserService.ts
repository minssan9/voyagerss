import { autodevPrisma } from '../../../config/prisma';

export class WebhookParserService {
  async processJira(payload: any): Promise<void> {
    const issue = payload?.issue;
    if (!issue) {
      console.warn('[WebhookParserService] Jira payload missing issue field');
      return;
    }

    const issueKey: string = issue.key;
    const summary: string = issue.fields?.summary ?? '';
    const description: string = issue.fields?.description?.content
      ? issue.fields.description.content
          .map((block: any) => block?.content?.map((c: any) => c?.text ?? '').join('') ?? '')
          .join('\n')
      : (issue.fields?.description ?? '');
    const status: string = issue.fields?.status?.name ?? 'OPEN';

    await autodevPrisma.issue.upsert({
      where: { issueKey },
      create: {
        issueKey,
        source: 'jira',
        summary,
        description,
        status: status.toUpperCase(),
      },
      update: {
        summary,
        description,
        status: status.toUpperCase(),
        updatedAt: new Date(),
      },
    });

    console.log(`[WebhookParserService] Upserted Jira issue ${issueKey}`);
  }

  async processSlack(payload: any): Promise<void> {
    const text: string = payload?.event?.text ?? '';
    const match = text.match(/[A-Z]+-\d+/);
    if (!match) {
      console.log('[WebhookParserService] No issue key found in Slack message');
      return;
    }

    const issueKey = match[0];

    // Upsert a minimal issue record if not already tracked
    await autodevPrisma.issue.upsert({
      where: { issueKey },
      create: {
        issueKey,
        source: 'slack',
        summary: `Issue mentioned in Slack: ${issueKey}`,
        status: 'OPEN',
      },
      update: {
        updatedAt: new Date(),
      },
    });

    console.log(`[WebhookParserService] Processed Slack mention of issue ${issueKey}`);
  }
}
