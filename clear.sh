#!/bin/bash

# Скрипт для очистки временных и ненужных файлов

echo "Очистка временных и ненужных файлов..."

# Очистка сгенерированных файлов
if [ -d "dist" ]; then
    echo "Удаление директории dist/"
    rm -rf dist
fi

# Очистка кэша сборщика
if [ -d ".vite" ]; then
    echo "Удаление директории .vite/"
    rm -rf .vite
fi

# Очистка автоматически сгенерированных деклараций типов
if [ -f "src/auto-imports.d.ts" ]; then
    echo "Удаление файла src/auto-imports.d.ts"
    rm -f src/auto-imports.d.ts
fi

if [ -f "src/components.d.ts" ]; then
    echo "Удаление файла src/components.d.ts"
    rm -f src/components.d.ts
fi

# Очистка временных файлов macOS
echo "Удаление временных файлов macOS..."
find . -name ".DS_Store" -delete

# Очистка логов
if [ -d "logs" ]; then
    echo "Удаление директории logs/"
    rm -rf logs
fi

echo "Очистка завершена успешно."
