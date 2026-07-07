# Status

## Current target

Simple Persian RTL manager-demo prototype.

## Architecture

- Angular 21 (standalone component, single-file prototype)
- NestJS 11
- Prisma 6 + SQLite
- seeded demo data
- mock employee authentication
- fake TFS adapter

## Completed

- Phase 0: generic platform work archived; active workspace is prototype-only.
- Phase 1: Angular/NestJS, Prisma/SQLite, seed data, demo login, RTL shell.
- Phase 2: customer creation/FAQ/conversation and support queue/actions.
- Phase 3: test referral, information request, support return, PBI/version closure.
- Phase 4: manager metrics, recent tickets, responsive demo styling.
- Phase 5: focused UI polish, accessible mobile navigation, semantic statuses, and required PBI/version validation.
- Phase 6: role-aware canned reply bank for Customer, Sales, Support, Test, and IT/development to reduce repetitive typing.
- Phase 6 continued: IT developer reply box and guide FAQ bank seeded from the 20 Shahab sample questions.
- Phase 7: Docker build and dev workflow added with filtered pnpm installs, cached layers, and separate API/web images.
- Phase 7 continued: root-level Dockerfile and compose workflow added for the pnpm workspace, with bind mounts for live reload and isolated node_modules volumes.

## Files changed this session

- `package.json` — prevented Prisma `db push` from regenerating and locking the client a second time during setup.
- `apps/api/scripts/ensure-prisma-client.mjs` — skips client regeneration when the generated schema is already current.
- `README.md` — documented the Windows-safe database reset order.

- `apps/web/src/prototype.ts` — fixed `Metrics` type nullable issue and template visibility for test AWAITING_EXPERT.
- `apps/api/src/app.module.ts` — allowed test to CONFIRM_DEVELOPMENT and RETURN_SUPPORT from AWAITING_EXPERT when ticket is in test-dept (fixes request-info-then-customer-reply flow).
- `apps/api/scripts/full-verify.mjs` — comprehensive API verification script (60 checks).
- `apps/web/src/prototype.ts` and `prototype.css` — polished responsive UI, clearer actions/statuses, and safer form submission.
- `apps/web/src/styles.css` and `index.html` — simplified global styling and improved page metadata.
- `apps/api/src/app.module.ts` — Test development confirmation now persists required PBI/version data.

## Verification

Commands run and passed:

- `pnpm db:setup` — current-client check, Prisma push, seed
- `pnpm lint` — eslint clean
- `pnpm typecheck` — both api and web pass
- `pnpm test` — 1 API integration test passed
- `pnpm build` — both api and web build clean
- `node apps/api/scripts/full-verify.mjs` — 60/60 checks passed
- web and API targeted typechecks and ESLint — passed
- production Angular and NestJS builds — passed
- `node apps/api/scripts/demo-smoke.mjs` — passed
- desktop and 390px mobile browser verification — no console errors or horizontal overflow

Manual endpoints verified:

- `http://localhost:3000/api/v1/health` — OK
- `http://localhost:4200` — Angular app builds and serves

## Demo flows verified (automated)

1. Customer creates ticket → Support opens → Support replies → Customer replies → Support resolves with root cause → Customer confirms → Customer rates
2. Customer creates ticket → Support opens → Support refers to test → Test opens → Test requests info → Customer replies → Test confirms development with PBI and version
3. Authorization: customer cannot OPEN/REFER_TEST, support cannot CONFIRM_DEVELOPMENT, test cannot OPEN support ticket, manager cannot create ticket, closed-ticket transitions rejected

## Remaining limitations

- No real AD/LDAP integration (mock demo accounts only).
- No real TFS/Azure DevOps integration (fake adapter generates random PBI IDs).
- No persistent file storage or attachment support.
- No real-time notifications (polling-based refresh).
- No production security infrastructure (no auth tokens, no HTTPS).
- Seed data uses simple cuid-based IDs; tracking numbers are sequential.
- `docs/STATUS.md` was the only documentation updated.
