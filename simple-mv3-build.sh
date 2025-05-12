#!/bin/bash

# Скрипт для сборки расширения в MV3-совместимом режиме, вдохновленный vite-vue3-browser-extension-v3

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Web Check MV3 Simple Build ===${NC}"

# Проверка и установка Terser
if ! pnpm list | grep -q terser; then
    echo -e "${YELLOW}Установка Terser для минификации...${NC}"
    pnpm add -D terser
fi

# Очистка директории dist для чистой сборки
echo -e "${YELLOW}Очистка предыдущей сборки...${NC}"
rm -rf dist

# Устанавливаем переменные окружения
export NODE_ENV=production

# Сборка проекта
echo -e "${YELLOW}Запуск сборки...${NC}"
pnpm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Сборка успешно завершена.${NC}"
    echo -e "${GREEN}Расширение готово к загрузке из папки dist/${NC}"
    
    # Упрощенная модификация CSP в manifest.json
    MANIFEST_PATH="dist/manifest.json"
    if [ -f "$MANIFEST_PATH" ]; then
        echo -e "${YELLOW}Проверка manifest.json...${NC}"
        if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
            echo -e "${YELLOW}Внимание: manifest.json содержит 'unsafe-eval', что не совместимо с MV3.${NC}"
            echo -e "${YELLOW}Рекомендуется использовать строгие CSP-настройки.${NC}"
        else
            echo -e "${GREEN}manifest.json не содержит 'unsafe-eval' - совместим с MV3.${NC}"
        fi
    fi
    
    # Вывод инструкций по установке
    echo -e "${BLUE}=== Инструкции по установке ===${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. Откройте консоль расширения для просмотра логов"
else
    echo -e "${RED}Ошибка при сборке проекта.${NC}"
    exit 1
fi
