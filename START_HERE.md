# Start here

## Overlay this pack

Back up the existing project, then copy this pack into the repository root.

Keep working source code. Replace the old planning files with the prototype versions.

## Codex prompt

```text
Read AGENTS.md, docs/PROTOTYPE_SCOPE.md, PLANS.md,
docs/PRODUCT_SPEC_FA.md, and docs/TICKET_STATE_MACHINE.md.

This is a simple manager-demo prototype, not a production system.

Operate in fast, low-token mode:
- use low reasoning effort;
- plan in no more than 5 bullets;
- inspect only files needed for the current task;
- do not reread large reference files;
- do not search the web;
- do not produce long explanations;
- implement directly;
- run targeted tests;
- keep updates extremely short.

First inspect the current repository and preserve reusable work.
Remove or archive unsupported BPMN, generic form-builder, workflow-engine,
Jasper, Camunda, Flowable, microservice, Redis, MinIO, and production-only work.

Use:
- Angular;
- NestJS;
- Prisma;
- SQLite;
- seeded demo users and data;
- mock employee login;
- fake TFS adapter.

Implement only the scope in docs/PROTOTYPE_SCOPE.md and PLANS.md.

The prototype must demonstrate:
1. customer login and ticket creation;
2. FAQ before ticket creation;
3. support expert handling;
4. customer reply or confirmation;
5. referral to Software Test;
6. development confirmation with PBI and probable fixed version;
7. manager dashboard with a few key metrics.

Do not stop for minor decisions. Choose simple reversible defaults.
Stop only if the repository cannot run or a required file is missing.
```
