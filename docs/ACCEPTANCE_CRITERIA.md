# Prototype acceptance criteria

## Startup

- dependencies install without external infrastructure;
- SQLite database seeds locally;
- frontend and API start with documented commands.

## Demo accounts

- customer login works;
- support-expert login works;
- test-expert login works;
- manager login works.

## Customer flow

- customer sees FAQs before ticket creation;
- customer cannot select Software Test directly;
- customer creates a ticket and receives a tracking number;
- customer can reply;
- customer can confirm resolution;
- customer can rate a closed ticket.

## Support flow

- support sees scoped tickets;
- support can open and reply;
- support can close as resolved;
- support can refer a suspected bug to Test.

## Test flow

- test sees referred tickets;
- test can request more information;
- test can return to Support;
- test can confirm development;
- development confirmation requires PBI and probable fixed version.

## Manager flow

- manager sees totals and simple charts/tables;
- dashboard data matches seeded tickets.

## Presentation quality

- Persian RTL layout is consistent;
- no dead buttons;
- no obvious console errors;
- loading and empty states are handled;
- demo can be reset quickly.
