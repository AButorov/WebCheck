#!/bin/bash

# Скрипт для быстрой пересборки расширения и вывода логов

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Web Check Debug Build ===${NC}"

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

# Сборка проекта с выводом всех логов
echo -e "${YELLOW}Запуск отладочной сборки...${NC}"
NODE_ENV=development VITE_DEBUG=true pnpm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Сборка успешно завершена.${NC}"
    echo -e "${YELLOW}Расширение готово к загрузке из папки dist/${NC}"
    
    # Вывод инструкций по установке
    echo -e "${BLUE}=== Инструкции по установке ===${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. После внесения изменений в код запустите этот скрипт снова"
    echo -e "6. Обновите расширение в chrome://extensions/ (кнопка обновления)"
    
    echo -e "${BLUE}=== Отладка ===${NC}"
    echo -e "1. Чтобы увидеть все логи, откройте Инструменты разработчика в окне расширения"
    echo -e "   (правая кнопка мыши на иконке расширения -> Просмотреть контекстное меню)"
    echo -e "2. Для background скриптов перейдите в chrome://extensions/, найдите Web Check"
    echo -e "   и нажмите ссылку 'background page' для просмотра логов"
else
    echo -e "${RED}Ошибка при сборке проекта.${NC}"
    exit 1
fi
