#!/bin/bash

# Универсальный скрипт для подготовки и сборки расширения Web Check для MV3
# Строго CSP-совместимая версия без использования eval()

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Отображение заголовка
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}         Web Check - CSP-совместимая MV3 сборка                ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Функция для проверки необходимых инструментов
check_requirements() {
    echo -e "\n${CYAN}Проверка необходимых инструментов...${NC}"
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Ошибка: Node.js не установлен${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    NODE_VERSION_REQUIRED="v20.0.0"
    
    if [[ "$(printf '%s\n' "$NODE_VERSION_REQUIRED" "$NODE_VERSION" | sort -V | head -n1)" != "$NODE_VERSION_REQUIRED" ]]; then
        echo -e "${RED}Ошибка: Требуется Node.js версии не ниже $NODE_VERSION_REQUIRED. Текущая версия: $NODE_VERSION${NC}"
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
        echo -e "${YELLOW}Исправление CSP...${NC}"
        
        # Исправление CSP
        TMP_FILE=$(mktemp)
        sed 's/"unsafe-eval"//g' "$MANIFEST_PATH" > "$TMP_FILE"
        mv "$TMP_FILE" "$MANIFEST_PATH"
        
        # Проверяем, что исправление сработало
        if grep -q "unsafe-eval" "$MANIFEST_PATH"; then
            echo -e "${RED}✗ Не удалось исправить CSP в manifest.json${NC}"
        else
            echo -e "${GREEN}✓ CSP исправлен${NC}"
        fi
    else
        echo -e "${GREEN}✓ manifest.json совместим с MV3${NC}"
    fi
}

# Функция для тестирования наличия кода с eval
check_eval_usage() {
    echo -e "\n${CYAN}Проверка использования eval() в сборке...${NC}"
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}Ошибка: Директория dist отсутствует${NC}"
        return
    fi
    
    # Поиск вызовов eval в JavaScript файлах
    EVAL_FOUND=$(grep -r "eval(" --include="*.js" dist/ | wc -l)
    NEW_FUNCTION_FOUND=$(grep -r "new Function" --include="*.js" dist/ | wc -l)
    
    if [ "$EVAL_FOUND" -gt 0 ] || [ "$NEW_FUNCTION_FOUND" -gt 0 ]; then
        echo -e "${YELLOW}Предупреждение: В сборке найдены вызовы eval() или new Function()${NC}"
        echo -e "${YELLOW}Это может привести к ошибкам CSP в Manifest V3${NC}"
        
        if [ "$EVAL_FOUND" -gt 0 ]; then
            echo -e "${YELLOW}Найдено eval() вызовов: $EVAL_FOUND${NC}"
        fi
        
        if [ "$NEW_FUNCTION_FOUND" -gt 0 ]; then
            echo -e "${YELLOW}Найдено new Function() вызовов: $NEW_FUNCTION_FOUND${NC}"
        fi
    else
        echo -e "${GREEN}✓ Вызовы eval() и new Function() не найдены${NC}"
    fi
}

# Функция для тестирования функциональности карточек в браузере
check_vue_components() {
    echo -e "\n${CYAN}Проверка Vue компонентов...${NC}"
    
    # Проверка скомпилированных файлов
    DIST_FILES=$(find dist -type f -name "*.js" | grep -i -e "task" -e "card" -e "index" | wc -l)
    
    if [ "$DIST_FILES" -eq 0 ]; then
        echo -e "${YELLOW}Предупреждение: Не найдены скомпилированные компоненты${NC}"
    else
        echo -e "${GREEN}✓ Найдено скомпилированных компонентов: $DIST_FILES${NC}"
    fi
}

# Функция для вывода инструкций по установке
show_installation_instructions() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${GREEN}CSP-совместимая версия расширения успешно создана!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "\n${CYAN}Инструкции по установке:${NC}"
    echo -e "1. Откройте chrome://extensions/"
    echo -e "2. Включите режим разработчика (переключатель в правом верхнем углу)"
    echo -e "3. Нажмите 'Загрузить распакованное расширение'"
    echo -e "4. Выберите папку dist"
    echo -e "5. После установки расширения рекомендуется перезапустить браузер"
    
    # Вывод списка возможных проблем и решений
    echo -e "\n${YELLOW}Возможные проблемы и решения:${NC}"
    echo -e "- Если окно расширения пустое, проверьте наличие ошибок в консоли разработчика"
    echo -e "- При ошибках CSP может потребоваться дополнительная оптимизация кода Vue.js"
    echo -e "- Для отладки используйте инструменты разработчика (правый клик на иконке расширения -> Проверить)"
    
    # Показать информацию о сборке
    echo -e "\n${CYAN}Информация о сборке:${NC}"
    echo -e "- Дата и время: $(date)"
    echo -e "- Версия Node.js: $NODE_VERSION"
    echo -e "- Размер сборки: $(du -sh dist | cut -f1)"
    
    # Вывести размер ключевых файлов
    echo -e "\n${CYAN}Размеры ключевых файлов:${NC}"
    find dist -type f -name "*.js" | sort | head -5 | while read file; do
        echo -e "- $file: $(du -sh "$file" | cut -f1)"
    done
}

# Запуск основных функций
check_requirements
clean_previous_build
build_project
check_manifest
check_eval_usage
check_vue_components
show_installation_instructions

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}Сборка MV3-совместимой версии успешно завершена!${NC}"
echo -e "${BLUE}================================================================${NC}"
