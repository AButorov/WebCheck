#!/bin/bash

# Скрипт для сборки проекта в режиме production

# Проверка версии Node.js
NODE_VERSION=$(node -v)
NODE_VERSION_REQUIRED="v20.0.0"

if [[ $NODE_VERSION < $NODE_VERSION_REQUIRED ]]; then
    echo "Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION"
    exit 1
fi

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Не найден менеджер пакетов pnpm. Установите pnpm: npm install -g pnpm"
    exit 1
fi

echo "Сборка проекта Web Check в режиме production..."

# Установка зависимостей, если они еще не установлены
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей..."
    pnpm install
fi

# Сборка проекта
echo "Сборка проекта..."
pnpm run build -- --mode production

if [ $? -eq 0 ]; then
    echo "Сборка успешно завершена."
    echo "Расширение готово к использованию в папке dist/"

    # Опционально: проверка типов
    echo "Проверка типов TypeScript..."
    pnpm run type-check || echo "Предупреждение: При проверке типов TypeScript обнаружены ошибки, но сборка была выполнена успешно."
else
    echo "Ошибка при сборке проекта."
    exit 1
fi
