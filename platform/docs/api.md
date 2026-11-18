# API contracts and data dictionaries
## Public HTTP routes (no auth)
| Route | Output | Notes |
|---|---|---|
| `GET /data/budget.csv?year&basis&kind&fund&department&category` | CSV | Same filters and rows as `/transparency/budget`. Columns: fiscal_year, basis, dataset_kind, direction, fund, department, category, account, description, amount_usd (blank = not available), verification, source. Formula-injection safe. |
| `GET /data/calendar.ics` | iCalendar | Published meetings + events, next 365 days; demo items prefixed `[SAMPLE]`. |
| `GET /data/health` | JSON | `{status, db, worker{lastJobCompletedAt,fresh}, outbox{failed,stalePending}}`; 503 when degraded. |
| `GET /lang?to=es|en&next=/path` | 303 | Sets language cookie; local `next` only. |
| `GET /<old path>` | 301/308/302/404 | Redirect matrix. |

## Server actions (progressively enhanced forms; Next.js origin check = CSRF protection)
| Action | Input (validated with zod) | Result | Rate limit |
|---|---|---|---|
| `findWard` | address ≤200 chars | ok / ambiguous / outside / unavailable / illustrative | 20 per 10 min per hashed client |
| `concernAction` | category, description 10–4000, locationText, optional contact; honeypot | reference `OR-YYYYMMDD-XXXXXX` | `RATE_LIMIT_CONCERNS_PER_HOUR` (5) |
| `subscribeAction` | email, topicType notices/meetings/project, topicId | always generic success (no enumeration) | `RATE_LIMIT_SUBSCRIBE_PER_HOUR` (10) |
Confirmation/unsubscribe links: `/subscribe/confirm|unsubscribe?id&t` with HMAC-SHA256 tokens.

## Payload REST (`/api/<collection>`)
Standard Payload REST. Access rules in `docs/permission-matrix.md` apply to every request; anonymous reads return only
published, unexpired docs. GraphQL is disabled. Errors use Payload's `{errors:[{message}]}` shape with 400/401/403/404.
Pagination: `limit` (public page code caps at 500), `page`.

## Data dictionaries
- **Budget:** see `/transparency/budget/datasets` (rendered) and `src/collections/data.ts`. Amounts are integer cents in
  `numeric` columns; `null` ≠ 0.
- **Legislation actions:** introduced, referred, public_hearing, amended, second_reading, adopted, defeated, tabled,
  deferred, withdrawn, vetoed, veto_overridden, effective. `currentStatus` is derived from the latest dated action.
- **Votes:** entries `{member, official?, vote: yes|no|abstain|absent|recused}`; `result` is as recorded, not computed.
- **Projects:** phases planned → design → bidding → awarded → construction → substantially_complete → closed_out
  (+ on_hold, cancelled); milestones kinds approval, funding, scheduled, construction_start, substantial_completion, closeout.
- **civic.search_documents:** collection, doc_id, title, identifier, body, url, content_type, department, ward, doc_date, is_demo.
