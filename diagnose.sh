#!/bin/bash

# Скрипт для проверки расширения на наличие проблем

# Установка прав на выполнение для всех скриптов
chmod +x *.sh

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Web Check Diagnostic Tool ===${NC}"

# Проверка версии Node.js
NODE_VERSION=$(node -v)
NODE_VERSION_REQUIRED="v20.0.0"

if [[ $NODE_VERSION < $NODE_VERSION_REQUIRED ]]; then
    echo -e "${RED}Проблема: Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION${NC}"
else
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
fi

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Проблема: Не найден менеджер пакетов pnpm. Установите pnpm: npm install -g pnpm${NC}"
else
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓ pnpm: $PNPM_VERSION${NC}"
fi

# Проверка установленных зависимостей
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Предупреждение: Зависимости не установлены. Рекомендуется выполнить pnpm install${NC}"
else
    echo -e "${GREEN}✓ Зависимости установлены${NC}"
fi

# Проверка наличия необходимых файлов
echo -e "${BLUE}Проверка структуры проекта...${NC}"

MISSING_FILES=0

check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}Отсутствует файл: $1${NC}"
        MISSING_FILES=$((MISSING_FILES+1))
    fi
}

check_dir() {
    if [ ! -d "$1" ]; then
        echo -e "${RED}Отсутствует директория: $1${NC}"
        MISSING_FILES=$((MISSING_FILES+1))
    fi
}

# Проверка ключевых файлов
check_file "src/manifest.ts"
check_file "vite.config.ts"
check_file "src/ui/popup/index.html"
check_file "src/ui/popup/main.ts"
check_file "src/ui/popup/App.vue"
check_file "src/stores/tasks.ts"
check_file "src/utils/browser-storage.ts"

# Проверка ключевых директорий
check_dir "src/ui/popup"
check_dir "src/ui/popup/pages"
check_dir "src/stores"
check_dir "src/locales"

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✓ Структура проекта в порядке${NC}"
else
    echo -e "${RED}Проблема: Отсутствуют $MISSING_FILES необходимых файлов/директорий${NC}"
fi

# Проверка manifest.ts на наличие правильных путей
MANIFEST_PATH="src/manifest.ts"
if [ -f "$MANIFEST_PATH" ]; then
    if grep -q "src/ui/popup/index.html" "$MANIFEST_PATH"; then
        echo -e "${GREEN}✓ manifest.ts содержит правильный путь к popup${NC}"
    else
        echo -e "${RED}Проблема: manifest.ts содержит неправильный путь к popup${NC}"
    fi
else
    echo -e "${RED}Невозможно проверить manifest.ts - файл не найден${NC}"
fi

# Предложение запустить отладочную сборку
echo -e "${BLUE}=== Рекомендации ===${NC}"
echo -e "1. Запустите отладочную сборку: ${YELLOW}./debug.sh${NC}"
echo -e "2. Просмотрите логи консоли в браузере после загрузки расширения"
echo -e "3. Если проблема сохраняется, проверьте совместимость Manifest V3 с вашей версией Chrome"

echo -e "${BLUE}=== Полезные команды ===${NC}"
echo -e "Очистка проекта: ${YELLOW}./clear.sh${NC}"
echo -e "Создание резервной копии: ${YELLOW}./backup.sh${NC}"
echo -e "Сборка для продакшн: ${YELLOW}./build.sh${NC}"
