# Primary-data capability matrix

| Category | Adapter ID | Granularity | Native frequency | History | Auth | Status in repo |
|----------|------------|-------------|------------------|---------|------|----------------|
| Credit spreads (US macro) | `fred_credit_spreads` | Index series | Daily | FRED vintage rules | `FRED_API_KEY` | Implemented; **live needs key** |
| Taiwan monthly revenue | `twse_monthly_revenue` | Listed company | Monthly snapshot | Poll daily; API = latest month only | None | Implemented; **live testable without key** |
| Security / entity mapping (TW) | `twse_security_master` | Listed profile | Snapshot | Latest only | None | Implemented; **live testable** |
| Korea trade (aggregate) | `korea_customs_hs_trade` | HS × country national | Monthly | Customs revision ~15th | `DATA_GO_KR_SERVICE_KEY` | Implemented; **live needs key** |
| Security / entity mapping (KR) | `dart_corp_master` | corp_code ↔ stock | Snapshot | Full ZIP/XML | `DART_API_KEY` | Implemented; **live needs key** |
| Korea filings index | `dart_disclosure_index` | Disclosure metadata | Daily window | OpenDART search rules | `DART_API_KEY` | Implemented; **live needs key** |
| Supply chain edges | `supply_chain_edges` | Firm graph | — | — | — | **Not publicly available** |
| Japan monthly revenue | `japan_monthly_revenue` | Company 月次 | — | — | Licensed / per-issuer | **Not publicly available** (use EDINET quarterly separately) |
| Company ↔ trade mapping | `company_trade_flow_mapping` | Curated flows | — | — | Licensed | **Not publicly available** |

## Distinctions

- **Aggregate vs company trade**: Korea `관세청_품목별 국가별 수출입` is national HS×partner statistics, not firm-level export/import.
- **Monthly vs quarterly (Japan)**: No unified government monthly revenue feed; quarterly EDINET/XBRL is a different adapter scope.
- **Supply chain**: Public sources do not assert verified supplier-customer edges; do not infer edges from trade aggregates.

## Test coverage

| Area | Test type |
|------|-----------|
| TW ROC date conversion | Unit |
| HTTP retry / backoff | Unit |
| FRED JSON mapping | Unit |
| Query fallback / no lookahead | Unit |
| Repository upsert SQL | Unit (SQL builder / mocked) |
| TWSE / FRED / DART live | Manual only when keys/network available |

## References

- FRED: https://fred.stlouisfed.org/docs/api/fred/
- TWSE OpenAPI: https://openapi.twse.com.tw/v1/swagger.json
- OpenDART: https://opendart.fss.or.kr/
- 관세청 품목·국가별 수출입 (data.go.kr): https://www.data.go.kr/data/15100475/openapi.do
