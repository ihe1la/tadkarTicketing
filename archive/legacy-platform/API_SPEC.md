# API structure

Use versioned REST endpoints under `/api/v1`.

## Authentication

- `POST /auth/customer/register`
- `POST /auth/customer/login`
- `POST /auth/employee/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Master data

- `GET /products`
- `GET /departments`
- `GET /employers`
- `GET /customer-contracts`
- administrative CRUD under `/admin/*`

## FAQ

- `GET /faqs?productId=&departmentId=`
- `POST /faqs/:id/use`
- administrative CRUD under `/admin/faqs`

## Customer tickets

- `GET /tickets`
- `POST /tickets`
- `GET /tickets/:id`
- `POST /tickets/:id/messages`
- `POST /tickets/:id/confirm-resolution`
- `POST /tickets/:id/rating`

## Expert operations

- `GET /expert/tickets`
- `POST /expert/tickets/:id/open`
- `POST /expert/tickets/:id/reply`
- `POST /expert/tickets/:id/assign`
- `POST /expert/tickets/:id/transfer`
- `POST /expert/tickets/:id/refer-to-test`
- `POST /expert/tickets/:id/return-to-support`
- `POST /expert/tickets/:id/close-resolved`
- `POST /expert/tickets/:id/close-development-required`

## Reports

- `GET /reports/overview`
- `GET /reports/response-times`
- `GET /reports/categories`
- `GET /reports/employers`
- `GET /reports/departments`
- `GET /reports/geography`
- `GET /reports/experts`
- `GET /reports/recurring-questions`
- `GET /reports/export.csv`

Every report accepts authorized combinations of:

- `from`
- `to`
- `productId`
- `departmentId`
- `employerId`
- `expertId`
- `geographicArea`

## Contract rules

- validate requests and responses;
- paginate list endpoints;
- enforce authorization in services, not only controllers;
- use idempotency or optimistic concurrency for status-changing operations;
- return stable error codes;
- never expose directory credentials or integration secrets.
