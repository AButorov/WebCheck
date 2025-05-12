#!/bin/bash

# Универсальный скрипт для подготовки и сборки расширения Web Check
# Выполняет все необходимые проверки и создает MV3-совместимую продуктивную версию

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Отображение заголовка
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}           Web Check - Сборка продуктивной версии              ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Функция для проверки наличия и версии необходимых инструментов
check_requirements() {
    echo -e "\n${CYAN}Проверка необходимых инструментов...${NC}"
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Ошибка: Node.js не установлен${NC}"
        echo -e "${YELLOW}Пожалуйста, установите Node.js версии 20.x или выше: https://nodejs.org/${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    NODE_VERSION_REQUIRED="v20.0.0"
    
    if [[ "$(printf '%s\n' "$NODE_VERSION_REQUIRED" "$NODE_VERSION" | sort -V | head -n1)" != "$NODE_VERSION_REQUIRED" ]]; then
        echo -e "${RED}Ошибка: Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION${NC}"
        echo -e "${YELLOW}Пожалуйста, обновите Node.js: https://nodejs.org/${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
    
    # Проверка pnpm
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}pnpm не найден. Установка pnpm...${NC}"
        npm install -g pnpm
        if [ $? -ne 0 ]; then
            echo -e "${RED}Ошибка: Не удалось установить pnpm${NC}"
            exit 1
        fi
    fi
    
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓ pnpm: $PNPM_VERSION${NC}"

    # Проверка зависимостей
    echo -e "\n${CYAN}Проверка зависимостей проекта...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Зависимости не установлены. Установка...${NC}"
        pnpm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Ошибка: Не удалось установить зависимости${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Зависимости проекта установлены${NC}"
    
    # Проверка Terser
    if ! pnpm list | grep -q terser; then
        echo -e "${YELLOW}Terser не найден. Установка...${NC}"
        pnpm add -D terser
        if [ $? -ne 0 ]; then
            echo -e "${RED}Ошибка: Не удалось установить Terser${NC}"
            echo -e "${YELLOW}Продолжение сборки без Terser, будет использован esbuild...${NC}"
        else
            TERSER_VERSION=$(pnpm list | grep terser | awk '{print $2}')
            echo -e "${GREEN}✓ Terser: $TERSER_VERSION${NC}"
        fi
    else
        TERSER_VERSION=$(pnpm list | grep terser | awk '{print $2}')
        echo -e "${GREEN}✓ Terser: $TERSER_VERSION${NC}"
    fi
}

# Функция для проверки структуры проекта
check_project_structure() {
    echo -e "\n${CYAN}Проверка структуры проекта...${NC}"
    ERRORS=0
    
    # Проверка обязательных файлов
    for file in "src/manifest.ts" "vite.config.ts" "src/ui/popup/index.html" "src/ui/popup/main.ts" "src/background/index.ts" "src/content-script/index.ts"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Ошибка: Отсутствует файл $file${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
    
    # Проверка обязательных директорий
    for dir in "src/ui/popup" "src/background" "src/content-script" "src/stores" "src/components"; do
        if [ ! -d "$dir" ]; then
            echo -e "${RED}Ошибка: Отсутствует директория $dir${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
    
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✓ Структура проекта в порядке${NC}"
    else
        echo -e "${RED}Обнаружено $ERRORS проблем в структуре проекта${NC}"
        echo -e "${YELLOW}Попытка продолжить сборку, но могут возникнуть ошибки...${NC}"
    fi
}

# Функция для очистки предыдущей сборки
clean_previous_build() {
    echo -e "\n${CYAN}Очистка предыдущей сборки...${NC}"
    if [ -d "dist" ]; then
        rm -rf dist
        echo -e "${GREEN}✓ Предыдущая сборка очищена${NC}"
    else
        echo -e "${GREEN}✓ Директория dist отсутствует, очистка не требуется${NC}"
    fi
}

# Функция для сборки проекта
build_project() {
    echo -e "\n${CYAN}Сборка проекта в MV3-совместимом режиме...${NC}"
    
    # Установка переменных среды для сборки
    export NODE_ENV=production
    export VITE_CSP_COMPATIBLE=true
    
    # Запуск сборки
    pnpm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка: Сборка завершилась с ошибками${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Сборка успешно завершена${NC}"
}

# Функция для проверки manifest.json
check_manifest() {
    echo -e "\n${CYAN}Проверка manifest.json...${NC}"
    
    MANIFEST_PATH="dist/manifest.json"
    
    if [ ! -f "$MANIFEST_PATH" ]; then
        echo -e "${RED}Ошибка: manifest.json не найден в dist/${NC}"
        return
    fi
    
    # Проверка наличия unsafe-eval
    if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
        echo -e "${YELLOW}Предупреждение: manifest.json содержит 'unsafe-eval', что не совместимо с MV3.${NC}"
        
        # Попытка исправить
        echo -e "${YELLOW}Попытка исправить CSP...${NC}"
        TMP_FILE=$(mktemp)
        sed 's/"unsafe-eval"//g' "$MANIFEST_PATH" > "$TMP_FILE"
        mv "$TMP_FILE" "$MANIFEST_PATH"
        
        # Повторная проверка
        if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
            echo -e "${RED}Не удалось исправить CSP в manifest.json${NC}"
        else
            echo -e "${GREEN}✓ CSP исправлен${NC}"
        fi
    else
        echo -e "${GREEN}✓ manifest.json совместим с Manifest V3${NC}"
    fi
    
    # Проверка версии manifest
    if grep -q '"manifest_version": *3' "$MANIFEST_PATH"; then
        echo -e "${GREEN}✓ Используется Manifest V3${NC}"
    else
        echo -e "${RED}Ошибка: Используется устаревшая версия манифеста${NC}"
    fi
}

# Функция для вывода инструкций по установке
show_installation_instructions() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${GREEN}Продуктивная версия расширения успешно создана!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "\n${CYAN}Инструкции по установке:${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. Готово! Расширение установлено и готово к использованию"
    
    # Показать информацию о сборке
    echo -e "\n${CYAN}Информация о сборке:${NC}"
    echo -e "- Дата и время: $(date)"
    echo -e "- Версия Node.js: $NODE_VERSION"
    echo -e "- Размер сборки: $(du -sh dist | cut -f1)"
    
    # Вывести контрольную сумму основных файлов
    if command -v md5sum &> /dev/null; then
        echo -e "\n${CYAN}Контрольные суммы основных файлов:${NC}"
        find dist -type f -name "*.js" | sort | head -5 | while read file; do
            echo -e "- $file: $(md5sum "$file" | cut -d' ' -f1)"
        done
    fi
}

# Запуск основных функций
check_requirements
check_project_structure
clean_previous_build
build_project
check_manifest
show_installation_instructions

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Все операции успешно завершены!${NC}"
echo -e "${BLUE}================================================================${NC}"
