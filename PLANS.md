# Fast prototype implementation plan

## Progress

- [ ] Phase 0 — audit and simplify
- [ ] Phase 1 — demo foundation
- [ ] Phase 2 — customer and support flow
- [ ] Phase 3 — software-test escalation
- [ ] Phase 4 — manager dashboard and demo polish

## Phase 0 — Audit and simplify

- inspect current source;
- keep reusable Angular/NestJS code;
- archive unsupported platform work;
- switch planning to prototype scope;
- update `docs/STATUS.md`.

Exit condition:

- active code and docs describe only the ticketing prototype.

## Phase 1 — Demo foundation

Implement:

- Angular and NestJS apps;
- Prisma with SQLite;
- seed command;
- demo users and roles;
- Persian RTL shell;
- simple role-based navigation;
- mock login;
- products, departments, employers, FAQs, and categories.

Exit condition:

- one command starts the prototype;
- demo accounts can enter their dashboards;
- seeded master data is visible.

## Phase 2 — Customer and Support flow

Implement:

- customer ticket list;
- new-ticket wizard;
- employer/product/department selection;
- FAQ display and usage count;
- ticket creation with tracking number;
- support queue;
- open ticket;
- support reply;
- customer reply;
- customer confirmation;
- root-cause category;
- ticket and status history.

Exit condition:

- normal support flow works end to end.

## Phase 3 — Software-Test escalation

Implement:

- Support referral to Test;
- test queue;
- request-more-information flow;
- return-to-Support flow;
- confirm-development flow;
- PBI identifier;
- probable fixed version;
- fake TFS adapter;
- role restrictions.

Exit condition:

- suspected bug flow works end to end;
- development closure requires PBI and version.

## Phase 4 — Manager dashboard and polish

Implement:

- manager metric cards;
- tickets by product;
- tickets by department;
- recent tickets;
- average first-response time;
- filters for date/product/department;
- professional Persian labels;
- empty/loading/error states;
- demo reset/seed command;
- concise runbook.

Run:

- lint;
- typecheck;
- targeted unit tests;
- API smoke tests;
- one end-to-end demo flow.

Exit condition:

- prototype is stable and presentation-ready.
