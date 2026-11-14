import { runPrimaryDataIngestion } from './runner';
import type { AdapterRunContext, AdapterRunResult, SourceAdapter } from '../types';

class StubAdapter implements SourceAdapter {
  constructor(
    readonly id: string,
    private readonly result: AdapterRunResult,
  ) {}

  isConfigured(): boolean {
    return true;
  }

  async run(_ctx: AdapterRunContext): Promise<AdapterRunResult> {
    return this.result;
  }
}

describe('runPrimaryDataIngestion', () => {
  it('aggregates adapter results in dry-run without DB', async () => {
    const report = await runPrimaryDataIngestion({
      mode: 'dry-run',
      dryRun: true,
      skipLock: true,
      adapters: [
        new StubAdapter('a1', {
          adapterId: 'a1',
          status: 'success',
          fetches: 1,
          observationsWritten: 2,
          errors: [],
        }),
        new StubAdapter('a2', {
          adapterId: 'a2',
          status: 'skipped',
          fetches: 0,
          observationsWritten: 0,
          errors: [],
          unavailableReason: 'not configured',
        }),
      ],
    });
    expect(report.status).toBe('success');
    expect(report.adapterResults).toHaveLength(2);
  });
});
