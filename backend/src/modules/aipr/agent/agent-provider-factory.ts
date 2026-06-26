import { aiprConfigService } from '../../../config/aipr-config-service';
import { claudeCliProvider } from './claude-cli-provider';
import { ompSdkProvider } from './omp-runner';
import type { AgentProvider, AgentProviderId } from './types';

const PROVIDERS: Record<AgentProviderId, AgentProvider> = {
  claude_cli: claudeCliProvider,
  omp_sdk: ompSdkProvider,
};

export function resolveAgentProviderId(): AgentProviderId {
  const raw = aiprConfigService.get('AIPR_AGENT_PROVIDER', 'claude_cli');
  return raw === 'omp_sdk' ? 'omp_sdk' : 'claude_cli';
}

export class AgentProviderFactory {
  static get(): AgentProvider {
    return PROVIDERS[resolveAgentProviderId()];
  }

  static getById(id: AgentProviderId): AgentProvider {
    return PROVIDERS[id];
  }

  static listIds(): AgentProviderId[] {
    return Object.keys(PROVIDERS) as AgentProviderId[];
  }
}
