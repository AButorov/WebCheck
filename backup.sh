#!/bin/bash

# Скрипт для создания резервной копии проекта WebCheck
# Последнее обновление: 16.05.2025 19:30

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}         Web Check - Создание резервной копии                   ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Проверка наличия команды tar
if ! command -v tar &> /dev/null; then
    echo -e "${RED}Ошибка: Команда tar не найдена${NC}"
    echo -e "${YELLOW}Пожалуйста, установите пакет tar для работы скрипта${NC}"
    exit 1
fi

# Проверка наличия папки backups
if [ ! -d "backups" ]; then
    echo -e "${YELLOW}Директория backups не существует. Создание...${NC}"
    mkdir -p backups
    echo -e "${GREEN}✓ Директория backups создана${NC}"
else
    echo -e "${GREEN}✓ Директория backups существует${NC}"
fi

# Генерация метки времени и имени резервной копии
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSION=$(grep -oP '"version": *"\K[^"]+' "package.json" 2>/dev/null || echo "unknown")
BACKUP_NAME="web_check_v${VERSION}_${TIMESTAMP}.tar.gz"
BACKUP_PATH="backups/${BACKUP_NAME}"

echo -e "\n${CYAN}Параметры резервной копии:${NC}"
echo -e "- Имя файла: ${BACKUP_NAME}"
echo -e "- Версия проекта: ${VERSION}"
echo -e "- Дата и время: $(date)"

# Запрашиваем у пользователя, нужно ли включать node_modules
read -p "Включить директорию node_modules в резервную копию? (y/n, по умолчанию n): " -n 1 -r include_node_modules
echo    # перевод строки

# Массив директорий для исключения
EXCLUDE_DIRS=("dist" "backups" ".git" ".DS_Store")

# Добавляем node_modules в исключения, если пользователь не хочет их включать
if [[ ! $include_node_modules =~ ^[Yy]$ ]]; then
    EXCLUDE_DIRS+=("node_modules")
    echo -e "${YELLOW}Директория node_modules будет исключена из резервной копии${NC}"
else
    echo -e "${YELLOW}Директория node_modules будет включена в резервную копию${NC}"
fi

# Формируем параметры исключения для tar
EXCLUDE_PARAMS=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    EXCLUDE_PARAMS="${EXCLUDE_PARAMS} --exclude=${dir}"
done

echo -e "\n${CYAN}Создание резервной копии...${NC}"
echo -e "${YELLOW}Исключаемые директории: ${EXCLUDE_DIRS[*]}${NC}"

# Создаем резервную копию
tar $EXCLUDE_PARAMS -czf "${BACKUP_PATH}" .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Резервная копия успешно создана: ${BACKUP_PATH}${NC}"
    echo -e "${GREEN}✓ Размер: $(du -h ${BACKUP_PATH} | cut -f1)${NC}"
    
    echo -e "\n${CYAN}Список резервных копий:${NC}"
    ls -lh backups/ | grep ".tar.gz" | sort -r
    
    # Проверяем, нужно ли очищать старые резервные копии
    BACKUP_COUNT=$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)
    MAX_BACKUPS=5
    
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        echo -e "\n${YELLOW}Превышен лимит резервных копий (${MAX_BACKUPS})${NC}"
        
        read -p "Удалить старые резервные копии? (y/n, по умолчанию y): " -n 1 -r clean_old
        echo    # перевод строки
        
        if [[ ! $clean_old =~ ^[Nn]$ ]]; then
            echo -e "${YELLOW}Удаление старых резервных копий...${NC}"
            ls -t backups/*.tar.gz | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f
            echo -e "${GREEN}✓ Старые резервные копии удалены${NC}"
        else
            echo -e "${YELLOW}Старые резервные копии сохранены${NC}"
        fi
    fi
else
    echo -e "${RED}Ошибка: Не удалось создать резервную копию${NC}"
    exit 1
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Создание резервной копии успешно завершено!${NC}"
echo -e "${BLUE}================================================================${NC}"
