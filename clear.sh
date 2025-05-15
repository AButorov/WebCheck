#!/bin/bash

# Делаем скрипт исполняемым
chmod +x ./clear.sh

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Очистка временных и ненужных файлов...${NC}"

# Временные файлы VSCode
find . -name ".vscode" -type d -exec rm -rf {} +
find . -name "*.code-workspace" -type f -delete

# Временные файлы Node.js
rm -rf node_modules/.cache
rm -rf .output
rm -rf dist

# Временные файлы Mac
find . -name ".DS_Store" -type f -delete
find . -name "._*" -type f -delete

# Временные файлы тестов
rm -rf coverage
rm -rf .nyc_output

# Очистка логов
find . -name "*.log" -type f -delete
find . -name "npm-debug.log*" -type f -delete
find . -name "yarn-debug.log*" -type f -delete
find . -name "yarn-error.log*" -type f -delete

# Очистка кэша
rm -rf .eslintcache
rm -rf .stylelintcache
[ -d "node_modules/.vite" ] && rm -rf node_modules/.vite

# Удаление резервных файлов
find . -name "*.bak" -type f -delete
find . -name "*~" -type f -delete

echo -e "${GREEN}Очистка завершена успешно!${NC}"
