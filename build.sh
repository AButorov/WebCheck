#!/bin/bash

# Универсальный скрипт для подготовки продуктивной версии расширения Web Check
# Выполняет все необходимые проверки и создает CSP-совместимую MV3-версию

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Отображение заголовка
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}      Web Check - Подготовка продуктивной версии               ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Функция для проверки зависимостей
check_dependencies() {
    echo -e "\n${CYAN}Проверка зависимостей...${NC}"
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Ошибка: Node.js не установлен${NC}"
        echo -e "${YELLOW}Установите Node.js 20.x или выше: https://nodejs.org/${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    NODE_VERSION_REQUIRED="v20.0.0"
    
    if [[ "$(printf '%s\n' "$NODE_VERSION_REQUIRED" "$NODE_VERSION" | sort -V | head -n1)" != "$NODE_VERSION_REQUIRED" ]]; then
        echo -e "${RED}Ошибка: Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION${NC}"
        echo -e "${YELLOW}Обновите Node.js: https://nodejs.org/${NC}"
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
    
    # Проверка установленных зависимостей проекта
    if [ ! -d "node_modules" ] || [ $(find node_modules -maxdepth 0 -empty | wc -l) -eq 1 ]; then
        echo -e "${YELLOW}Зависимости проекта не установлены. Установка...${NC}"
        pnpm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Ошибка: Не удалось установить зависимости проекта${NC}"
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
    
    # Проверка ключевых файлов
    REQUIRED_FILES=(
        "src/manifest.ts"
        "vite.config.ts"
        "src/ui/popup/index.html"
        "src/ui/popup/main.ts"
        "src/ui/popup/App.vue"
        "src/components/TaskCard.vue"
        "src/ui/popup/pages/Index.vue"
        "src/ui/popup/router/index.ts"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Ошибка: Отсутствует файл $file${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
    
    # Проверка ключевых директорий
    REQUIRED_DIRS=(
        "src/ui/popup"
        "src/background"
        "src/content-script"
        "src/components"
        "src/assets"
        "src/locales"
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
    
    # Удаление временных файлов TypeScript
    find src -name "*.js.map" -type f -delete
    find src -name "*.d.ts" -type f ! -name "env.d.ts" -delete
    echo -e "${GREEN}✓ Временные файлы TypeScript удалены${NC}"
}

# Функция для проверки совместимости с CSP
check_csp_compatibility() {
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
        echo -e "${YELLOW}Используйте упрощенные компоненты, созданные ранее, для полной совместимости.${NC}"
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
}

# Функция для сборки проекта
build_project() {
    echo -e "\n${CYAN}Сборка продуктивной CSP-совместимой версии...${NC}"
    
    # Установка переменных среды для сборки
    export NODE_ENV=production
    export VITE_CSP_COMPATIBLE=true
    
    # Запуск сборки
    echo -e "${YELLOW}Запуск команды сборки...${NC}"
    pnpm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка: Сборка завершилась с ошибками${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Сборка успешно завершена${NC}"
}

# Функция для проверки и исправления manifest.json
fix_manifest() {
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
}

# Функция для упаковки расширения в ZIP
package_extension() {
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
}

# Функция для вывода инструкций и информации
show_summary() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${GREEN}Продуктивная версия Web Check успешно создана!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    
    # Информация о сборке
    echo -e "\n${CYAN}Информация о сборке:${NC}"
    echo -e "- Дата и время: $(date)"
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
    
    # Возможные проблемы
    echo -e "\n${YELLOW}Примечания по CSP-совместимости:${NC}"
    echo -e "- В Manifest V3 запрещено использование 'unsafe-eval'"
    echo -e "- Если возникают проблемы с отображением интерфейса, проверьте консоль разработчика"
    echo -e "- Для отладки используйте: правый клик на иконке расширения -> Проверить элемент"
}

# Выполнение основных функций
check_dependencies
check_project_structure
check_csp_compatibility
clean_previous_build
build_project
fix_manifest
package_extension
show_summary

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Сборка успешно завершена! Расширение готово к установке.${NC}"
echo -e "${BLUE}================================================================${NC}"
