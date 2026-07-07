# Prototype scope

## Goal

Deliver a manager-ready demonstration of the Tadkar ticketing concept.

The prototype should prove the workflow and user experience. It does not need production integrations or enterprise infrastructure.

## Must-have screens

### Shared

- Persian RTL login page
- role switch/demo-account access
- responsive application shell
- ticket status chips
- seeded navigation

### Customer

- dashboard
- ticket list
- new ticket wizard
- FAQ suggestions
- ticket conversation
- confirm resolution
- customer reply
- rating after closure

### Support expert

- scoped ticket queue
- ticket detail
- open ticket
- reply
- refer to Software Test
- close as resolved
- select root-cause category

### Test expert

- test queue
- request more information
- return to Support
- confirm development required
- enter PBI identifier
- enter probable fixed version

### Manager

- total tickets
- open tickets
- resolved tickets
- development-required tickets
- average first-response time
- tickets by department
- tickets by product
- simple recent-ticket table

## Demo data

Seed:

- 1 customer
- 1 support expert
- 1 test expert
- 1 manager
- 2 employers
- 2 products
- 3 departments
- 6 FAQs
- 3 root-cause categories
- 8–12 tickets covering different states

## Prototype integrations

### Employee authentication

Use local demo accounts behind an `EmployeeAuthAdapter`.

Do not connect to real Active Directory.

### TFS

Use a `TfsAdapter` interface with a fake local implementation.

The fake implementation may generate a demo PBI ID or accept one entered by the test expert.

## Technical simplicity

- SQLite database
- local seed command
- no Docker required
- no external services
- no email or SMS
- no attachments
- no background workers
- no real-time sockets required
- polling or refresh is acceptable

## Definition of done

A manager can watch the complete flow from ticket creation to either:

- resolved by Support; or
- referred to Test and closed as requiring development.

The UI must be coherent, Persian, RTL, and stable during the demo.
