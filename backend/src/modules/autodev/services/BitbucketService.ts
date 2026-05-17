import axios from 'axios';

export class BitbucketService {
  private workspace: string;
  private repoSlug: string;
  private token: string;

  constructor() {
    this.workspace = process.env.AUTODEV_BITBUCKET_WORKSPACE ?? '';
    this.repoSlug = process.env.AUTODEV_BITBUCKET_REPO_SLUG ?? '';
    this.token = process.env.AUTODEV_BITBUCKET_TOKEN ?? '';
  }

  async createPullRequest(branch: string, title: string, description: string): Promise<string | null> {
    if (!this.workspace || !this.repoSlug || !this.token) {
      console.warn('[BitbucketService] Missing Bitbucket config — skipping PR creation');
      return null;
    }

    const url = `https://api.bitbucket.org/2.0/repositories/${this.workspace}/${this.repoSlug}/pullrequests`;

    try {
      const response = await axios.post(
        url,
        {
          title,
          description,
          source: { branch: { name: branch } },
          destination: { branch: { name: 'main' } },
          close_source_branch: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const prUrl: string = response.data?.links?.html?.href ?? null;
      console.log(`[BitbucketService] Created PR: ${prUrl}`);
      return prUrl;
    } catch (err: any) {
      console.error('[BitbucketService] Failed to create PR:', err?.response?.data ?? err.message);
      return null;
    }
  }
}
