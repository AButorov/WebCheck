#!/bin/zsh
set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

print -P "${YELLOW}Очистка временных и ненужных файлов...${NC}"

# Временные файлы VSCode
find . -name ".vscode" -type d -exec rm -rf {} +
find . -name "*.code-workspace" -type f -delete

# Временные файлы Node.js
rm -rf node_modules/.cache .output dist

# Временные файлы Mac
find . \( -name ".DS_Store" -o -name "._*" \) -type f -delete

# Временные файлы тестов
rm -rf coverage .nyc_output

# Очистка логов
find . \( -name "*.log" -o -name "npm-debug.log*" -o -name "yarn-*.log*" \) -type f -delete

# Очистка кэша
rm -rf .eslintcache .stylelintcache
[[ -d "node_modules/.vite" ]] && rm -rf node_modules/.vite

# Удаление резервных файлов
find . \( -name "*.bak" -o -name "*~" \) -type f -delete

print -P "${GREEN}✓ Очистка завершена успешно!${NC}"
