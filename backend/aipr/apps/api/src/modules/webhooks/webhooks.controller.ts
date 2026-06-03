import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { GithubHmacGuard } from './github-hmac.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/webhooks/github
   * Receives GitHub App webhook events.
   * HMAC SHA-256 verified via GithubHmacGuard.
   */
  @Post('github')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(GithubHmacGuard)
  async handleGithub(
    @Headers('x-github-event') event: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<void> {
    if (event === 'pull_request') {
      await this.webhooksService.handlePullRequest(payload as any);
    }
    // Other events (push, check_run, etc.) — silently accept
  }
}
