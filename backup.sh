#!/bin/zsh
set -euo pipefail

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

BACKUP_DIR="backups"

# Проверка наличия zip
if ! command -v zip >/dev/null 2>&1; then
  print -P "${YELLOW}Ошибка: Установите zip для создания резервных копий.${NC}"
  exit 1
fi

# Создание директории
if [[ ! -d "$BACKUP_DIR" ]]; then
  mkdir -p "$BACKUP_DIR"
  print -P "${GREEN}✓ Создана директория: $BACKUP_DIR${NC}"
fi

# Создание архива
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/web-check_$TIMESTAMP.zip"

print -P "${YELLOW}Создание резервной копии...${NC}"
zip -rq "$BACKUP_FILE" src package.json vite.config.ts tsconfig.json README.md \
  -x "*node_modules*" "*dist*" "*.git*"

if [[ $? -eq 0 ]]; then
  print -P "${GREEN}✓ Резервная копия создана: ${BACKUP_FILE}${NC}"
  print -P "Размер: $(du -h "$BACKUP_FILE" | awk '{print $1}')"
else
  print -P "${YELLOW}Ошибка при создании резервной копии!${NC}"
  exit 1
fi
