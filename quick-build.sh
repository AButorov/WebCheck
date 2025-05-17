#!/bin/bash

# Quick Build and Install Script for Web Check

# Убедиться, что скрипты исполняемые
chmod +x ./build.sh
chmod +x ./backup.sh
chmod +x ./clear.sh
chmod +x ./quick-build.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Web Check Quick Build and Install ===${NC}"

# Очистить dist директорию
echo -e "${YELLOW}Cleaning dist directory...${NC}"
rm -rf dist

# Быстрая сборка в режиме отладки
echo -e "${YELLOW}Building in debug mode...${NC}"
export NODE_ENV=development
export VITE_CSP_COMPATIBLE=true
export VITE_DEBUG=true

# Запуск сборки
pnpm run build

# Проверка успешности сборки
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Пост-обработка
echo -e "${YELLOW}Post-processing...${NC}"

# Создание необходимых директорий
mkdir -p dist/content-script

# Копирование файла element-selector.js
cp src/content-script/element-selector.js dist/content-script/element-selector.js

# Исправление манифеста
MANIFEST_PATH="dist/manifest.json"
if [ -f "$MANIFEST_PATH" ]; then
    # Добавляем <all_urls> в host_permissions, если отсутствует
    if ! grep -q '"<all_urls>"' "$MANIFEST_PATH"; then
        sed -i.bak 's/"host_permissions": \[/"host_permissions": \[\n    "<all_urls>",/g' "$MANIFEST_PATH"
        echo -e "${GREEN}✓ Added '<all_urls>' to host_permissions${NC}"
    fi
    
    # Добавляем activeTab в permissions, если отсутствует
    if ! grep -q '"activeTab"' "$MANIFEST_PATH"; then
        sed -i.bak 's/"permissions": \[/"permissions": \[\n    "activeTab",/g' "$MANIFEST_PATH"
        echo -e "${GREEN}✓ Added 'activeTab' to permissions${NC}"
    fi
    
    # Удаляем резервные копии
    rm -f "$MANIFEST_PATH.bak"
    rm -f "$MANIFEST_PATH.bak.bak"
fi

echo -e "${GREEN}Post-processing complete!${NC}"
echo -e "${BLUE}=== Installation Complete ===${NC}"
echo -e "\nYou can now load the extension from the 'dist' directory in Chrome:\n1. Go to chrome://extensions\n2. Enable Developer Mode\n3. Click 'Load unpacked' and select the 'dist' directory"
