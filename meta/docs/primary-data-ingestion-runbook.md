# Primary-source data ingestion (Voyagerss)

Official public APIs only. **Badonion is not an upstream**; capability overlap is documented for product planning, not integration.

## Database

Uses the shared `DATABASE_URL` (MySQL on current DigitalOcean deploy; PostgreSQL-compatible DDL appendix for Supabase). Tables: `pd_source_fetch`, `pd_observation`, `pd_checkpoint`, `pd_ingestion_run`, `pd_ingestion_lock`.

Migration: `backend/db/migration/V5__primary_data_ingestion.sql` (additive; rollback does not drop legacy data).

## Schedule (default)

| Setting | Default | Notes |
|---------|---------|-------|
| `PD_INGESTION_ENABLED` | `false` | Must be `true` **and** credentials present before production activation |
| `PD_INGESTION_CRON` | `30 6 * * *` | 06:30 KST — after TWSE overnight updates; Korea customs often revises ~15th |
| `PD_INGESTION_TIMEZONE` | `Asia/Seoul` | node-cron timezone |

## Manual commands

```bash
cd backend
npm run ingest:primary-data:dry-run   # no DB writes (set PD_DRY_RUN=true optional)
npm run ingest:primary-data:daily     # daily incremental run
npm run ingest:primary-data:backfill  # same runner; widen windows via config
```

Environment examples (no secrets in repo):

```bash
# .env.local (boot) or system_config via seed-config
DATABASE_URL=mysql://user:pass@host:3306/voyagers
DART_API_KEY=
FRED_API_KEY=
DATA_GO_KR_SERVICE_KEY=
PD_INGESTION_ENABLED=false
PD_KOREA_TRADE_UNIVERSE_JSON=[{"hsSgn":"8542","cntyCd":"US"}]
```

## Capability matrix

See `meta/docs/primary-data-capability-matrix.md`.

## Query / historical fallback

`queryObservationWithFallback` (`observation-query-service.ts`):

- Never returns observations with `period_start` after the requested `asOfPeriod` (no lookahead).
- On upstream gaps, uses latest on-or-before period; sets `fallbackReason` (`historical_period_substitute`, `stale`, `no_lookahead`).
- Auth/schema failures are stored on `pd_source_fetch.error_code` and do **not** fabricate observations.

## Ops checklist

1. Apply migrations (`db:migrate` on boot or `bootstrapDatabase`).
2. `npm run seed:config` to register keys in `system_config`.
3. Set API keys in DB config or env; verify with `ingest:primary-data:dry-run`.
4. Enable `PD_INGESTION_ENABLED=true` only after approval.

## Licensed / unavailable categories

Adapters `supply_chain_edges`, `japan_monthly_revenue`, `company_trade_flow_mapping` run as **skipped** with documented reasons — no synthetic data.
