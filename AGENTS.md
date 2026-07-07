# Codex instructions — prototype mode

## Mission

Build a simple, polished, Persian-first manager demo of the Tadkar ticketing workflow.

This is a prototype. Do not build a production platform.

## Source priority

1. `docs/PROTOTYPE_SCOPE.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/PRODUCT_SPEC_FA.md`
4. `docs/TICKET_STATE_MACHINE.md`
5. `reference/Tadkar_Ticketing_Explanation_V01.pdf`

Use the old technical files only when a specific UI or naming detail is needed.

## Fast, low-token operating mode

- Use low reasoning effort.
- Keep plans to at most 5 short bullets.
- Do not reread the whole repository after every step.
- Inspect only files needed for the current task.
- Do not summarize files you just read.
- Do not explain routine coding decisions.
- Do not print large diffs or entire files.
- Do not generate long architecture documents.
- Do not search the web.
- Do not contact the live Tadkar website.
- Do not analyze minified bundles unless explicitly required.
- Do not create sub-agents unless two independent tasks clearly save time.
- Prefer direct implementation over extended analysis.
- Reuse working code.
- Avoid broad refactors.
- Run targeted tests during development.
- Run the full smoke test only at the end of a phase.
- Keep progress updates to:
  - completed;
  - files changed;
  - tests;
  - next task.

## Prototype architecture

Use the simplest local stack:

- Angular frontend;
- NestJS backend;
- Prisma;
- SQLite;
- seeded demo data;
- mock employee authentication;
- fake TFS adapter;
- no Docker requirement;
- no Redis;
- no MinIO;
- no LDAP server;
- no microservices.

The app must start with a small number of commands.

## Required demo roles

- customer;
- support expert;
- test expert;
- manager;
- optional system administrator.

Use visible demo-account buttons or documented credentials.

## Required demo flow

1. Customer selects employer, product, and Sales or Support.
2. Relevant FAQs appear.
3. Customer creates a ticket.
4. Support expert opens and answers it.
5. Customer either confirms resolution or replies.
6. Support can refer a suspected bug to Software Test.
7. Test can request more information, return to Support, or confirm development.
8. Development confirmation requires:
   - PBI identifier;
   - probable fixed version.
9. Manager sees summary metrics.

## Hard boundaries

Do not implement:

- real Active Directory;
- real TFS/Azure DevOps calls;
- BPMN;
- workflow designers;
- dynamic form builders;
- report designers;
- microservices;
- Kubernetes;
- background-job infrastructure;
- production-grade notification systems;
- advanced file storage;
- exhaustive security infrastructure.

Create clean adapter interfaces for real AD and TFS integration later, but use local fake implementations now.

## Quality bar

The prototype must:

- look coherent and professional;
- work in Persian RTL;
- contain seeded realistic data;
- demonstrate the complete core flow;
- prevent obvious role confusion;
- avoid fake buttons that do nothing;
- have a short README with run and demo instructions.

## Documentation

Update `docs/STATUS.md` briefly after each phase.

Do not expand documentation unless implementation requires clarification.
