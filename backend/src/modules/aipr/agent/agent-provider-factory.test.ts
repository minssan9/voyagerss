import { AgentProviderFactory, resolveAgentProviderId } from './agent-provider-factory';
import { claudeCliProvider } from './claude-cli-provider';
import { ompSdkProvider } from './omp-runner';

jest.mock('../../../config/aipr-config-service', () => ({
  aiprConfigService: {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'AIPR_AGENT_PROVIDER') return process.env.TEST_AIPR_AGENT_PROVIDER ?? fallback;
      return fallback;
    }),
  },
}));

describe('AgentProviderFactory', () => {
  afterEach(() => {
    delete process.env.TEST_AIPR_AGENT_PROVIDER;
  });

  it('should_default_to_claude_cli', () => {
    expect(resolveAgentProviderId()).toBe('claude_cli');
    expect(AgentProviderFactory.get()).toBe(claudeCliProvider);
  });

  it('should_resolve_omp_sdk_when_configured', () => {
    process.env.TEST_AIPR_AGENT_PROVIDER = 'omp_sdk';
    expect(resolveAgentProviderId()).toBe('omp_sdk');
    expect(AgentProviderFactory.get()).toBe(ompSdkProvider);
  });

  it('should_list_both_providers', () => {
    expect(AgentProviderFactory.listIds()).toEqual(['claude_cli', 'omp_sdk']);
  });
});
