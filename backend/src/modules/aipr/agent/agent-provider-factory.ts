import { claudeCliProvider } from './claude-cli-provider';
import type { AgentProvider, AgentProviderId } from './types';

const PROVIDERS: Record<AgentProviderId, AgentProvider> = {
  claude_cli: claudeCliProvider,
};

export function resolveAgentProviderId(): AgentProviderId {
  return 'claude_cli';
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
