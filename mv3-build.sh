#!/bin/bash

# Скрипт для сборки расширения с CSP-совместимыми настройками для Manifest V3

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Web Check MV3 CSP-Safe Build ===${NC}"

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

# Установка зависимостей, если они еще не установлены
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Установка зависимостей...${NC}"
    pnpm install
fi

# Очистка директории dist для чистой сборки
echo -e "${YELLOW}Очистка предыдущей сборки...${NC}"
rm -rf dist

# Устанавливаем переменные окружения для CSP-совместимой сборки
echo -e "${YELLOW}Настройка CSP-совместимого режима сборки для MV3...${NC}"
export NODE_ENV=production
export VITE_CSP_COMPATIBLE=true
export VITE_DROP_CONSOLE=false # Оставляем логирование для отладки

# Сборка проекта с CSP-совместимыми настройками
echo -e "${YELLOW}Запуск CSP-совместимой сборки...${NC}"
pnpm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Сборка успешно завершена.${NC}"
    echo -e "${GREEN}Расширение готово к загрузке из папки dist/${NC}"
    
    # Вывод инструкций по установке
    echo -e "${BLUE}=== Инструкции по установке ===${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. Откройте консоль расширения для просмотра логов"
    echo -e "${YELLOW}Примечание: В режиме Manifest V3 запрещено использование 'unsafe-eval',${NC}"
    echo -e "${YELLOW}поэтому некоторые возможности могут быть ограничены.${NC}"
else
    echo -e "${RED}Ошибка при сборке проекта.${NC}"
    exit 1
fi
