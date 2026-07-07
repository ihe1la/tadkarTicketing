# Reporting requirements

## Required metrics

- registered bug count;
- resolved bug count;
- average response time per expert;
- unanswered ticket count;
- in-review ticket count;
- question count by root-cause category;
- ticket count by employer;
- ticket count by department;
- ticket count by geographic area;
- answered ticket count per expert;
- average customer rating per expert;
- average time from bug report to resolution/fixed-version notice;
- ticket count for selected customer groups;
- recurring questions;
- recurring customer problems.

## Filters

- date range;
- product;
- department;
- employer;
- geographic area;
- expert;
- ticket outcome.

## Rules

- manager scope is mandatory;
- no arbitrary SQL;
- aggregate queries must be tested against seeded datasets;
- recurring-question detection may begin with normalized subject/category counts;
- advanced NLP clustering is out of scope for MVP.
