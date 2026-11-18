# Permission matrix
Source of truth: `src/access/roles.ts` (+ transition hook in `src/fields/workflow.ts`). Enforced server-side on REST,
admin UI and Local API. Tested in `tests/int/permissions.int.spec.ts` and `tests/e2e/api.e2e.spec.ts`.

Domains: **editorial** (services, notices, events, seasonal features, project updates), **records** (meetings,
legislation, votes), **data** (projects, budget datasets/lines, places, imports).

| Capability | Contributor | Dept. reviewer | Publisher | Records clerk | Data manager | Administrator |
|---|---|---|---|---|---|---|
| Create/edit editorial drafts | own depts | own depts | all | – | – | all |
| Submit draft → in review | own depts | own depts | ✓ | – | – | ✓ |
| Approve / return (editorial) | – | own depts | ✓ | – | – | ✓ |
| Schedule / publish / archive (editorial) | – | – | ✓ | – | – | ✓ |
| Edit published content | – | – | ✓ | records | data | ✓ |
| Meetings, legislation, votes (full lifecycle) | – | – | publish only | ✓ | – | ✓ |
| Projects, budget datasets, places (full lifecycle) | – | – | publish only | – | ✓ | ✓ |
| Budget lines, CSV imports | – | – | – | – | ✓ | ✓ |
| Emergency publish (skip review) | only if `canEmergencyPublish` | same | same | same | same | ✓ |
| Read drafts | own depts | own depts | all | records: all | data: all | all |
| Resident requests (read) | ✓ (staff) | ✓ update | ✓ update | ✓ | ✓ | ✓ |
| Audit events (read) | – | – | ✓ | ✓ | – | ✓ |
| Subscriptions / outbox / jobs (read) | – | – | – | – | – | ✓ |
| Users, roles, departments assignment | – | – | – | – | – | ✓ |
| Write audit events / outbox directly | nobody | nobody | nobody | nobody | nobody | nobody |

Anonymous visitors: read published, unexpired content only; never service requests, subscriptions, outbox, audit, users
or import batches. Service requests and subscriptions are created only via validated, rate-limited server actions.
Users cannot change their own roles, departments or emergency flag (field-level access).
