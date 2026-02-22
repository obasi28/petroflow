.PHONY: dev-up dev-down migrate seed test-backend test-frontend install-frontend install-backend

dev-up:
	docker compose -f docker-compose.dev.yml up -d

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && python -m app.utils.seed

test-backend:
	cd backend && python -m pytest tests/ -v

test-frontend:
	cd frontend && npm test

install-frontend:
	cd frontend && npm install

install-backend:
	cd backend && pip install -e ".[dev]"

lint:
	cd frontend && npm run lint
	cd backend && ruff check .

format:
	cd frontend && npm run format
	cd backend && ruff format .
