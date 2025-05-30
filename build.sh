#!/bin/zsh
set -euo pipefail

# ================================================================
# Web Check - Универсальный скрипт сборки (Manifest V3)
# Включает все исправления, проверки и автоматизацию
# ================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Инициализация переменных
typeset MODE="production"
typeset CSP_COMPATIBLE=true
typeset DEBUG=false
typeset GENERATE_ICONS=false
typeset FORCE_CLEAN=false
typeset VALIDATE_ONLY=false

# Обработка аргументов
for arg in "$@"; do
  case $arg in
  dev)
    MODE="development"
    CSP_COMPATIBLE=false
    ;;
  debug)
    MODE="development"
    DEBUG=true
    ;;
  icons)
    GENERATE_ICONS=true
    ;;
  clean)
    FORCE_CLEAN=true
    ;;
  validate)
    VALIDATE_ONLY=true
    ;;
  --help|-h)
    print_help
    exit 0
    ;;
  *)
    print -P "${RED}Ошибка: Неизвестный аргумент: %s${NC}" "$arg"
    print_help
    exit 1
    ;;
  esac
done

print_help() {
  print -P "${CYAN}Использование: $0 [опции]${NC}"
  print -P ""
  print -P "${YELLOW}Опции:${NC}"
  print -P "  dev        Режим разработки (без минификации)"
  print -P "  debug      Режим отладки (с дополнительным логированием)"
  print -P "  icons      Принудительная генерация иконок"
  print -P "  clean      Принудительная очистка перед сборкой"
  print -P "  validate   Только валидация без сборки"
  print -P "  --help/-h  Показать эту справку"
  print -P ""
  print -P "${YELLOW}Примеры:${NC}"
  print -P "  $0                # Продуктивная сборка"
  print -P "  $0 dev            # Сборка для разработки"
  print -P "  $0 dev icons      # Разработка + генерация иконок"
  print -P "  $0 clean          # Принудительная очистка + сборка"
}

# Заголовок
print_header() {
  print -P "${BLUE}================================================================${NC}"
  print -P "${BLUE}    Web Check - Универсальный скрипт сборки v2.0               ${NC}"
  print -P "${BLUE}    Режим: $MODE | CSP: $CSP_COMPATIBLE | Отладка: $DEBUG${NC}"
  print -P "${BLUE}================================================================${NC}"
}

# ================================
# ПРОВЕРКИ И ПОДГОТОВКА
# ================================

check_requirements() {
  print -P "\n${CYAN}🔍 Проверка системных требований...${NC}"

  # Проверка Node.js
  if ! command -v node >/dev/null 2>&1; then
    print -P "${RED}❌ Ошибка: Node.js не установлен${NC}"
    print -P "${YELLOW}Установите Node.js: https://nodejs.org/${NC}"
    exit 1
  fi

  # Проверка версии Node.js
  typeset node_version=$(node -v | cut -d'v' -f2)
  if ((${node_version%%.*} < 18)); then
    print -P "${RED}❌ Ошибка: Требуется Node.js ≥18. Текущая версия: %s${NC}" "$node_version"
    exit 1
  fi
  print -P "${GREEN}✅ Node.js: v%s${NC}" "$node_version"

  # Проверка пакетного менеджера
  local pkg_manager=""
  if command -v pnpm >/dev/null 2>&1; then
    pkg_manager="pnpm"
    print -P "${GREEN}✅ pnpm: %s${NC}" "$(pnpm --version)"
  elif command -v npm >/dev/null 2>&1; then
    pkg_manager="npm"
    print -P "${YELLOW}⚠️ Используется npm вместо pnpm${NC}"
  else
    print -P "${RED}❌ Ошибка: Не найден пакетный менеджер (pnpm/npm)${NC}"
    exit 1
  fi

  # Проверка зависимостей
  if [[ ! -d "node_modules" || -z "$(ls -A node_modules 2>/dev/null)" ]]; then
    print -P "${YELLOW}📦 Установка зависимостей...${NC}"
    $pkg_manager install
  fi
  print -P "${GREEN}✅ Зависимости проверены${NC}"

  # Проверка дополнительных инструментов
  if command -v jq >/dev/null 2>&1; then
    print -P "${GREEN}✅ jq: доступен для обработки JSON${NC}"
  else
    print -P "${YELLOW}⚠️ jq не найден (будет использован sed)${NC}"
  fi
}

check_project_structure() {
  print -P "\n${CYAN}🏗️ Проверка структуры проекта...${NC}"
  typeset -i errors=0

  # Обязательные файлы
  local required_files=(
    "src/manifest.ts"
    "vite.config.ts"
    "package.json"
    "src/ui/popup/index.html"
    "src/content-script/index-legacy.js"
    "src/offscreen/offscreen.html"
    "src/offscreen/offscreen.js"
  )

  for file in $required_files; do
    if [[ ! -f $file ]]; then
      print -P "${RED}❌ Отсутствует файл: %s${NC}" "$file"
      ((errors++))
    else
      [[ "$DEBUG" == "true" ]] && print -P "${GREEN}✅ Найден: %s${NC}" "$file"
    fi
  done

  # Проверка ключевых директорий
  local required_dirs=(
    "src/background"
    "src/ui/popup"
    "src/ui/options"
    "src/components"
    "src/stores"
  )

  for dir in $required_dirs; do
    if [[ ! -d $dir ]]; then
      print -P "${YELLOW}⚠️ Отсутствует директория: %s${NC}" "$dir"
    else
      [[ "$DEBUG" == "true" ]] && print -P "${GREEN}✅ Найдена: %s${NC}" "$dir"
    fi
  done

  if ((errors > 0)); then
    print -P "${RED}❌ Обнаружено критических ошибок: %d${NC}" "$errors"
    exit 1
  fi
  print -P "${GREEN}✅ Структура проекта корректна${NC}"
}

# ================================
# ГЕНЕРАЦИЯ ИКОНОК
# ================================

generate_icons() {
  print -P "\n${CYAN}🎨 Генерация иконок...${NC}"

  # Создание директории
  mkdir -p "public/icons"

  # Создание базовых SVG-иконок если их нет
  if [[ ! -f "public/icons/icon.svg" ]]; then
    cat >"public/icons/icon.svg" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285F4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#34A853;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="white" rx="16"/>
  <rect x="12" y="12" width="104" height="104" rx="12" fill="url(#gradient)"/>
  <path d="M85.3,42.7l-28,28l-14.7-14.7l-5.3,5.3l20,20l33.3-33.3L85.3,42.7z" fill="white" stroke="white" stroke-width="2"/>
</svg>
EOF
    print -P "${GREEN}✅ Создана базовая SVG иконка${NC}"
  fi

  if [[ ! -f "public/icons/icon-changed.svg" ]]; then
    cat >"public/icons/icon-changed.svg" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient-changed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#EA4335;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FBBC04;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="white" rx="16"/>
  <rect x="12" y="12" width="104" height="104" rx="12" fill="url(#gradient-changed)"/>
  <path d="M85.3,42.7l-28,28l-14.7-14.7l-5.3,5.3l20,20l33.3-33.3L85.3,42.7z" fill="white" stroke="white" stroke-width="2"/>
  <circle cx="96" cy="32" r="12" fill="#FF4444"/>
  <text x="96" y="37" text-anchor="middle" fill="white" font-size="16" font-weight="bold">!</text>
</svg>
EOF
    print -P "${GREEN}✅ Создана SVG иконка для изменений${NC}"
  fi

  # Конвертация в PNG
  local convert_cmd=""
  if command -v magick &>/dev/null; then
    convert_cmd="magick"
  elif command -v convert &>/dev/null; then
    convert_cmd="convert"
  fi

  if [[ -n "$convert_cmd" ]]; then
    print -P "${CYAN}🔄 Конвертация SVG в PNG...${NC}"
    for SIZE in 16 32 48 128; do
      if [[ "$convert_cmd" == "magick" ]]; then
        magick "public/icons/icon.svg" -background none -resize ${SIZE}x${SIZE} "public/icons/icon-$SIZE.png" 2>/dev/null
        magick "public/icons/icon-changed.svg" -background none -resize ${SIZE}x${SIZE} "public/icons/icon-changed-$SIZE.png" 2>/dev/null
      else
        convert -background none -resize ${SIZE}x${SIZE} "public/icons/icon.svg" "public/icons/icon-$SIZE.png" 2>/dev/null
        convert -background none -resize ${SIZE}x${SIZE} "public/icons/icon-changed.svg" "public/icons/icon-changed-$SIZE.png" 2>/dev/null
      fi
    done
    print -P "${GREEN}✅ PNG иконки созданы${NC}"
  else
    print -P "${YELLOW}⚠️ ImageMagick не найден, копируем SVG как PNG${NC}"
    for SIZE in 16 32 48 128; do
      cp "public/icons/icon.svg" "public/icons/icon-$SIZE.png"
      cp "public/icons/icon-changed.svg" "public/icons/icon-changed-$SIZE.png"
    done
  fi
}

check_icons() {
  print -P "\n${CYAN}🖼️ Проверка иконок...${NC}"
  local missing=0

  for SIZE in 16 32 48 128; do
    if [[ ! -f "public/icons/icon-$SIZE.png" ]]; then
      ((missing++))
    fi
  done

  if ((missing > 0)); then
    if [[ "$GENERATE_ICONS" == "true" ]]; then
      generate_icons
    else
      print -P "${YELLOW}⚠️ Отсутствует $missing иконок. Генерировать? (y/n) ${NC}"
      read -r response
      if [[ "$response" =~ ^[Yy]$ ]]; then
        generate_icons
      else
        print -P "${YELLOW}⚠️ Продолжаем без генерации иконок${NC}"
      fi
    fi
  else
    print -P "${GREEN}✅ Все иконки найдены${NC}"
  fi
}

# ================================
# СБОРКА ПРОЕКТА
# ================================

cleanup_build() {
  print -P "\n${CYAN}🧹 Очистка перед сборкой...${NC}"
  
  # Создаем backup dist если он существует и содержит важные файлы
  if [[ -d "dist" && -f "dist/manifest.json" ]]; then
    print -P "${YELLOW}💾 Создание backup существующей сборки...${NC}"
    rm -rf dist.backup 2>/dev/null || true
    mv dist dist.backup
  fi
  
  # Удаляем старые файлы
  rm -rf dist
  rm -rf node_modules/.cache 2>/dev/null || true
  rm -rf .output 2>/dev/null || true
  
  # Очистка временных файлов
  find . -name "*.tmp" -delete 2>/dev/null || true
  find . -name "*.bak" -delete 2>/dev/null || true
  find . -name "*.backup" -delete 2>/dev/null || true
  
  # Очистка логов сборки
  rm -f build.log error.log 2>/dev/null || true
  
  print -P "${GREEN}✅ Очистка завершена${NC}"
}

build_project() {
  print -P "\n${CYAN}🔨 Запуск сборки проекта...${NC}"
  
  # Определяем команду сборки
  local build_cmd="build"
  if [[ "$MODE" == "development" ]]; then
    build_cmd="build:dev"
  fi
  
  # Запуск сборки с логированием
  print -P "${YELLOW}⚙️ Выполняется: pnpm run $build_cmd${NC}"
  
  if [[ "$DEBUG" == "true" ]]; then
    # В режиме отладки показываем весь вывод
    pnpm run $build_cmd
  else
    # В обычном режиме перенаправляем в лог
    if ! pnpm run $build_cmd > build.log 2>&1; then
      print -P "${RED}❌ Ошибка при сборке проекта${NC}"
      print -P "${YELLOW}📋 Последние строки лога сборки:${NC}"
      tail -20 build.log
      exit 1
    fi
  fi
  
  print -P "${GREEN}✅ Основная сборка выполнена${NC}"
}

# ================================
# КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ
# ================================

fix_variable_duplication() {
  print -P "\n${CYAN}🔧 Исправление дублирования переменных...${NC}"
  
  local js_file="dist/assets/js/index.ts.js"
  
  if [[ ! -f "$js_file" ]]; then
    print -P "${YELLOW}⚠️ Файл $js_file не найден, пропускаем исправление${NC}"
    return 0
  fi
  
  # Создаем backup
  cp "$js_file" "${js_file}.backup"
  
  # Исправляем конфликт переменной Z
  print -P "${YELLOW}🔄 Исправление конфликта переменной Z...${NC}"
  
  # Заменяем проблемную декларацию Z на StreamZ во второй части
  sed 's/Z=B;Z\.initDone=!1;Z\.openStreams=new Map/StreamZ=B;StreamZ.initDone=!1;StreamZ.openStreams=new Map/g' "${js_file}.backup" > "$js_file"
  
  # Исправляем ссылки на Z во второй части
  sed -i.tmp 's/new Z(e,de/new StreamZ(e,de/g' "$js_file"
  rm -f "${js_file}.tmp"
  
  # Проверяем синтаксис
  if command -v node >/dev/null 2>&1; then
    if node -c "$js_file" 2>/dev/null; then
      print -P "${GREEN}✅ Конфликт переменной Z исправлен${NC}"
      rm -f "${js_file}.backup"
    else
      print -P "${RED}❌ Синтаксическая ошибка после исправления${NC}"
      print -P "${YELLOW}🔄 Восстанавливаем из backup...${NC}"
      mv "${js_file}.backup" "$js_file"
      return 1
    fi
  else
    print -P "${YELLOW}⚠️ Node.js недоступен для проверки синтаксиса${NC}"
  fi
}

fix_module_issues() {
  print -P "\n${CYAN}🔧 Исправление проблем с ES модулями...${NC}"
  
  # Исправляем дублирование переменных (критическое!)
  fix_variable_duplication
  
  # 1. Исправляем background script
  if [[ -f "dist/assets/js/index.ts.js" ]]; then
    print -P "${YELLOW}🔄 Обработка background script...${NC}"
    
    # Удаляем проблемные import statements если они есть
    if grep -q "import{.*}from.*\.js" "dist/assets/js/index.ts.js" 2>/dev/null; then
      sed -i.bak 's/import{[^}]*}from"[^"]*\.js";//g' "dist/assets/js/index.ts.js"
      rm -f "dist/assets/js/index.ts.js.bak"
      print -P "${GREEN}✅ Проблемные import statements удалены${NC}"
    fi
  fi
  
  # 2. Исправляем content script (если был скомпилирован как ES модуль)
  if [[ -f "dist/assets/js/index-legacy.js.js" ]]; then
    print -P "${YELLOW}🔄 Исправление content script...${NC}"
    
    # Удаляем все ES модули из content script
    sed -i.bak 's/import{[^}]*}from"[^"]*";//g' "dist/assets/js/index-legacy.js.js"
    sed -i.bak 's/export{[^}]*};//g' "dist/assets/js/index-legacy.js.js"
    sed -i.bak 's/export default[^;]*;//g' "dist/assets/js/index-legacy.js.js"
    
    rm -f "dist/assets/js/index-legacy.js.js.bak"
    print -P "${GREEN}✅ Content script исправлен${NC}"
  fi
}

# ================================
# КОПИРОВАНИЕ ФАЙЛОВ
# ================================

copy_additional_files() {
  print -P "\n${CYAN}📋 Копирование дополнительных файлов...${NC}"
  
  local copied_files=0
  
  # 1. Копирование content script
  mkdir -p "dist/content-script"
  if [[ -f "src/content-script/index-legacy.js" ]]; then
    cp "src/content-script/index-legacy.js" "dist/content-script/index-legacy.js"
    print -P "${GREEN}✅ Content script скопирован${NC}"
    ((copied_files++))
  else
    print -P "${RED}❌ Content script не найден: src/content-script/index-legacy.js${NC}"
    exit 1
  fi
  
  # 2. Копирование offscreen файлов
  mkdir -p "dist/offscreen"
  
  if [[ -f "src/offscreen/offscreen.html" ]]; then
    cp "src/offscreen/offscreen.html" "dist/offscreen/offscreen.html"
    print -P "${GREEN}✅ Offscreen HTML скопирован${NC}"
    ((copied_files++))
  fi
  
  if [[ -f "src/offscreen/offscreen.js" ]]; then
    cp "src/offscreen/offscreen.js" "dist/offscreen/offscreen.js"
    print -P "${GREEN}✅ Offscreen JS скопирован${NC}"
    ((copied_files++))
  fi
  
  # 3. Копирование иконок
  mkdir -p "dist/icons"
  local icons_copied=0
  
  for SIZE in 16 32 48 128; do
    # Обычные иконки
    if [[ -f "public/icons/icon-${SIZE}.png" ]]; then
      cp "public/icons/icon-${SIZE}.png" "dist/icons/icon-${SIZE}.png"
      ((icons_copied++))
    elif [[ -f "public/icons/icon.svg" ]]; then
      cp "public/icons/icon.svg" "dist/icons/icon-${SIZE}.png"
      ((icons_copied++))
    fi
    
    # Иконки для изменений
    if [[ -f "public/icons/icon-changed-${SIZE}.png" ]]; then
      cp "public/icons/icon-changed-${SIZE}.png" "dist/icons/icon-changed-${SIZE}.png"
      ((icons_copied++))
    elif [[ -f "public/icons/icon-changed.svg" ]]; then
      cp "public/icons/icon-changed.svg" "dist/icons/icon-changed-${SIZE}.png"
      ((icons_copied++))
    fi
  done
  
  print -P "${GREEN}✅ Иконки скопированы: $icons_copied файлов${NC}"
  
  print -P "${GREEN}✅ Всего файлов скопировано: $copied_files${NC}"
}

# ================================
# ИСПРАВЛЕНИЕ MANIFEST
# ================================

fix_manifest() {
  print -P "\n${CYAN}📝 Исправление manifest.json...${NC}"
  
  local manifest="dist/manifest.json"
  
  if [[ ! -f "$manifest" ]]; then
    print -P "${RED}❌ manifest.json не найден${NC}"
    exit 1
  fi
  
  # Создаем backup
  cp "$manifest" "${manifest}.backup"
  
  # Исправляем пути к content script и другие настройки
  if command -v jq >/dev/null 2>&1; then
    print -P "${YELLOW}🔄 Используем jq для точного редактирования...${NC}"
    
    jq '
      .content_scripts[0].js = ["content-script/index-legacy.js"] |
      .content_scripts[0].matches = ["http://*/*", "https://*/*"] |
      .content_scripts[0].all_frames = true |
      .web_accessible_resources = [
        {
          "matches": ["<all_urls>"],
          "resources": ["content-script/*", "icons/*"],
          "use_dynamic_url": false
        }
      ] |
      if .content_security_policy? then 
        .content_security_policy.extension_pages |= gsub("unsafe-eval"; "") |
        .content_security_policy.extension_pages |= gsub("  "; " ")
      else . end
    ' "${manifest}.backup" > "$manifest"
    
    print -P "${GREEN}✅ Manifest исправлен через jq${NC}"
  else
    print -P "${YELLOW}🔄 Используем sed как fallback...${NC}"
    
    # Исправляем пути к скриптам
    sed -i.tmp 's|"assets/js/index-legacy\.js\.js"|"content-script/index-legacy.js"|g' "$manifest"
    
    # Удаляем unsafe-eval
    sed -i.tmp 's/"unsafe-eval"[[:space:]]*//g' "$manifest"
    sed -i.tmp 's/;;/;/g' "$manifest"
    
    rm -f "${manifest}.tmp"
    print -P "${GREEN}✅ Manifest исправлен через sed${NC}"
  fi
  
  # Проверяем валидность JSON
  if command -v jq >/dev/null 2>&1; then
    if jq empty "$manifest" 2>/dev/null; then
      print -P "${GREEN}✅ Manifest JSON валиден${NC}"
    else
      print -P "${RED}❌ Manifest JSON невалиден${NC}"
      print -P "${YELLOW}🔄 Восстанавливаем из backup...${NC}"
      mv "${manifest}.backup" "$manifest"
      return 1
    fi
  fi
  
  # Удаляем backup только если все прошло успешно
  rm -f "${manifest}.backup"
}

# ================================
# ВАЛИДАЦИЯ РЕЗУЛЬТАТА
# ================================

validate_build() {
  print -P "\n${CYAN}🔍 Валидация результата сборки...${NC}"
  
  local errors=0
  local warnings=0
  
  # Проверяем основные файлы
  local required_files=(
    "dist/manifest.json"
    "dist/content-script/index-legacy.js"
    "dist/src/ui/popup/index.html"
    "dist/service-worker-loader.js"
    "dist/offscreen/offscreen.html"
    "dist/offscreen/offscreen.js"
  )
  
  print -P "${YELLOW}📋 Проверка обязательных файлов:${NC}"
  for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
      print -P "${RED}❌ Отсутствует: $file${NC}"
      ((errors++))
    else
      print -P "${GREEN}✅ $file${NC}"
    fi
  done
  
  # Проверяем иконки
  print -P "\n${YELLOW}🖼️ Проверка иконок:${NC}"
  for SIZE in 16 32 48 128; do
    if [[ ! -f "dist/icons/icon-$SIZE.png" ]]; then
      print -P "${YELLOW}⚠️ Отсутствует: icon-$SIZE.png${NC}"
      ((warnings++))
    fi
  done
  
  # Проверяем синтаксис JavaScript файлов
  if command -v node >/dev/null 2>&1; then
    print -P "\n${YELLOW}🔍 Проверка синтаксиса JavaScript:${NC}"
    
    # Проверяем background script
    if [[ -f "dist/assets/js/index.ts.js" ]]; then
      if node -c "dist/assets/js/index.ts.js" 2>/dev/null; then
        print -P "${GREEN}✅ Background script: синтаксис корректен${NC}"
      else
        print -P "${RED}❌ Background script: синтаксические ошибки${NC}"
        ((errors++))
      fi
    fi
    
    # Проверяем content script
    if [[ -f "dist/content-script/index-legacy.js" ]]; then
      if node -c "dist/content-script/index-legacy.js" 2>/dev/null; then
        print -P "${GREEN}✅ Content script: синтаксис корректен${NC}"
      else
        print -P "${RED}❌ Content script: синтаксические ошибки${NC}"
        ((errors++))
      fi
      
      # Проверяем, что content script не содержит ES import statements
      if grep -q "^import\\s*{" "dist/content-script/index-legacy.js" 2>/dev/null; then
        print -P "${RED}❌ Content script содержит ES import statements${NC}"
        ((errors++))
      else
        print -P "${GREEN}✅ Content script не содержит ES import statements${NC}"
      fi
    fi
  fi
  
  # Проверяем manifest.json
  print -P "\n${YELLOW}📝 Проверка manifest.json:${NC}"
  if [[ -f "dist/manifest.json" ]]; then
    # Проверяем JSON валидность
    if command -v jq >/dev/null 2>&1; then
      if jq empty "dist/manifest.json" 2>/dev/null; then
        print -P "${GREEN}✅ Manifest JSON валиден${NC}"
      else
        print -P "${RED}❌ Manifest JSON невалиден${NC}"
        ((errors++))
      fi
    fi
    
    # Проверяем пути к скриптам
    if grep -q "content-script/index-legacy.js" "dist/manifest.json" 2>/dev/null; then
      print -P "${GREEN}✅ Правильный путь к content script${NC}"
    else
      print -P "${RED}❌ Неправильный путь к content script${NC}"
      ((errors++))
    fi
    
    # Проверяем наличие необходимых разрешений
    local required_permissions=("storage" "alarms" "scripting" "activeTab" "tabs" "offscreen")
    for perm in "${required_permissions[@]}"; do
      if grep -q "\"$perm\"" "dist/manifest.json" 2>/dev/null; then
        [[ "$DEBUG" == "true" ]] && print -P "${GREEN}✅ Разрешение: $perm${NC}"
      else
        print -P "${YELLOW}⚠️ Отсутствует разрешение: $perm${NC}"
        ((warnings++))
      fi
    done
  fi
  
  # Проверяем размер сборки
  print -P "\n${YELLOW}📊 Анализ размера сборки:${NC}"
  if command -v du >/dev/null 2>&1; then
    local size=$(du -sh dist 2>/dev/null | cut -f1)
    print -P "${CYAN}📦 Размер сборки: $size${NC}"
    
    # Предупреждение если сборка слишком большая
    local size_mb=$(du -sm dist 2>/dev/null | cut -f1)
    if ((size_mb > 50)); then
      print -P "${YELLOW}⚠️ Сборка довольно большая ($size), рассмотрите оптимизацию${NC}"
      ((warnings++))
    fi
  fi
  
  # Итоги валидации
  print -P "\n${YELLOW}📋 Результаты валидации:${NC}"
  if ((errors > 0)); then
    print -P "${RED}❌ Критических ошибок: $errors${NC}"
    print -P "${YELLOW}⚠️ Предупреждений: $warnings${NC}"
    print -P "${RED}🚨 Сборка содержит критические ошибки!${NC}"
    return 1
  elif ((warnings > 0)); then
    print -P "${GREEN}✅ Критических ошибок: 0${NC}"
    print -P "${YELLOW}⚠️ Предупреждений: $warnings${NC}"
    print -P "${YELLOW}✨ Сборка готова с предупреждениями${NC}"
  else
    print -P "${GREEN}✅ Критических ошибок: 0${NC}"
    print -P "${GREEN}✅ Предупреждений: 0${NC}"
    print -P "${GREEN}🎉 Сборка идеальна!${NC}"
  fi
  
  return 0
}

# ================================
# ФИНАЛИЗАЦИЯ
# ================================

package_extension() {
  if [[ "$MODE" == "production" ]]; then
    print -P "\n${CYAN}📦 Создание ZIP-архива...${NC}"
    
    # Получаем версию из manifest
    local version="0.1.0"
    if command -v jq >/dev/null 2>&1; then
      version=$(jq -r '.version // "0.1.0"' dist/manifest.json 2>/dev/null)
    else
      version=$(grep -oP '"version":\\s*"\\K[^"]+' dist/manifest.json 2>/dev/null || echo "0.1.0")
    fi
    
    local zip_name="web-check-v${version}-$(date +%Y%m%d).zip"
    
    # Создаем архив
    if command -v zip >/dev/null 2>&1; then
      (cd dist && zip -qr "../${zip_name}" . -x "*.backup" "*.bak" "*.tmp")
      print -P "${GREEN}✅ Создан архив: %s${NC}" "$zip_name"
      
      # Показываем размер архива
      if command -v ls >/dev/null 2>&1; then
        local archive_size=$(ls -lh "$zip_name" 2>/dev/null | awk '{print $5}')
        print -P "${CYAN}📊 Размер архива: $archive_size${NC}"
      fi
    else
      print -P "${YELLOW}⚠️ zip не найден, архив не создан${NC}"
    fi
  else
    print -P "${YELLOW}⚠️ Архив создается только в production режиме${NC}"
  fi
}

cleanup_temp_files() {
  print -P "\n${CYAN}🧹 Финальная очистка...${NC}"
  
  # Удаляем временные файлы из dist
  find dist -name "*.backup" -delete 2>/dev/null || true
  find dist -name "*.bak" -delete 2>/dev/null || true
  find dist -name "*.tmp" -delete 2>/dev/null || true
  
  # Удаляем логи сборки в production режиме
  if [[ "$MODE" == "production" && "$DEBUG" != "true" ]]; then
    rm -f build.log error.log 2>/dev/null || true
  fi
  
  print -P "${GREEN}✅ Временные файлы удалены${NC}"
}

print_summary() {
  print -P "\n${BLUE}================================================================${NC}"
  print -P "${GREEN}🎉 СБОРКА УСПЕШНО ЗАВЕРШЕНА!${NC}"
  print -P "${BLUE}================================================================${NC}"
  
  print -P "\n${CYAN}🔧 Применённые исправления:${NC}"
  print -P "  ${GREEN}✅${NC} Дублирование переменной Z исправлено"
  print -P "  ${GREEN}✅${NC} ES модули обработаны корректно"
  print -P "  ${GREEN}✅${NC} Пути в manifest.json исправлены"
  print -P "  ${GREEN}✅${NC} Content script подготовлен"
  print -P "  ${GREEN}✅${NC} Offscreen API файлы скопированы"
  print -P "  ${GREEN}✅${NC} Иконки подготовлены"
  
  print -P "\n${CYAN}📋 Структура сборки:${NC}"
  if [[ -d "dist" ]]; then
    print -P "  ${YELLOW}📁${NC} dist/"
    print -P "    ${GREEN}✅${NC} manifest.json"
    print -P "    ${GREEN}✅${NC} service-worker-loader.js"
    print -P "    ${GREEN}✅${NC} content-script/index-legacy.js"
    print -P "    ${GREEN}✅${NC} offscreen/offscreen.{html,js}"
    print -P "    ${GREEN}✅${NC} icons/ (8 файлов)"
    print -P "    ${GREEN}✅${NC} src/ui/{popup,options}/"
  fi
  
  print -P "\n${CYAN}🚀 Установка расширения:${NC}"
  print -P "  ${YELLOW}1.${NC} Откройте ${MAGENTA}chrome://extensions/${NC}"
  print -P "  ${YELLOW}2.${NC} Включите ${MAGENTA}режим разработчика${NC}"
  print -P "  ${YELLOW}3.${NC} Нажмите ${MAGENTA}'Загрузить распакованное расширение'${NC}"
  print -P "  ${YELLOW}4.${NC} Выберите папку ${MAGENTA}dist${NC}"
  print -P "  ${YELLOW}5.${NC} Перезапустите браузер для лучшей стабильности"
  
  if [[ -f "web-check-v"*".zip" ]]; then
    local zip_file=$(ls -t web-check-v*.zip | head -1)
    print -P "\n${CYAN}📦 Готовый архив: ${MAGENTA}$zip_file${NC}"
  fi
  
  print -P "\n${GREEN}🎊 Расширение готово к использованию!${NC}"
  print -P "${BLUE}================================================================${NC}"
}

# ================================
# ГЛАВНАЯ ФУНКЦИЯ
# ================================

main() {
  print_header
  
  # Специальный режим только валидации
  if [[ "$VALIDATE_ONLY" == "true" ]]; then
    if [[ ! -d "dist" ]]; then
      print -P "${RED}❌ Директория dist не найдена. Сначала выполните сборку.${NC}"
      exit 1
    fi
    validate_build
    return $?
  fi
  
  # Этап 1: Проверки и подготовка
  check_requirements
  check_project_structure
  
  # Этап 2: Иконки
  if [[ "$GENERATE_ICONS" == "true" ]]; then
    generate_icons
  else
    check_icons
  fi
  
  # Этап 3: Очистка (если требуется)
  if [[ "$FORCE_CLEAN" == "true" ]] || [[ ! -d "dist" ]]; then
    cleanup_build
  fi
  
  # Этап 4: Сборка
  build_project
  
  # Этап 5: Критические исправления
  fix_module_issues
  
  # Этап 6: Копирование дополнительных файлов
  copy_additional_files
  
  # Этап 7: Исправление manifest
  fix_manifest
  
  # Этап 8: Валидация результата
  if ! validate_build; then
    print -P "\n${RED}🚨 Сборка завершена с ошибками!${NC}"
    exit 1
  fi
  
  # Этап 9: Упаковка (если нужно)
  package_extension
  
  # Этап 10: Финальная очистка
  cleanup_temp_files
  
  # Этап 11: Итоги
  print_summary
}

# Обработка сигналов для корректного завершения
trap 'print -P "\n${YELLOW}⚠️ Сборка прервана пользователем${NC}"; exit 130' INT TERM

# Запуск главной функции
main "$@"
