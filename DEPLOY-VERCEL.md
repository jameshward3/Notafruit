# Hosted review deployment (Vercel + Supabase)

Prototype review copy only — not the official City website. One Vercel project, three services (see `vercel.json`):

| Service | Root | Public path | Notes |
|---|---|---|---|
| `web` | `platform/` (Next.js + Payload) | `/` (everything else) | Whole site behind `SITE_PASSWORD` (in-site password page, `/review-login`). |
| `clerkos-web` | `frontend/` (Vite) | `/clerkos` | Built with `CLERKOS_BASE_PATH=/clerkos/`; deep links fall back to `index.html`. |
| `clerkos-api` | `backend/` (Django) | `/clerkos/api/*` | Mounted via `CLERKOS_URL_PREFIX=clerkos`. Django admin is not routed (internal). |

No bindings: no service calls another server-side.

## Domain
Custom domain `www.notafruit.com` (primary; `notafruit.com` redirects to it with a 308). DNS is managed at Squarespace with two custom records: `A @ 216.198.79.1` and `CNAME www <project-specific>.vercel-dns-017.com` (copy the exact target from Vercel → Domains). The Squarespace Defaults DNS preset must stay removed; it points the domain back at Squarespace.

## Environment variables (Vercel → Project → Settings → Environment Variables, Production)
Set values in the Vercel dashboard. Never commit them. Variables are shared by all services.

**Website (`web`)**
- `DATABASE_URL` — Supabase **transaction pooler** connection string (port 6543).
- `PAYLOAD_SECRET` — new random value, 32+ characters.
- `PUBLIC_SITE_URL` — `https://www.notafruit.com` (Config type, not Secret)
- `SITE_PASSWORD` — review password for the whole site.
- `AUTH_MODE=local`
- `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — Supabase Storage S3 credentials (bucket for media).
- `MAIL_TRANSPORT=capture`, `MAIL_CAPTURE_DIR=/tmp/mail-capture` — no email is sent from the review copy.
- `PRIVATE_UPLOAD_DIR=/tmp/private-uploads`

**ClerkOS (`clerkos-web`, `clerkos-api`)**
- `CLERKOS_BASE_PATH=/clerkos/`, `CLERKOS_URL_PREFIX=clerkos`
- `CLERKOS_SECRET_KEY` — new random value.
- `CLERKOS_ALLOWED_HOSTS=.vercel.app,.notafruit.com,notafruit.com`, `CLERKOS_CSRF_TRUSTED_ORIGINS` — every origin the site is served from (`https://www.notafruit.com,https://notafruit.com` plus the `*.vercel.app` domains)
- `CLERKOS_SEED_PASSWORD` — new password for seeded ClerkOS demo users (they must change it at first sign-in).
- `CLERKOS_CELERY_EAGER=1` (no Redis/Celery workers), `CLERKOS_CONN_MAX_AGE=0`, `CLERKOS_DOCUMENT_ROOT=/tmp/clerkos-documents`
- `POSTGRES_HOST`, `POSTGRES_PORT=5432`, `POSTGRES_DB=postgres`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — Supabase **session pooler**.
- `POSTGRES_SSLMODE=require`, `POSTGRES_SCHEMA=clerkos`

## Known limits of the review copy
- No background worker: scheduled publishing, email outbox and search re-indexing do not run.
- ClerkOS document uploads are not kept (temporary disk); Celery tasks run inline; scheduled ClerkOS jobs do not run.
- ClerkOS is designed for on-premise use (docs/09-deployment-guide.md); this hosted copy is for demonstration with demo data only.
- Basemap tiles come from OpenStreetMap's public servers (light review use only).
