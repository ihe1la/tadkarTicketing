# Database design

## Core entities

### users

- id
- role
- username
- email
- phone
- status
- created_at
- updated_at

### customer_profiles

- user_id
- full_name
- national_id
- residence
- normalized_geographic_area

### employee_profiles

- user_id
- directory_subject
- display_name
- employee_code
- is_manager

### products

- id
- code
- title
- active

Seed:

- `TADKAR_WINDOWS`
- `SHAHAB_WEB`

### departments

- id
- code
- title
- active

Seed:

- `SALES`
- `SUPPORT`
- `SOFTWARE_TEST`

### employee_scopes

- employee_user_id
- product_id
- department_id
- scope_role: expert or manager

### employers

- id
- title
- geographic_area
- active

### customer_contracts

- id
- customer_user_id
- employer_id
- product_id
- position_title
- active

### faqs

- id
- product_id
- department_id
- question
- answer
- sort_order
- active
- usage_count

### tickets

- id
- tracking_number
- customer_user_id
- customer_contract_id
- product_id
- origin_department_id
- current_department_id
- current_assignee_user_id
- status
- subject
- created_at
- opened_at
- first_response_at
- closed_at
- root_cause_category_id
- customer_rating
- pbi_identifier
- probable_fixed_version
- optimistic_version

### ticket_messages

- id
- ticket_id
- author_user_id
- author_role
- body
- created_at

### ticket_status_history

- id
- ticket_id
- from_status
- to_status
- actor_user_id
- reason
- created_at

### ticket_assignment_history

- id
- ticket_id
- from_department_id
- to_department_id
- from_assignee_user_id
- to_assignee_user_id
- actor_user_id
- created_at

### root_cause_categories

- id
- code
- title
- active
- sort_order

### working_hours

- id
- weekday
- start_time
- end_time
- active

### holidays

- id
- date
- title

### audit_logs

- id
- actor_user_id
- action
- resource_type
- resource_id
- metadata
- correlation_id
- created_at

## Important constraints

- tracking number is unique;
- national identifier is encrypted or otherwise protected where appropriate;
- customer contracts are unique per customer/employer/product/position combination;
- employee scopes are unique per employee/product/department;
- PBI and probable version are required by service validation before development closure;
- ticket transitions use optimistic concurrency;
- history rows are append-only.
