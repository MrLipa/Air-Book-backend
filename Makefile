SHELL := /bin/bash
.DEFAULT_GOAL := help

GREEN := \033[0;32m
YELLOW := \033[1;33m
RESET := \033[0m

BACKEND_DIR := .
LOGS_DIR := logs
DOCKER_IMAGE := my-node-app

file ?= docker-compose.yml
project ?= air_book
profile ?= dev
services ?=
nc ?= false

name ?= .env

help:
	@echo -e "$(YELLOW)Available commands:$(RESET)"
	@echo -e "  $(GREEN)make install$(RESET)              - Install backend dependencies"
	@echo -e "  $(GREEN)make audit-fix$(RESET)            - Force fix vulnerabilities (npm audit fix --force)"
	@echo -e "  $(GREEN)make start$(RESET)                - Start backend (production mode)"
	@echo -e "  $(GREEN)make dev$(RESET)                  - Start backend (development mode)"
	@echo -e "  $(GREEN)make test-unit$(RESET)            - Run unit tests"
	@echo -e "  $(GREEN)make test-integration$(RESET)         - Run integration tests (mocha)"
	@echo -e "  $(GREEN)make test-performance$(RESET)     - Run performance tests (k6)"
	@echo -e "  $(GREEN)make lint$(RESET)                 - Lint code"
	@echo -e "  $(GREEN)make lint-fix$(RESET)             - Lint code and auto-fix issues"
	@echo -e "  $(GREEN)make format$(RESET)               - Format code using Prettier"
	@echo -e "  $(GREEN)make docs$(RESET)                 - Generate documentation using TypeDoc"
	@echo -e "  $(GREEN)make logs$(RESET)                 - Display application logs"
	@echo -e "  $(GREEN)make clean$(RESET)                - Remove temporary files, caches and logs"
	@echo -e "  $(GREEN)make docker-clean$(RESET)         - Remove all containers, images, volumes, and networks"
	@echo -e "  $(GREEN)make docker-up$(RESET)            - Build and start Docker containers"
	@echo -e "       Example: make docker-up services=\"mysql adminer\""
	@echo -e "       Example: make docker-up services=adminer nc=true profile=dev project=air_book"
	@echo -e "  $(GREEN)make docker-down$(RESET)          - Stop and remove containers/images"
	@echo -e "       Example: make docker-down"
	@echo -e "       Example: make docker-down services=portainer profile=prod"
	@echo -e ""
	@echo -e "$(YELLOW)Env file encryption:$(RESET)"
	@echo -e "  $(GREEN)make encrypt-env name=.env$(RESET)        - Encrypt .env to .env.gpg"
	@echo -e "  $(GREEN)make decrypt-env name=.env$(RESET)        - Decrypt .env.gpg to .env"

decrypt:
	echo "$$GIT_CRYPT_KEY" | base64 -d > git-crypt-key && git-crypt unlock git-crypt-key

install:
	npm install

audit-fix:
	npm audit fix --force

start:
	npm run start

dev:
	npm run dev

test-unit:
	npm run test:unit

test-integration:
	npm run test:integration

test-k6:
	docker compose -f docker-compose.yml --project-name air_book run --rm k6 run /scripts/test.js

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

docs:
	npm run docs

logs:
	tail -f $(LOGS_DIR)/*.log

clean:
	git clean -fdx

docker-clean:
	-docker rm -f $$(docker ps -aq) 2>/dev/null || true
	-docker rmi -f $$(docker images -q) 2>/dev/null || true
	-docker volume prune -f
	-docker network prune -f

docker-up:
	@if [ "$(nc)" = "true" ]; then \
		COMPOSE_BAKE=true docker compose -f $(file) --project-name $(project) --profile $(profile) build --no-cache $(services); \
	else \
		docker compose -f $(file) --project-name $(project) --profile $(profile) build $(services); \
	fi; \
	docker compose -f $(file) --project-name $(project) --profile $(profile) up -d $(services)

docker-reset:
	@docker compose -f $(file) --project-name $(project) --profile $(profile) stop $(services)
	@docker compose -f $(file) --project-name $(project) --profile $(profile) rm -fsv $(services)
	@IMAGES=$$(docker compose -f $(file) --project-name $(project) --profile $(profile) images -q $(services) | grep -v "^$$"); \
	if [ -n "$$IMAGES" ]; then docker rmi $$IMAGES; fi
	@docker volume prune -f
	@if [ "$(nc)" = "true" ]; then \
		COMPOSE_BAKE=true docker compose -f $(file) --project-name $(project) --profile $(profile) build --no-cache $(services); \
	else \
		docker compose -f $(file) --project-name $(project) --profile $(profile) build $(services); \
	fi
	@docker compose -f $(file) --project-name $(project) --profile $(profile) up -d $(services)

docker-down:
	@docker compose -f $(file) --project-name $(project) --profile $(profile) stop $(services)
	@docker compose -f $(file) --project-name $(project) --profile $(profile) rm -fsv $(services)
	@IMAGES=$$(docker compose -f $(file) --project-name $(project) --profile $(profile) images -q $(services) | grep -v "^$$"); \
	if [ -n "$$IMAGES" ]; then docker rmi $$IMAGES; fi

.PHONY: help install audit-fix start dev test-unit test-integra test-performance lint lint-fix format docs clean logs encrypt-env decrypt-env docker-clean docker-up docker-down
