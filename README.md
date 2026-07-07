# Tadkar Ticketing Manager Prototype

This repository is for a fast, presentable prototype of the Tadkar ticketing system.

The goal is to demonstrate the business flow to management, not to deliver a production platform.

## Run

Prerequisite: Node.js and pnpm.

```powershell
pnpm install
pnpm db:setup
pnpm dev
```

Open `http://localhost:4200`. The API runs on `http://localhost:3000`.

Stop `pnpm dev` with `Ctrl+C` before running `pnpm db:setup` again. This avoids
Windows file locks on the generated Prisma client.

Use the visible demo buttons for customer, support expert, test expert, and manager. Run `pnpm db:seed` to reset demo data.

Prototype coverage:

- customer, expert, manager demo accounts;
- Tadkar Windows and Shahab Web products;
- Sales, Support, and Software Test departments;
- FAQ before ticket creation;
- ticket conversation and status history;
- Support-to-Test referral;
- PBI identifier and probable fixed version;
- customer and expert dashboards;
- a small management report page.

Deferred until after approval:

- real Active Directory;
- real TFS/Azure DevOps;
- production deployment;
- SMS/email notifications;
- file attachments;
- complete reporting suite;
- enterprise security hardening;
- advanced organization administration.
