.PHONY: dev-up dev-down dev-db dev-logs migrate migrate-gen seed test-backend test-frontend install-frontend install-backend install setup

# Start all dev services (DB, Redis, backend, celery)
dev-up:
	docker compose -f docker-compose.dev.yml up -d

dev-down:
	docker compose -f docker-compose.dev.yml down

# Start only DB and Redis (run backend/frontend locally)
dev-db:
	docker compose -f docker-compose.dev.yml up -d db redis

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

# Full stack (production-like)
up:
	docker compose up -d --build

down:
	docker compose down

# Database migrations
migrate:
	cd backend && alembic upgrade head

migrate-gen:
	cd backend && alembic revision --autogenerate -m "$(msg)"

seed:
	cd backend && python -m app.utils.seed

# Testing
test-backend:
	cd backend && python -m pytest tests/ -v

test-frontend:
	cd frontend && npm test

# Installation
install-frontend:
	cd frontend && npm install

install-backend:
	cd backend && pip install -e ".[dev]"

install: install-backend install-frontend

# Setup: install deps, start DB, run migrations
setup: install dev-db
	@echo "Waiting for database to be ready..."
	@sleep 5
	$(MAKE) migrate

# Code quality
lint:
	cd frontend && npm run lint
	cd backend && ruff check .

format:
	cd frontend && npm run format
	cd backend && ruff format .
