import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class GitWorktreeService {
  private branchName(issueKey: string): string {
    return `feature/${issueKey.toLowerCase()}`;
  }

  private worktreePath(issueKey: string, repoRoot: string): string {
    return path.join(repoRoot, '..', `.worktrees/${issueKey}`);
  }

  async createWorktree(issueKey: string, baseBranch: string, repoRoot: string): Promise<string> {
    const branch = this.branchName(issueKey);
    const wtPath = this.worktreePath(issueKey, repoRoot);

    // Ensure the branch exists from baseBranch
    try {
      await execAsync(`git -C "${repoRoot}" branch "${branch}" "${baseBranch}"`);
    } catch {
      // Branch may already exist — ignore
    }

    await execAsync(`git -C "${repoRoot}" worktree add "${wtPath}" "${branch}"`);
    console.log(`[GitWorktreeService] Created worktree at ${wtPath} for branch ${branch}`);
    return wtPath;
  }

  async removeWorktree(issueKey: string, repoRoot: string): Promise<void> {
    const wtPath = this.worktreePath(issueKey, repoRoot);
    await execAsync(`git -C "${repoRoot}" worktree remove --force "${wtPath}"`);
    console.log(`[GitWorktreeService] Removed worktree at ${wtPath}`);
  }

  async pushBranch(issueKey: string, worktreePath: string): Promise<void> {
    const branch = this.branchName(issueKey);
    await execAsync(`git -C "${worktreePath}" push -u origin "${branch}"`);
    console.log(`[GitWorktreeService] Pushed branch ${branch} from ${worktreePath}`);
  }
}
