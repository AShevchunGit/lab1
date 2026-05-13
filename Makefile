.PHONY: deps deps-be deps-fe dev-be dev-fe start-be start-fe build lint lint-be lint-fe test migrate revert seed \
        prod prod-build prod-down local

# Install all dependencies
deps: deps-be deps-fe

deps-be:
	cd backend && npm install

deps-fe:
	cd frontend && npm install

# Development servers
dev-be:
	cd backend && npm run dev

dev-fe:
	cd frontend && npm run dev

# Production start (requires build first)
start-be:
	cd backend && npm start

start-fe:
	cd frontend && npm run preview

# Build
build:
	cd frontend && npm run build
	cd backend && npm run build

# Lint
lint: lint-be lint-fe

lint-be:
	cd backend && npm run lint

lint-fe:
	cd frontend && npm run lint

# Tests
test:
	cd backend && npm test

# Database commands
migrate:
	cd backend && npm run migrate

revert:
	cd backend && npm run migrate:revert

seed:
	cd backend && npm run seed

# Docker / production
prod:
	docker compose up -d

prod-build:
	docker compose up -d --build

prod-down:
	docker compose down

# Local dev (backend + frontend in parallel)
local:
	make -j2 dev-be dev-fe
