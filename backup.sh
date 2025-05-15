#!/bin/bash

# Делаем скрипт исполняемым
chmod +x ./backup.sh

# Путь директории для резервных копий
BACKUP_DIR="backups"

# Создаем директорию, если она не существует
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "Создана директория для резервных копий: $BACKUP_DIR"
fi

# Имя файла с текущей датой и временем
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/web-check_$TIMESTAMP.zip"

# Создание архива
echo "Создание резервной копии проекта..."
zip -r "$BACKUP_FILE" src package.json vite.config.ts tsconfig.json README.md -x "*.git*" "*/node_modules/*" "*/dist/*"

# Проверка результата
if [ $? -eq 0 ]; then
    echo "Резервная копия успешно создана: $BACKUP_FILE"
    echo "Размер файла: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "Ошибка при создании резервной копии!"
    exit 1
fi
