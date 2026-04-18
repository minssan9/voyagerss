import axios from 'axios';

export class JiraService {
  private baseUrl: string;
  private apiToken: string;
  private doneStatus: string;

  constructor() {
    this.baseUrl = process.env.AUTODEV_JIRA_BASE_URL ?? '';
    this.apiToken = process.env.AUTODEV_JIRA_API_TOKEN ?? '';
    this.doneStatus = process.env.AUTODEV_JIRA_DONE_STATUS ?? 'Done';
  }

  async transitionToDone(issueKey: string): Promise<void> {
    if (!this.baseUrl || !this.apiToken) {
      console.warn('[JiraService] Missing Jira config — skipping transition');
      return;
    }

    try {
      // Fetch available transitions
      const transitionsUrl = `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`;
      const { data } = await axios.get(transitionsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      });

      const transition = (data.transitions as any[]).find(
        (t: any) => t.name === this.doneStatus || t.to?.name === this.doneStatus,
      );

      if (!transition) {
        console.warn(`[JiraService] No transition to "${this.doneStatus}" found for ${issueKey}`);
        return;
      }

      await axios.post(
        transitionsUrl,
        { transition: { id: transition.id } },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(`[JiraService] Transitioned ${issueKey} to "${this.doneStatus}"`);
    } catch (err: any) {
      console.error('[JiraService] Transition failed:', err?.response?.data ?? err.message);
    }
  }
}
