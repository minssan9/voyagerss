import { AgentProviderFactory, resolveAgentProviderId } from './agent-provider-factory';
import { claudeCliProvider } from './claude-cli-provider';

describe('AgentProviderFactory', () => {
  it('should_default_to_claude_cli', () => {
    expect(resolveAgentProviderId()).toBe('claude_cli');
    expect(AgentProviderFactory.get()).toBe(claudeCliProvider);
  });

  it('should_list_claude_cli_only', () => {
    expect(AgentProviderFactory.listIds()).toEqual(['claude_cli']);
  });
});
