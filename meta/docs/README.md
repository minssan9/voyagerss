# Voyagerss Documentation

프로젝트 문서는 `meta/docs/` 아래에 모여 있습니다. 소스 코드는 `backend/`, `frontend/`를 참조하세요.

## 시작하기

- [setup.md](setup.md) — 로컬 개발·운영 배포 전체 가이드
- [.env.example](../../.env.example) — 운영 환경 변수 템플릿 (로컬은 `.env.local`)

## Guides

| 문서 | 설명 |
|------|------|
| [aipr-local-mlx.md](guides/aipr-local-mlx.md) | AIPR + 로컬 MLX 연동 (스크립트는 [local-llm](../../../local-llm/)) |
| [MIGRATION-GUIDE.md](guides/MIGRATION-GUIDE.md) | DB 마이그레이션 |
| [multi_schema_guide.md](guides/multi_schema_guide.md) | Prisma 멀티 스키마 |
| [workschd-implementation-guide.md](guides/workschd-implementation-guide.md) | WorkSchd 구현 |
| [github-runner-guide.md](guides/github-runner-guide.md) | GitHub Actions runner |
| [github-actions-logs.md](guides/github-actions-logs.md) | `gh` CLI로 pipeline 로그 보기 |

## PRD

- [PRD-aipr.md](prd/PRD-aipr.md)
- [PRD-aviation.md](prd/PRD-aviation.md)
- [PRD-investand.md](prd/PRD-investand.md)
- [PRD-workschd.md](prd/PRD-workschd.md)
- [workschd-gap-analysis.md](prd/workschd-gap-analysis.md)

## Specs / API / Test

- [specs/](specs/) — 기능 명세 (investand, workschd)
- [api/](api/) — API 동기화·테스트 계획
- [test/](test/) — 모듈별 테스트 계획
- [templates/PR-TEMPLATE.md](templates/PR-TEMPLATE.md)

## Deploy

- [meta/deploy/DEPLOY-DIGITALOCEAN.md](../deploy/DEPLOY-DIGITALOCEAN.md) — DigitalOcean 배포

## Tooling

- [meta/dotfiles/cursor-harness/](../dotfiles/cursor-harness/) — Cursor harness 설치
- [~/repository/local-llm](../../../local-llm/) — 로컬 LLM (MLX + Open WebUI, [docs](../../../local-llm/docs/openwebui-mlx.md))
