#!/bin/bash

# Скрипт для установки зависимостей

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Установка зависимостей Web Check ===${NC}"

# Проверка версии Node.js
NODE_VERSION=$(node -v)
NODE_VERSION_REQUIRED="v20.0.0"

if [[ $NODE_VERSION < $NODE_VERSION_REQUIRED ]]; then
    echo -e "${RED}Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION${NC}"
    exit 1
fi

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Не найден менеджер пакетов pnpm. Установите pnpm: npm install -g pnpm${NC}"
    exit 1
fi

# Установка основных зависимостей
echo -e "${YELLOW}Установка основных зависимостей...${NC}"
pnpm install

# Установка опциональных зависимостей для Vite
echo -e "${YELLOW}Установка Terser для минификации...${NC}"
pnpm add -D terser

echo -e "${GREEN}Зависимости успешно установлены!${NC}"
