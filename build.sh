#!/bin/bash

# Универсальный скрипт для подготовки и сборки расширения Web Check
# Включает все необходимые проверки и создает CSP-совместимую MV3 продуктивную версию
# Последнее обновление: 17.05.2025 14:00 - Исправлено закрытие редактора задач после выбора элемента

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Отображение заголовка
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}         Web Check - Универсальный скрипт сборки               ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Проверка режима сборки
if [ "$1" == "dev" ]; then
    MODE="development"
    echo -e "${YELLOW}Режим сборки: Разработка (Development)${NC}"
    CSP_COMPATIBLE=false
elif [ "$1" == "debug" ]; then
    MODE="development"
    echo -e "${YELLOW}Режим сборки: Отладка (Debug)${NC}"
    CSP_COMPATIBLE=true
    DEBUG=true
else
    MODE="production"
    echo -e "${YELLOW}Режим сборки: Продуктивная версия (Production)${NC}"
    CSP_COMPATIBLE=true
fi

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
    
    if [ ! -d "node_modules" ] || [ $(find node_modules -maxdepth 0 -empty | wc -l) -eq 1 ]; then
        echo -e "${YELLOW}Зависимости не установлены или директория node_modules пуста. Установка...${NC}"
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
            echo -e "${YELLOW}Предупреждение: Не удалось установить Terser. Будет использован esbuild...${NC}"
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
    REQUIRED_FILES=(
        "src/manifest.ts"
        "vite.config.ts"
        "src/ui/popup/index.html"
        "src/ui/popup/main.ts"
        "src/ui/popup/App.vue"
        "src/components/TaskCard.vue"
        "src/ui/popup/pages/Index.vue"
        "src/ui/popup/router/index.ts"
        "src/content-script/element-selector.js"  # Новый файл
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Ошибка: Отсутствует файл $file${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
    
    # Проверка обязательных директорий
    REQUIRED_DIRS=(
        "src/ui/popup"
        "src/background"
        "src/content-script"
        "src/components"
        "src/assets"
        "src/locales"
        "src/stores"
        "src/utils"
    )
    
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            echo -e "${RED}Ошибка: Отсутствует директория $dir${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
    
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✓ Структура проекта в порядке${NC}"
    else
        echo -e "${RED}Обнаружено $ERRORS проблем в структуре проекта${NC}"
        if [ $ERRORS -gt 3 ]; then
            echo -e "${RED}Критическое количество ошибок в структуре. Сборка остановлена.${NC}"
            exit 1
        else
            echo -e "${YELLOW}Некритические проблемы: продолжаем сборку...${NC}"
        fi
    fi
}

# Функция для проверки совместимости с CSP
check_csp_compatibility() {
    if [ "$CSP_COMPATIBLE" == "true" ]; then
        echo -e "\n${CYAN}Проверка CSP-совместимости кода...${NC}"
        
        # Проверка использования eval в ключевых файлах
        EVAL_FILES=$(grep -l "eval(" --include="*.ts" --include="*.vue" -r src/ | wc -l)
        NEW_FUNCTION_FILES=$(grep -l "new Function" --include="*.ts" --include="*.vue" -r src/ | wc -l)
        
        if [ "$EVAL_FILES" -gt 0 ] || [ "$NEW_FUNCTION_FILES" -gt 0 ]; then
            echo -e "${YELLOW}Обнаружены потенциальные проблемы с CSP:${NC}"
            if [ "$EVAL_FILES" -gt 0 ]; then
                echo -e "${YELLOW}- Найдено файлов с eval(): $EVAL_FILES${NC}"
            fi
            if [ "$NEW_FUNCTION_FILES" -gt 0 ]; then
                echo -e "${YELLOW}- Найдено файлов с new Function(): $NEW_FUNCTION_FILES${NC}"
            fi
            echo -e "${YELLOW}Исходный код содержит конструкции, которые могут нарушать CSP в MV3.${NC}"
            echo -e "${YELLOW}Рекомендуется использовать упрощенные компоненты для полной совместимости.${NC}"
        else
            echo -e "${GREEN}✓ Исходный код не содержит явных eval() или new Function()${NC}"
        fi
        
        # Проверка manifest.ts на CSP
        if grep -q "unsafe-eval" "src/manifest.ts"; then
            echo -e "${YELLOW}Внимание: manifest.ts содержит 'unsafe-eval'${NC}"
            echo -e "${YELLOW}Это не совместимо с политикой безопасности MV3${NC}"
            
            # Предложение исправить
            echo -e "${YELLOW}Рекомендуется удалить 'unsafe-eval' из manifest.ts${NC}"
        else
            echo -e "${GREEN}✓ manifest.ts не содержит 'unsafe-eval'${NC}"
        fi
    fi
}

# Функция для очистки предыдущей сборки
clean_previous_build() {
    echo -e "\n${CYAN}Очистка предыдущей сборки...${NC}"
    
    # Удаление директории dist
    if [ -d "dist" ]; then
        rm -rf dist
        echo -e "${GREEN}✓ Директория dist очищена${NC}"
    else
        echo -e "${GREEN}✓ Директория dist не существует, очистка не требуется${NC}"
    fi
    
    # Очистка кэша Vite
    if [ -d "node_modules/.vite" ]; then
        rm -rf node_modules/.vite
        echo -e "${GREEN}✓ Кэш Vite очищен${NC}"
    fi
    
    # Очистка других временных файлов
    find . -name ".DS_Store" -type f -delete
    echo -e "${GREEN}✓ Временные файлы очищены${NC}"
}

# Функция для сборки проекта
build_project() {
    echo -e "\n${CYAN}Сборка проекта...${NC}"
    
    # Установка переменных среды для сборки
    export NODE_ENV=$MODE
    
    if [ "$CSP_COMPATIBLE" == "true" ]; then
        export VITE_CSP_COMPATIBLE=true
        echo -e "${YELLOW}CSP-совместимый режим включен${NC}"
    fi
    
    if [ "$DEBUG" == "true" ]; then
        export VITE_DEBUG=true
        echo -e "${YELLOW}Режим отладки включен${NC}"
    fi
    
    # Запуск сборки
    echo -e "${YELLOW}Запуск команды сборки...${NC}"
    pnpm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка: Сборка завершилась с ошибками${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Сборка успешно завершена${NC}"
    
    # Копирование необходимых файлов
    post_build_processing
}

# Функция для обработки файлов после сборки
post_build_processing() {
    echo -e "\n${CYAN}Пост-обработка файлов сборки...${NC}"
    
    # Создание необходимых директорий
    mkdir -p dist/content-script
    
    # Копирование файла element-selector.js
    echo -e "${YELLOW}Копирование element-selector.js...${NC}"
    
    # Проверяем наличие исходного файла
    ELEMENT_SELECTOR_SRC="src/content-script/element-selector.js"
    if [ ! -f "$ELEMENT_SELECTOR_SRC" ]; then
        echo -e "${RED}Ошибка: Файл $ELEMENT_SELECTOR_SRC не найден${NC}"
        return
    fi
    
    # Копируем файл в dist
    cp "$ELEMENT_SELECTOR_SRC" "dist/content-script/element-selector.js"
    
    # Проверяем, что файл успешно скопирован
    if [ -f "dist/content-script/element-selector.js" ]; then
        echo -e "${GREEN}✓ Файл element-selector.js успешно скопирован${NC}"
    else
        echo -e "${RED}Ошибка: Не удалось скопировать файл element-selector.js${NC}"
    fi
}

# Функция для проверки и исправления manifest.json
fix_manifest() {
    if [ "$CSP_COMPATIBLE" == "true" ]; then
        echo -e "\n${CYAN}Проверка и исправление manifest.json...${NC}"
        
        MANIFEST_PATH="dist/manifest.json"
        
        if [ ! -f "$MANIFEST_PATH" ]; then
            echo -e "${RED}Ошибка: manifest.json не найден в dist/${NC}"
            return
        fi
        
        # Проверка наличия unsafe-eval
        if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
            echo -e "${YELLOW}Внимание: manifest.json содержит 'unsafe-eval', исправление...${NC}"
            
            # Сохраняем копию оригинального файла
            cp "$MANIFEST_PATH" "$MANIFEST_PATH.bak"
            
            # Исправляем CSP, удаляя unsafe-eval
            sed -i.bak 's/"unsafe-eval"//g' "$MANIFEST_PATH"
            sed -i.bak 's/  / /g' "$MANIFEST_PATH" # Удаляем двойные пробелы
            
            # Проверяем, что исправление сработало
            if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
                echo -e "${RED}✗ Не удалось исправить CSP в manifest.json${NC}"
                echo -e "${YELLOW}Восстановление из резервной копии...${NC}"
                mv "$MANIFEST_PATH.bak" "$MANIFEST_PATH"
            else
                echo -e "${GREEN}✓ CSP успешно исправлен${NC}"
                rm -f "$MANIFEST_PATH.bak" # Удаляем резервную копию
            fi
        else
            echo -e "${GREEN}✓ manifest.json совместим с CSP${NC}"
        fi
        
        # Проверка версии манифеста
        if grep -q '"manifest_version": *3' "$MANIFEST_PATH"; then
            echo -e "${GREEN}✓ Используется Manifest V3${NC}"
        else
            echo -e "${RED}Ошибка: Не используется Manifest V3${NC}"
        fi
    fi
}

# Функция для упаковки расширения в ZIP
package_extension() {
    if [ "$MODE" == "production" ]; then
        echo -e "\n${CYAN}Создание ZIP-архива расширения...${NC}"
        
        # Проверка наличия директории dist
        if [ ! -d "dist" ]; then
            echo -e "${RED}Ошибка: Директория dist не найдена${NC}"
            return
        fi
        
        # Создание временной директории для копирования файлов
        TEMP_DIR=$(mktemp -d)
        cp -r dist/* "$TEMP_DIR"
        
        # Удаление временных и ненужных файлов
        find "$TEMP_DIR" -name "*.map" -type f -delete
        find "$TEMP_DIR" -name ".DS_Store" -type f -delete
        
        # Создание ZIP-архива
        VERSION=$(grep -oP '"version": *"\K[^"]+' "dist/manifest.json" | head -1)
        ZIP_NAME="web-check-v${VERSION}.zip"
        
        if command -v zip &> /dev/null; then
            (cd "$TEMP_DIR" && zip -r "../../$ZIP_NAME" .)
            echo -e "${GREEN}✓ Создан архив: $ZIP_NAME${NC}"
        else
            echo -e "${YELLOW}Предупреждение: zip не установлен, архив не создан${NC}"
        fi
        
        # Очистка временной директории
        rm -rf "$TEMP_DIR"
    fi
}

# Функция для вывода инструкций по установке
show_instructions() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${GREEN}Сборка Web Check успешно завершена!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    
    # Информация о сборке
    echo -e "\n${CYAN}Информация о сборке:${NC}"
    echo -e "- Дата и время: $(date)"
    echo -e "- Режим: $MODE"
    echo -e "- Размер сборки: $(du -sh dist | cut -f1)"
    
    # Размеры ключевых файлов
    JS_FILES=$(find dist -type f -name "*.js" | wc -l)
    CSS_FILES=$(find dist -type f -name "*.css" | wc -l)
    echo -e "- Количество JS файлов: $JS_FILES"
    echo -e "- Количество CSS файлов: $CSS_FILES"
    
    # Инструкция по установке
    echo -e "\n${CYAN}Инструкции по установке:${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. После установки расширения рекомендуется перезапустить браузер"
    
    # Инструкции по отладке
    if [ "$MODE" == "development" ] || [ "$DEBUG" == "true" ]; then
        echo -e "\n${CYAN}Инструкции по отладке:${NC}"
        echo -e "1. Для отладки popup: правый клик на иконке расширения -> Проверить элемент"
        echo -e "2. Для отладки background: chrome://extensions/ -> Web Check -> 'фоновая страница'"
        echo -e "3. Для отладки content script: открыть DevTools на странице, где запущен content script"
    fi
    
    # Информация о совместимости с MV3
    if [ "$CSP_COMPATIBLE" == "true" ]; then
        echo -e "\n${CYAN}Информация о совместимости с MV3:${NC}"
        echo -e "- Сборка оптимизирована для Manifest V3"
        echo -e "- CSP настроена без 'unsafe-eval' для соответствия требованиям Chrome Web Store"
    fi
}

# Выполнение основных функций
check_requirements
check_project_structure

if [ "$CSP_COMPATIBLE" == "true" ]; then
    check_csp_compatibility
fi

clean_previous_build
build_project

if [ "$CSP_COMPATIBLE" == "true" ]; then
    fix_manifest
fi

if [ "$MODE" == "production" ]; then
    package_extension
fi

show_instructions

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Все операции успешно завершены!${NC}"
echo -e "${BLUE}================================================================${NC}"
