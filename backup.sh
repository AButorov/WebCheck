#!/bin/bash

# Скрипт для создания резервной копии проекта с меткой времени

# Проверка наличия команды tar
if ! command -v tar &> /dev/null; then
    echo "Команда tar не найдена. Установите пакет tar для работы скрипта."
    exit 1
fi

# Проверка наличия папки backups
if [ ! -d "backups" ]; then
    echo "Создание директории backups..."
    mkdir -p backups
fi

# Генерация метки времени
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="web_check_backup_${TIMESTAMP}.tar.gz"
BACKUP_PATH="backups/${BACKUP_NAME}"

echo "Создание резервной копии проекта: ${BACKUP_NAME}"

# Проверка наличия незафиксированных изменений
if command -v git &> /dev/null && [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo "Внимание: Обнаружены незафиксированные изменения в репозитории."
        echo "Рекомендуется зафиксировать изменения перед созданием резервной копии."
    fi
fi

# Проверка и очистка временных файлов перед архивацией
if [ -d "dist" ]; then
    echo "Обнаружена директория dist. Она будет исключена из резервной копии."
fi

if [ -d "node_modules" ]; then
    echo "Обнаружена директория node_modules. Она будет исключена из резервной копии."
fi

# Исключаем ненужные папки
tar --exclude="node_modules" --exclude="dist" --exclude="backups" --exclude=".git" --exclude=".DS_Store" -czf "${BACKUP_PATH}" .

if [ $? -eq 0 ]; then
    echo "Резервная копия успешно создана: ${BACKUP_PATH}"
    echo "Размер: $(du -h ${BACKUP_PATH} | cut -f1)"
    echo "Список резервных копий:"
    ls -lh backups/ | grep ".tar.gz" | sort -r
    
    # Ограничиваем количество резервных копий (оставляем последние 5)
    BACKUP_COUNT=$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        echo "Удаление старых резервных копий (сохраняются последние 5)..."
        ls -t backups/*.tar.gz | tail -n +6 | xargs rm -f
    fi
else
    echo "Ошибка при создании резервной копии."
    exit 1
fi
