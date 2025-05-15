#!/bin/bash

# Скрипт для очистки временных файлов проекта WebCheck
# Последнее обновление: 16.05.2025 19:30

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}         Web Check - Очистка временных файлов                   ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Очистка сгенерированных файлов и директорий
echo -e "\n${CYAN}Очистка сгенерированных файлов и директорий...${NC}"

# Очистка директории dist
if [ -d "dist" ]; then
    echo -e "${YELLOW}Удаление директории dist/...${NC}"
    rm -rf dist
    echo -e "${GREEN}✓ Директория dist/ удалена${NC}"
else
    echo -e "${GREEN}✓ Директория dist/ не существует${NC}"
fi

# Очистка кэша сборщика
if [ -d ".vite" ]; then
    echo -e "${YELLOW}Удаление директории .vite/...${NC}"
    rm -rf .vite
    echo -e "${GREEN}✓ Директория .vite/ удалена${NC}"
else
    echo -e "${GREEN}✓ Директория .vite/ не существует${NC}"
fi

if [ -d "node_modules/.vite" ]; then
    echo -e "${YELLOW}Удаление директории node_modules/.vite/...${NC}"
    rm -rf node_modules/.vite
    echo -e "${GREEN}✓ Директория node_modules/.vite/ удалена${NC}"
else
    echo -e "${GREEN}✓ Директория node_modules/.vite/ не существует${NC}"
fi

# Очистка автоматически сгенерированных деклараций типов
echo -e "\n${CYAN}Очистка автоматически сгенерированных деклараций типов...${NC}"

GENERATED_FILES=(
    "src/auto-imports.d.ts"
    "src/components.d.ts"
)

for file in "${GENERATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Удаление файла $file...${NC}"
        rm -f "$file"
        echo -e "${GREEN}✓ Файл $file удален${NC}"
    else
        echo -e "${GREEN}✓ Файл $file не существует${NC}"
    fi
done

# Очистка временных файлов macOS
echo -e "\n${CYAN}Очистка временных файлов macOS...${NC}"
found_macos_files=$(find . -name ".DS_Store" | wc -l)

if [ "$found_macos_files" -gt 0 ]; then
    echo -e "${YELLOW}Найдено файлов .DS_Store: $found_macos_files${NC}"
    find . -name ".DS_Store" -delete
    echo -e "${GREEN}✓ Все файлы .DS_Store удалены${NC}"
else
    echo -e "${GREEN}✓ Файлы .DS_Store не найдены${NC}"
fi

# Очистка логов
echo -e "\n${CYAN}Очистка логов...${NC}"
if [ -d "logs" ]; then
    echo -e "${YELLOW}Удаление директории logs/...${NC}"
    rm -rf logs
    echo -e "${GREEN}✓ Директория logs/ удалена${NC}"
else
    echo -e "${GREEN}✓ Директория logs/ не существует${NC}"
fi

# Очистка архивов расширения
echo -e "\n${CYAN}Очистка архивов расширения...${NC}"
ZIP_FILES=$(find . -maxdepth 1 -name "web-check-v*.zip" | wc -l)

if [ "$ZIP_FILES" -gt 0 ]; then
    echo -e "${YELLOW}Найдено ZIP-архивов: $ZIP_FILES${NC}"
    
    # Спрашиваем пользователя
    read -p "Удалить все ZIP-архивы расширения? (y/n): " -n 1 -r
    echo    # перевод строки
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find . -maxdepth 1 -name "web-check-v*.zip" -delete
        echo -e "${GREEN}✓ Все ZIP-архивы удалены${NC}"
    else
        echo -e "${YELLOW}ZIP-архивы сохранены${NC}"
    fi
else
    echo -e "${GREEN}✓ ZIP-архивы не найдены${NC}"
fi

# Дополнительная очистка
echo -e "\n${CYAN}Дополнительная очистка...${NC}"

# Очистка кэша npm/pnpm по желанию
read -p "Очистить кэш npm/pnpm? (y/n): " -n 1 -r npm_clean
echo    # перевод строки

if [[ $npm_clean =~ ^[Yy]$ ]]; then
    if command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}Очистка кэша pnpm...${NC}"
        pnpm store prune
        echo -e "${GREEN}✓ Кэш pnpm очищен${NC}"
    else
        echo -e "${YELLOW}Очистка кэша npm...${NC}"
        npm cache clean --force
        echo -e "${GREEN}✓ Кэш npm очищен${NC}"
    fi
else
    echo -e "${YELLOW}Кэш npm/pnpm сохранен${NC}"
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Очистка успешно завершена!${NC}"
echo -e "${BLUE}================================================================${NC}"
