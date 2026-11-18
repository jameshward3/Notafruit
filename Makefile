# ClerkOS developer & operator shortcuts.

.PHONY: up down logs seed demo test backend-dev frontend-dev certs backup verify-audit

up:            ## Build and start the full stack
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100 backend nginx worker

seed:          ## Seed roles/permissions/users (idempotent)
	docker compose exec backend python manage.py seed

demo:          ## Seed with sample municipal data
	docker compose exec backend python manage.py seed --demo-data

test:          ## Run the backend test suite locally (SQLite, no services needed)
	cd backend && CLERKOS_DB=sqlite python3 manage.py test

backend-dev:   ## Local dev API on :8000 (SQLite)
	cd backend && CLERKOS_DB=sqlite CLERKOS_DEBUG=1 python3 manage.py migrate && \
	CLERKOS_DB=sqlite CLERKOS_DEBUG=1 python3 manage.py seed --demo-data && \
	CLERKOS_DB=sqlite CLERKOS_DEBUG=1 python3 manage.py runserver 0.0.0.0:8000

frontend-dev:  ## Vite dev server on :5173 (proxies /api to :8000)
	cd frontend && npm install && npm run dev

certs:         ## Generate a self-signed TLS certificate for clerkos.local
	bash deploy/scripts/generate-certs.sh

backup:        ## Full off-machine backup (db + documents + checksums)
	bash deploy/scripts/backup.sh

verify-audit:  ## Verify the tamper-evident audit chain
	docker compose exec backend python manage.py verify_audit_chain
