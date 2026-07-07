# Product specification

## Purpose

The system improves organizational response processes and customer support quality across Tadkar departments, especially sales, support, and software testing for Tadkar Windows and Shahab Web.

## Users

### Customer

- registers or logs in;
- may be related to multiple contracting employers and positions;
- selects employer, product, and destination department;
- reviews FAQ content;
- creates tickets;
- follows conversation history;
- confirms whether the answer solved the problem;
- rates completed handling.

### Company expert

- authenticates through Active Directory in production;
- belongs to one or more department/product scopes;
- sees only tickets within authorized scopes;
- opens, responds to, transfers, and resolves tickets;
- support experts may refer suspected bugs to software test;
- test experts may confirm development need and record PBI/fixed-version data.

### Manager

- sees all tickets and performance reports within assigned scope;
- monitors response behavior and department performance.

### System administrator

A technical role for user mapping, master data, working hours, FAQ, categories, and integration settings.

## Products

- Tadkar Windows
- Shahab Web

## Departments

- Sales
- Support
- Software Test

Customers may create tickets only for Sales or Support. Software Test is reached through internal referral.

## Customer profile

Suggested fields:

- full name;
- national identifier;
- residence;
- phone;
- email;
- username;
- password for local customer login.

A customer may have multiple relationships containing:

- employer;
- position;
- contracted product.

## Ticket creation

1. Customer chooses employer and contracted product.
2. Customer chooses Sales or Support.
3. System displays related FAQ questions.
4. If an FAQ solves the issue, usage is recorded.
5. Otherwise the customer writes a question and creates a ticket.
6. System assigns a unique tracking number.
7. System routes the ticket to the selected department/product scope.
8. System displays success and, when relevant, an out-of-working-hours notice.

## Ticket data

- tracking number;
- customer;
- employer/contract relation;
- product;
- department;
- current assignee;
- current status;
- creation/opening/response/closure times;
- complete message history;
- assignment and transfer history;
- status history;
- root-cause category;
- rating;
- optional TFS/PBI data;
- probable fixed version.

## Normal support flow

- ticket starts as new;
- expert opens it;
- expert responds;
- customer either confirms resolution or continues the conversation;
- process repeats until resolved.

## Test-team escalation

- customer cannot directly contact Software Test;
- support expert refers a suspected software bug;
- test expert validates the issue;
- test expert may request additional information from the customer;
- if development is not required, the ticket returns to Support;
- if development is required, the test expert records:
  - PBI identifier;
  - probable fixed version;
- ticket closes as requiring development.

## Categorization

Resolved support questions that do not require test-team escalation should receive a configurable root-cause category.

Initial examples from the source document:

- weak understanding of circulars/regulations;
- weak understanding of the system;
- weak understanding of provider services.

## Reporting

Managers need time-filtered, scope-filtered reports for ticket volume, bug volume, response time, unresolved work, question categories, employers, departments, geography, expert performance, ratings, and recurring questions/problems.
