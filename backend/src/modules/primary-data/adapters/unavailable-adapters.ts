import type { AdapterRunContext, AdapterRunResult, SourceAdapter } from '../types';

function unavailableAdapter(id: string, reason: string): SourceAdapter {
  return {
    id,
    isConfigured: () => false,
    async run(_ctx: AdapterRunContext): Promise<AdapterRunResult> {
      return {
        adapterId: id,
        status: 'skipped',
        fetches: 0,
        observationsWritten: 0,
        errors: [],
        unavailableReason: reason,
      };
    },
  };
}

export const supplyChainEdgesAdapter = unavailableAdapter(
  'supply_chain_edges',
  'No authoritative public API exposes verified firm-to-firm supply-chain edges.',
);

export const japanMonthlyRevenueAdapter = unavailableAdapter(
  'japan_monthly_revenue',
  'Japan lacks a single open monthly revenue snapshot API analogous to TWSE t187ap05_L; use EDINET quarterly filings or licensed data.',
);

export const companyTradeFlowAdapter = unavailableAdapter(
  'company_trade_flow_mapping',
  'Korea customs open APIs provide HS×country aggregates only, not company-level trade linkage.',
);
