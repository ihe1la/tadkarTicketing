# Security Assessment Report — Tadkar Ticketing (wirafpay.com)

| | |
|---|---|
| **Target** | `https://wirafpay.com` — Tadkar Ticketing Manager (NestJS + Angular + Prisma/SQLite) |
| **Assessment type** | White-box source review + authorized live recon |
| **Date** | 2026-06-29 |
| **Assessor** | Claude Code (authorized by owner) |
| **Source reviewed** | `apps/api/src/`, `apps/web/src/`, `apps/api/prisma/`, Docker/deploy config |
| **Overall risk** | 🔴 **Critical** — complete authentication bypass; all data and privileged actions are exposed to anonymous internet users |

---

## 1. Executive summary

The application was explicitly built as a **localhost demo prototype** (`README.md`, `AGENTS.md` state "mock employee authentication" and that security hardening is "deferred"). That design is fine for a demo on a developer's machine. The critical problem is that **the prototype is now deployed on the public internet** (`wirafpay.com`), where its intentional lack of authentication becomes a full compromise.

There is **no authentication mechanism of any kind** — no passwords, sessions, tokens, or signatures. User identity is a plain `userId` string supplied by the client on every request, and an unauthenticated endpoint (`/demo/accounts`) publishes the complete list of valid identities. Any anonymous visitor can therefore read all customer data, impersonate any employee or manager, and tamper with all records.

A secondary layer of findings shows that even if authentication were added, the **authorization logic itself is broken** (missing object-level checks for several roles, an empty-filter fallback that dumps the whole database, and a forgeable audit trail).

| Severity | Count |
|---|---|
| 🔴 Critical | 3 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🔵 Low | 5 |

**Top recommendation:** take the prototype off the open internet (or place it behind a network gate) immediately, then introduce server-verified authentication and per-object authorization before any further exposure.

---

## 2. Scope & methodology

- **In scope:** the source code of the deployed application and a non-destructive, read-only probe of the live host.
- **Method:** full white-box read of the backend (6 source files), data model, frontend auth handling, and container/deploy configuration; targeted scans for SQL/NoSQL injection, mass assignment, prototype pollution, XSS, SSRF, secrets, and raw queries; live reachability/TLS probing.
- **Live-testing limitation:** the host (`185.8.172.185`) was **not reachable from the assessment environment** — TCP connected on 443/80 but the TLS/HTTP handshake was dropped (egress firewall/DPI between the environment and the Iran-hosted server, `unexpected eof while reading`). Live exploitation was therefore **reasoned from source**; runnable proof-of-concept commands are provided for the owner to confirm from a normal network.
- **Out of scope / not performed:** destructive testing, DoS, data modification on live data, brute force.

---

## 3. Findings

### Severity index

| ID | Severity | Title |
|---|---|---|
| C-1 | 🔴 Critical | No authentication — identity is a client-supplied parameter |
| C-2 | 🔴 Critical | Unauthenticated account/credential enumeration (`/demo/accounts`) |
| C-3 | 🔴 Critical | `GET /tickets` dumps the entire database for any unlisted role |
| H-1 | 🟠 High | Broken object-level authorization (BOLA/IDOR) across roles |
| H-2 | 🟠 High | Forgeable audit trail / repudiation |
| H-3 | 🟠 High | Privileged data & actions reachable by role spoofing |
| M-1 | 🟡 Medium | No runtime input validation (`ValidationPipe` absent) |
| M-2 | 🟡 Medium | No security middleware (Helmet, rate limiting, body limits) |
| M-3 | 🟡 Medium | Business-logic abuse — premature ticket close & state jumps |
| M-4 | 🟡 Medium | Race condition on tracking-number generation |
| M-5 | 🟡 Medium | No pagination — unbounded queries enable resource exhaustion |
| L-1 | 🔵 Low | CORS configuration is decorative / misconfiguration-prone |
| L-2 | 🔵 Low | Container runs as root |
| L-3 | 🔵 Low | `dev.db` SQLite database committed to the repository |
| L-4 | 🔵 Low | Predictable tracking numbers & info-leaking health banner |
| L-5 | 🔵 Low | Cross-reference pollution on ticket creation |

---

### C-1 — No authentication; identity is a client-supplied parameter 🔴

**Description.** The system has no credential of any kind. The `User` model has no password/secret field (`apps/api/prisma/prototype.prisma:27-35`), and "login" simply returns a user by id:

```ts
// apps/api/src/adapters/employee-auth.adapter.ts:8
login(userId) { return this.prisma.user.findUniqueOrThrow({ where: { id: userId } }); }
```

Every protected endpoint trusts a `userId` taken from the query string or request body and resolves it via `user(id)` (`apps/api/src/app.module.ts:113`): `tickets` (:32), `ticket` (:49), `create` (:52), `action` (:60), `metrics` (:98).

**Impact.** Anyone can act as any user — including `MANAGER` — by supplying that user's id. This is a complete authentication bypass affecting confidentiality, integrity, and accountability.

**Remediation.** Implement real authentication (hashed password with bcrypt/argon2, or the planned AD integration) that issues a signed session/JWT. Derive the acting user **server-side from the verified session**; remove the `userId` query/body parameter entirely.

---

### C-2 — Unauthenticated account enumeration 🔴

**Description.** `GET /api/v1/demo/accounts` returns the entire user table, including each user's `id` and `role`:

```ts
// apps/api/src/app.module.ts:21  ->  employee-auth.adapter.ts:7
demoAccounts() { return this.prisma.user.findMany({ orderBy: { role: 'asc' } }); }
```

**Impact.** Because the `id` is the de-facto credential (see C-1), this endpoint hands every anonymous visitor the keys to every account, with roles labelled for targeted impersonation. No guessing required.

**PoC (run from a reachable network):**
```bash
curl -s https://wirafpay.com/api/v1/demo/accounts
```

**Remediation.** Remove `/demo/accounts` and `/demo/login` from any internet-facing build. Never expose a user directory unauthenticated.

---

### C-3 — `GET /tickets` returns the whole database for any unlisted role 🔴

**Description.** The role→filter chain in `apps/api/src/app.module.ts:34-45` is `CUSTOMER → SUPPORT → TEST → SALES → DEVELOPER → else { where = {} }`. `MANAGER` is not in the chain, so it falls through to an **empty `where`**, and `findMany` returns **all tickets** with the full `includeTicket` graph (customers, messages, status history — `app.module.ts:7,45`).

**Impact.** A single request exfiltrates every customer's PII and every full support conversation.

**PoC:**
```bash
MGR=$(curl -s https://wirafpay.com/api/v1/demo/accounts | jq -r '.[]|select(.role=="MANAGER")|.id')
curl -s "https://wirafpay.com/api/v1/tickets?userId=$MGR" | jq length
```

**Remediation.** Replace the implicit `else {}` with an explicit deny (throw `ForbiddenException`), and define each role's filter explicitly. Never let an unrecognized role resolve to "return everything."

---

### H-1 — Broken object-level authorization (BOLA / IDOR) 🟠

**Description.** `assertVisible` (`apps/api/src/app.module.ts:115`) is the only per-ticket gate and only throws for `CUSTOMER`, `TEST`, `SALES`, `DEVELOPER`:

- `SUPPORT` and `MANAGER` have **no object-level check** → `GET /tickets/<any-id>?userId=<support-id>` returns any ticket by id.
- `TEST` can read **any** ticket in `AWAITING_EXPERT` status regardless of department/owner.
- `DEVELOPER` can read **any** ticket with a non-null `pbiIdentifier` regardless of owner.

**Impact.** These IDOR paths survive even after authentication is added — the authorization predicate itself is too loose, so a low-privilege account can read tickets it shouldn't.

**Remediation.** Make `assertVisible` allow-list per role and always assert ownership/assignment (e.g., the acting user is the ticket's customer, or is assigned to the ticket's current department). Default to deny.

---

### H-2 — Forgeable audit trail / repudiation 🟠

**Description.** Message authorship and status history use the client-supplied `userId`: `authorId: user.id` (`app.module.ts:92,55`) and `StatusHistory.actorId: user.id` (`app.module.ts:93`).

**Impact.** An attacker can post messages and forge state-change history entries attributed to any real employee or customer. The audit log cannot be relied upon for dispute resolution and provides a clean repudiation vector.

**Remediation.** Derive `authorId`/`actorId` from the authenticated session (C-1), never from request input. Consider append-only history with server timestamps.

---

### H-3 — Privileged data & actions via role spoofing 🟠

**Description.** Because the role is read from the spoofable `userId` (C-1), an attacker selects their privileges:
- `MANAGER` → `GET /manager/metrics` returns aggregate metrics plus recent full ticket objects (`app.module.ts:99-110`).
- Any role → drive ticket state transitions, inject messages, confirm/close/rate tickets, and write PBI identifiers via `POST /tickets/<id>/actions` (`app.module.ts:60-95`).

**Remediation.** Resolved by C-1 (server-verified identity/role) combined with H-1 (object-level checks).

---

### M-1 — No runtime input validation 🟡

No global `ValidationPipe`; request bodies are TypeScript types only (erased at runtime). Consequences: unbounded `title`/`description`/`message` strings (storage abuse), type-confusion 500s (e.g., `?userId=a&userId=b` → array → Prisma error), and unvalidated `dateFrom`/`dateTo` → `new Date(...)` (`app.module.ts:105-106`). `zod` is already a dependency in `packages/` but unused by the API.
**Remediation.** Add a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` with DTOs; bound string lengths.

### M-2 — No security middleware 🟡

`apps/api/src/main.ts` configures only CORS — no Helmet (missing CSP/HSTS/X-Content-Type-Options), no rate limiting (`@nestjs/throttler`), default body limits only. Enables scraping, brute force, and DoS.
**Remediation.** Add `helmet()`, `@nestjs/throttler`, and explicit body-size limits.

### M-3 — Business-logic abuse (premature close / state jumps) 🟡

`CONFIRM` moves a ticket to `CLOSED_RESOLVED` from **any** non-closed status including `NEW` (`app.module.ts:67`) — before any expert review. Combined with impersonation, an attacker can mass-close a customer's open tickets.
**Remediation.** Enforce explicit allowed source states for each transition.

### M-4 — Race condition on tracking-number generation 🟡

`trackingNumber = TDK-1405-<count()+1>` (`app.module.ts:54`) is a TOCTOU; concurrent `POST /tickets` collide on the `@unique` field → 500 / duplicate logical numbers.
**Remediation.** Use a DB sequence/`cuid()` or generate inside a transaction with retry.

### M-5 — No pagination / unbounded queries 🟡

Every `findMany` (`:45`, `:108`, `demoAccounts`) is unbounded. With no rate limiting this is a cheap resource-exhaustion vector as data grows.
**Remediation.** Add `take`/`skip` (or cursor) pagination with server-side caps.

### L-1 — CORS decorative / misconfiguration-prone 🔵

`enableCors({ origin: WEB_ORIGIN, credentials: true })` (`main.ts:8-11`) protects nothing because auth uses no cookies; the real attack path is direct (curl/server-side). Falls back to `http://localhost:4200` if `WEB_ORIGIN` is unset in prod.
**Remediation.** Once session cookies exist, set an explicit allow-listed origin and keep `credentials` scoped.

### L-2 — Container runs as root 🔵

The `Dockerfile` never creates/switches to a non-root `USER`.
**Remediation.** Add a dedicated non-root user and `USER` directive in the production stage.

### L-3 — `dev.db` committed to the repository 🔵

`apps/api/prisma/dev.db` is tracked. If it ever contains real data this is a disclosure; databases should not live in the repo.
**Remediation.** Remove from VCS and add to `.gitignore`.

### L-4 — Predictable tracking numbers & info-leaking health banner 🔵

`TDK-1405-NNNN` is enumerable; `GET /health` returns the service name (`app.module.ts:20`).
**Remediation.** Minor — avoid sequential public identifiers; keep health output generic.

### L-5 — Cross-reference pollution on ticket creation 🔵

`create` does not validate/authorize `employerId`/`productId` (`app.module.ts:52-55`); a customer can attach a ticket to any existing employer/product.
**Remediation.** Validate references against what the user is permitted to use.

---

## 4. Tested and NOT vulnerable

The following were specifically checked and found clean:

- **SQL injection** — all access goes through Prisma's parameterized query builder; no `$queryRawUnsafe`/`$executeRawUnsafe`.
- **Prisma operator / NoSQL-style injection & mass assignment** — the request body is never spread into a `where`/`data` object; fields are explicitly picked.
- **Prototype pollution** — no server-side merge/`Object.assign` of user input.
- **XSS** — Angular interpolation auto-escapes; no `innerHTML`/`bypassSecurityTrust`/`eval` in the frontend.
- **SSRF / path traversal / file upload / ReDoS** — no outbound requests, no filesystem access from handlers, no file handling, no user-input regex (TFS adapter is a local fake).
- **Committed secrets** — none tracked; the `*_SECRET` references in `packages/config` are zod schema definitions, unused by the prototype API.

---

## 5. End-to-end attack chain (anonymous, ~1 minute)

1. `GET /demo/accounts` → enumerate every user + role + id (the id is the credential). *(C-2)*
2. `GET /tickets?userId=<manager>` → exfiltrate all tickets, messages, and customer PII. *(C-3)*
3. `POST /tickets/<id>/actions` with `userId=<any-employee>` → forge messages/state changes as that employee; `CONFIRM` to mass-close. *(H-2, H-3, M-3)*
4. Repeat at scale — no rate limiting, no trustworthy logging. *(M-2, M-5)*

---

## 6. Prioritized remediation roadmap

| Priority | Action | Addresses |
|---|---|---|
| **P0 — now** | Remove the prototype from open internet access, or place behind VPN/IP allow-list/HTTP auth | C-1, C-2, C-3 (immediate mitigation) |
| **P1** | Implement server-verified authentication (hashed passwords or AD) issuing signed sessions; derive user/role server-side; delete the `userId` parameter; remove `/demo/*` | C-1, C-2, H-2, H-3 |
| **P1** | Rewrite `assertVisible` as allow-list + ownership/assignment checks; replace the `else {}` filter fallback with explicit deny | C-3, H-1 |
| **P2** | Add global `ValidationPipe`, `helmet()`, `@nestjs/throttler`, body-size limits, and pagination | M-1, M-2, M-5 |
| **P2** | Enforce per-transition source-state allow-lists | M-3 |
| **P3** | Transactional/`cuid()` tracking numbers; non-root container; un-commit `dev.db`; tighten CORS | M-4, L-1, L-2, L-3 |

---

*This assessment is based on the source as of 2026-06-29 and reasoning about the deployed behavior. Live confirmation of each PoC should be performed by the owner from a network with reachability to the host.*
