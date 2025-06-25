SHELL := /bin/bash
.DEFAULT_GOAL := help

GREEN := \033[0;32m
YELLOW := \033[1;33m
RESET := \033[0m

BACKEND_DIR := .
LOGS_DIR := logs

file ?= docker-compose.dev.yml
project ?= air_book
profile ?= dev
services ?=
nc ?= false

name ?= .env

help:
	@echo -e "$(YELLOW)Available commands:$(RESET)\n"
	@echo -e "  $(GREEN)make docs$(RESET)                 - Generate documentation using TypeDoc"
	@echo -e "  $(GREEN)make logs$(RESET)                 - Display application logs"
	@echo -e "  $(GREEN)make clean$(RESET)                - Remove temporary files, caches and logs"
	@echo -e "  $(GREEN)make docker-clean$(RESET)         - Remove all containers, images, volumes, and networks"
	@echo -e "  $(GREEN)make docker-up$(RESET)            - Build and start Docker containers"
	@echo -e "      Example: make docker-up services=\"mysql adminer\""
	@echo -e "      Example: make docker-up services=adminer nc=true profile=dev project=air_book"
	@echo -e "  $(GREEN)make docker-down$(RESET)          - Stop and remove containers/images"
	@echo -e "      Example: make docker-down"
	@echo -e "      Example: make docker-down services=portainer profile=prod"
	@echo -e "  $(GREEN)make git-decrypt$(RESET)          - Decrypt repository using git-crypt and GIT_CRYPT_KEY"

install:
	poetry install

flake8:
	poetry run flake8 $(BACKEND_DIR)

isort:
	poetry run isort $(BACKEND_DIR)

bandit:
	poetry run bandit -r $(BACKEND_DIR)

black:
	poetry run black $(BACKEND_DIR)

mypy:
	poetry run mypy $(BACKEND_DIR)

dev:
	poetry run uvicorn app.main:app --reload

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

git-decrypt:
	@echo "$$GIT_CRYPT_KEY" | base64 -d > git-crypt-key && git-crypt unlock git-crypt-key

.PHONY: help install flake8 isort bandit black mypy dev logs clean docker-clean docker-up docker-down docker-reset git-decrypt
