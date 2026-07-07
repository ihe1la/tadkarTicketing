# Ticket state machine

Use one internal state model. Render different Persian labels for customer and expert dashboards.

## Internal states

| State | Meaning |
|---|---|
| `NEW` | Created and not yet opened by an expert |
| `IN_REVIEW` | Opened by an expert and being investigated |
| `AWAITING_CUSTOMER` | Expert/test expert replied and waits for customer |
| `AWAITING_EXPERT` | Customer replied and waits for expert |
| `REFERRED_TO_TEST` | Support transferred the ticket to software test |
| `TEST_IN_REVIEW` | Opened by a test expert |
| `RETURNED_TO_SUPPORT` | Test decided development is not required |
| `CLOSED_RESOLVED` | Customer confirmed resolution |
| `CLOSED_REQUIRES_DEVELOPMENT` | Test confirmed development requirement and PBI/version data exists |

## Main transitions

- `NEW -> IN_REVIEW`: authorized expert opens ticket.
- `IN_REVIEW -> AWAITING_CUSTOMER`: expert replies.
- `AWAITING_CUSTOMER -> CLOSED_RESOLVED`: customer confirms solution.
- `AWAITING_CUSTOMER -> AWAITING_EXPERT`: customer continues conversation.
- `AWAITING_EXPERT -> AWAITING_CUSTOMER`: expert replies again.
- `IN_REVIEW|AWAITING_EXPERT -> REFERRED_TO_TEST`: support expert refers suspected bug.
- `REFERRED_TO_TEST -> TEST_IN_REVIEW`: authorized test expert opens it.
- `TEST_IN_REVIEW -> AWAITING_CUSTOMER`: test expert requests more information.
- `AWAITING_EXPERT -> TEST_IN_REVIEW`: customer response returns to current test expert.
- `TEST_IN_REVIEW -> RETURNED_TO_SUPPORT`: development not required.
- `RETURNED_TO_SUPPORT -> IN_REVIEW`: support resumes handling.
- `TEST_IN_REVIEW -> CLOSED_REQUIRES_DEVELOPMENT`: development required and PBI/fixed-version fields are valid.

## Invariants

- Customer cannot trigger referral to test.
- Sales expert cannot trigger referral to test unless explicitly granted support permission.
- `CLOSED_REQUIRES_DEVELOPMENT` requires:
  - PBI identifier;
  - probable fixed version.
- Closed states cannot accept new messages unless reopened through an explicit audited administrative action.
- Every transition writes a status-history event.
- Assignment and department transfers write separate history events.

## Role-specific labels

Customer example labels:

- `NEW`: جدید
- `IN_REVIEW`: در حال بررسی
- `AWAITING_CUSTOMER`: پاسخ داده شده
- `AWAITING_EXPERT`: پاسخ کاربر
- `REFERRED_TO_TEST|TEST_IN_REVIEW`: ارجاع به تیم تست نرم‌افزار
- `CLOSED_RESOLVED`: خاتمه یافته ـ حل شده
- `CLOSED_REQUIRES_DEVELOPMENT`: خاتمه یافته ـ نیازمند توسعه

Expert example labels:

- `NEW`: جدید
- `IN_REVIEW|AWAITING_EXPERT`: در انتظار پاسخ کارشناس
- `AWAITING_CUSTOMER`: پاسخ به کاربر
- `REFERRED_TO_TEST`: ارجاع به تیم تست نرم‌افزار
- `TEST_IN_REVIEW`: در انتظار بررسی تست
- `CLOSED_REQUIRES_DEVELOPMENT`: تأیید جهت توسعه
- `CLOSED_RESOLVED`: خاتمه یافته
