#!/bin/zsh
set -euo pipefail

# Универсальный скрипт сборки Web Check (Manifest V3)
# Расширенная версия с интеграцией генерации иконок
# Последнее обновление: 21.05.2025

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Инициализация переменных
typeset MODE="production"
typeset CSP_COMPATIBLE=true
typeset DEBUG=false
typeset GENERATE_ICONS=false

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
  *)
    print -P "${RED}Ошибка: Неизвестный аргумент: %s${NC}" "$arg"
    exit 1
    ;;
  esac
done

# Заголовок
print -P "${BLUE}================================================================${NC}"
print -P "${BLUE}         Web Check - Универсальный скрипт сборки                ${NC}"
print -P "${BLUE}================================================================${NC}"
print -P "${YELLOW}Режим сборки: $MODE${NC}"

# Функции
check_requirements() {
  print -P "\n${CYAN}Проверка системных требований...${NC}"

  # Проверка Node.js
  if ! command -v node >/dev/null 2>&1; then
    print -P "${RED}Ошибка: Node.js не установлен${NC}"
    exit 1
  fi

  # Проверка версии Node.js
  typeset node_version=$(node -v | cut -d'v' -f2)
  if ((${node_version%%.*} < 20)); then
    print -P "${RED}Ошибка: Требуется Node.js ≥20. Текущая версия: %s${NC}" "$node_version"
    exit 1
  fi
  print -P "${GREEN}✓ Node.js: v%s${NC}" "$node_version"

  # Проверка pnpm
  if ! command -v pnpm >/dev/null 2>&1; then
    print -P "${RED}Ошибка: pnpm не установлен${NC}"
    exit 1
  fi
  print -P "${GREEN}✓ pnpm: %s${NC}" "$(pnpm --version)"

  # Проверка зависимостей
  if [[ ! -d "node_modules" || -z "$(ls -A node_modules)" ]]; then
    print -P "${YELLOW}Установка зависимостей...${NC}"
    pnpm install
  fi
  print -P "${GREEN}✓ Зависимости проверены${NC}"

  # Проверка Terser
  if ! pnpm list | grep -q terser; then
    print -P "${YELLOW}Установка Terser...${NC}"
    pnpm add -D terser
  fi
  print -P "${GREEN}✓ Terser: %s${NC}" "$(pnpm list | grep terser | awk '{print $2}')"
}

check_project_structure() {
  print -P "\n${CYAN}Проверка структуры проекта...${NC}"
  typeset -i errors=0

  # Обязательные файлы
  local required_files=(
    "src/manifest.ts"
    "vite.config.ts"
    "src/ui/popup/index.html"
    "src/ui/popup/main.ts"
    "src/ui/popup/App.vue"
    "src/components/TaskCard.vue"
    "src/ui/popup/pages/Index.vue"
    "src/ui/popup/router/index.ts"
    "src/content-script/element-selector.js"
  )

  for file in $required_files; do
    if [[ ! -f $file ]]; then
      print -P "${RED}Ошибка: Отсутствует файл: %s${NC}" "$file"
      ((errors++))
    fi
  done

  # Обязательные директории
  local required_dirs=(
    "src/ui/popup"
    "src/background"
    "src/content-script"
    "src/components"
    "src/assets"
    "src/locales"
    "src/stores"
    "src/utils"
  )

  for dir in $required_dirs; do
    if [[ ! -d $dir ]]; then
      print -P "${RED}Ошибка: Отсутствует директория: %s${NC}" "$dir"
      ((errors++))
    fi
  done

  if ((errors > 0)); then
    print -P "${RED}Обнаружено ошибок: %d${NC}" "$errors"
    exit 1
  fi
  print -P "${GREEN}✓ Структура проекта в порядке${NC}"
}

check_csp_compatibility() {
  print -P "\n${CYAN}Проверка CSP-совместимости...${NC}"
  typeset -i problematic_lines=0

  # Функция для проверки с фильтрацией комментариев
  check_pattern() {
    local pattern=$1
    local description=$2

    for file in $(find src -type f \( -name "*.ts" -o -name "*.vue" \)); do
      grep -n "$pattern" "$file" | while IFS=: read -r line_num line; do
        if [[ ! $line =~ '//' ]]; then
          print -P "${YELLOW}Найдено ${description} в файле: %s#%s${NC}" "$file" "$line_num"
          print -P "Строка %s: %s" "$line_num" "$line"
          ((problematic_lines++))
        fi
      done
    done
  }

  check_pattern "eval(" "eval()"
  check_pattern "new Function" "new Function()"

  if ((problematic_lines > 0)); then
    print -P "${RED}Обнаружено потенциальных CSP-проблем: %d${NC}" "$problematic_lines"
    exit 1
  fi
  print -P "${GREEN}✓ CSP-совместимость проверена${NC}"
}

# Функция для генерации иконок
generate_icons() {
  print -P "\n${CYAN}Генерация иконок для расширения...${NC}"

  # Проверка наличия базовых SVG иконок
  if [[ ! -d "public/icons" ]]; then
    mkdir -p "public/icons"
    print -P "${GREEN}✓ Создана директория public/icons${NC}"
  fi

  # Создание базовых SVG-иконок если их нет
  if [[ ! -f "public/icons/icon.svg" ]]; then
    cat > "public/icons/icon.svg" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="white"/>
  <rect x="16" y="16" width="96" height="96" rx="8" fill="#4285F4"/>
  <path d="M85.3,42.7l-28,28l-14.7-14.7l-5.3,5.3l20,20l33.3-33.3L85.3,42.7z" fill="white"/>
</svg>
EOF
    print -P "${GREEN}✓ Создана базовая SVG иконка${NC}"
  fi

  if [[ ! -f "public/icons/icon-changed.svg" ]]; then
    cat > "public/icons/icon-changed.svg" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="white"/>
  <rect x="16" y="16" width="96" height="96" rx="8" fill="#EA4335"/>
  <path d="M85.3,42.7l-28,28l-14.7-14.7l-5.3,5.3l20,20l33.3-33.3L85.3,42.7z" fill="white"/>
</svg>
EOF
    print -P "${GREEN}✓ Создана SVG иконка для состояния с изменениями${NC}"
  fi

  # Определение метода конвертации
  CONVERT_CMD=""
  if command -v magick &> /dev/null; then
    print -P "${GREEN}✓ Найдена команда 'magick' (ImageMagick v7+)${NC}"
    CONVERT_CMD="magick"
  elif command -v convert &> /dev/null; then
    print -P "${GREEN}✓ Найдена команда 'convert' (ImageMagick v6 или ниже)${NC}"
    CONVERT_CMD="convert"
  else
    print -P "${YELLOW}⚠️ ImageMagick не найден. Используем SVG-заглушки${NC}"
    # Создание символических ссылок
    for SIZE in 16 32 48 128; do
      # Создание директорий для разных размеров
      mkdir -p "public/icons/$SIZE"
      
      # Копирование SVG файлов для разных размеров
      cp "public/icons/icon.svg" "public/icons/$SIZE/icon-$SIZE.svg"
      cp "public/icons/icon-changed.svg" "public/icons/$SIZE/icon-changed-$SIZE.svg"
      
      # Создание символических ссылок на PNG
      ln -sf "$SIZE/icon-$SIZE.svg" "public/icons/icon-$SIZE.png"
      ln -sf "$SIZE/icon-changed-$SIZE.svg" "public/icons/icon-changed-$SIZE.png"
    done
    print -P "${GREEN}✓ Созданы SVG-заглушки для всех размеров${NC}"
    return 0
  fi

  # Конвертация иконок с помощью ImageMagick
  for SIZE in 16 32 48 128; do
    # Создание директорий для разных размеров
    mkdir -p "public/icons/$SIZE"
    
    # Конвертация обычной иконки
    if [[ "$CONVERT_CMD" == "magick" ]]; then
      # ImageMagick v7+ синтаксис
      $CONVERT_CMD "public/icons/icon.svg" -background none -resize ${SIZE}x${SIZE} "public/icons/icon-$SIZE.png"
    else
      # ImageMagick v6 и ниже
      $CONVERT_CMD -background none -resize ${SIZE}x${SIZE} "public/icons/icon.svg" "public/icons/icon-$SIZE.png"
    fi
    print -P "${GREEN}✓ Создана иконка icon-$SIZE.png${NC}"
    
    # Конвертация иконки с изменениями
    if [[ "$CONVERT_CMD" == "magick" ]]; then
      # ImageMagick v7+ синтаксис
      $CONVERT_CMD "public/icons/icon-changed.svg" -background none -resize ${SIZE}x${SIZE} "public/icons/icon-changed-$SIZE.png"
    else
      # ImageMagick v6 и ниже
      $CONVERT_CMD -background none -resize ${SIZE}x${SIZE} "public/icons/icon-changed.svg" "public/icons/icon-changed-$SIZE.png"
    fi
    print -P "${GREEN}✓ Создана иконка icon-changed-$SIZE.png${NC}"
  done

  print -P "${GREEN}✓ Все иконки успешно сгенерированы${NC}"
  return 0
}

# Функция проверки иконок
check_icons() {
  print -P "\n${CYAN}Проверка иконок для расширения...${NC}"
  local ICONS_MISSING=0

  # Проверка наличия базовых SVG-иконок
  if [[ ! -f "public/icons/icon.svg" ]]; then
    print -P "${YELLOW}⚠️ Отсутствует базовая SVG иконка${NC}"
    ICONS_MISSING=$((ICONS_MISSING + 1))
  fi

  if [[ ! -f "public/icons/icon-changed.svg" ]]; then
    print -P "${YELLOW}⚠️ Отсутствует SVG иконка для состояния с изменениями${NC}"
    ICONS_MISSING=$((ICONS_MISSING + 1))
  fi

  # Проверка наличия PNG-иконок для всех размеров
  for SIZE in 16 32 48 128; do
    if [[ ! -f "public/icons/icon-$SIZE.png" && ! -L "public/icons/icon-$SIZE.png" ]]; then
      print -P "${YELLOW}⚠️ Отсутствует иконка icon-$SIZE.png${NC}"
      ICONS_MISSING=$((ICONS_MISSING + 1))
    fi
    
    if [[ ! -f "public/icons/icon-changed-$SIZE.png" && ! -L "public/icons/icon-changed-$SIZE.png" ]]; then
      print -P "${YELLOW}⚠️ Отсутствует иконка icon-changed-$SIZE.png${NC}"
      ICONS_MISSING=$((ICONS_MISSING + 1))
    fi
  done

  # Предложение сгенерировать иконки если они отсутствуют
  if [[ $ICONS_MISSING -gt 0 ]]; then
    print -P "${YELLOW}Обнаружено отсутствующих иконок: $ICONS_MISSING${NC}"
    if [[ "$GENERATE_ICONS" == "false" ]]; then
      print -P "${YELLOW}Хотите сгенерировать иконки сейчас? (y/n) ${NC}"
      read -r response
      if [[ "$response" =~ ^[Yy]$ ]]; then
        generate_icons
      else
        print -P "${YELLOW}Продолжаем без генерации иконок...${NC}"
      fi
    else
      print -P "${GREEN}Автоматическая генерация иконок...${NC}"
      generate_icons
    fi
  else
    print -P "${GREEN}✓ Все иконки в наличии${NC}"
  fi
}

post_build_processing() {
  print -P "\n${CYAN}Пост-обработка файлов...${NC}"

  # Копирование element-selector.js
  mkdir -p dist/content-script
  local src="src/content-script/element-selector.js"
  local dest="dist/content-script/element-selector.js"

  if [[ -f $src ]]; then
    cp "$src" "$dest"
    print -P "${GREEN}✓ Файл element-selector.js скопирован${NC}"
  else
    print -P "${RED}Ошибка: Исходный файл не найден: $src${NC}"
    exit 1
  fi
  
  # Копирование иконок
  print -P "${CYAN}Копирование иконок...${NC}"
  
  # Создаем директорию для иконок
  mkdir -p "dist/icons"
  
  # Копируем иконки для обычного состояния
  for SIZE in 16 32 48 128; do
    if [[ -f "public/icons/icon-${SIZE}.png" ]]; then
      cp -f "public/icons/icon-${SIZE}.png" "dist/icons/icon-${SIZE}.png"
      print -P "${GREEN}✓ Скопирована иконка icon-${SIZE}.png${NC}"
    elif [[ -L "public/icons/icon-${SIZE}.png" ]]; then
      # Если это символическая ссылка, копируем содержимое
      cp -L "public/icons/icon-${SIZE}.png" "dist/icons/icon-${SIZE}.png" 2>/dev/null || cp -f "public/icons/icon.svg" "dist/icons/icon-${SIZE}.png"
      print -P "${GREEN}✓ Скопирована иконка icon-${SIZE}.png (из символической ссылки)${NC}"
    else
      print -P "${YELLOW}✗ Не найдена иконка icon-${SIZE}.png, используем заглушку${NC}"
      # Создаем пустую иконку в качестве заглушки если нет ImageMagick
      if command -v convert &> /dev/null; then
        convert -size ${SIZE}x${SIZE} xc:transparent "dist/icons/icon-${SIZE}.png" 2>/dev/null || true
      elif command -v magick &> /dev/null; then
        magick xc:transparent -size ${SIZE}x${SIZE} "dist/icons/icon-${SIZE}.png" 2>/dev/null || true
      else
        cp -f "public/icons/icon.svg" "dist/icons/icon-${SIZE}.png" 2>/dev/null || true
      fi
    fi
  done
  
  # Копируем иконки для состояния с изменениями
  for SIZE in 16 32 48 128; do
    if [[ -f "public/icons/icon-changed-${SIZE}.png" ]]; then
      cp -f "public/icons/icon-changed-${SIZE}.png" "dist/icons/icon-changed-${SIZE}.png"
      print -P "${GREEN}✓ Скопирована иконка icon-changed-${SIZE}.png${NC}"
    elif [[ -L "public/icons/icon-changed-${SIZE}.png" ]]; then
      # Если это символическая ссылка, копируем содержимое
      cp -L "public/icons/icon-changed-${SIZE}.png" "dist/icons/icon-changed-${SIZE}.png" 2>/dev/null || cp -f "public/icons/icon-changed.svg" "dist/icons/icon-changed-${SIZE}.png"
      print -P "${GREEN}✓ Скопирована иконка icon-changed-${SIZE}.png (из символической ссылки)${NC}"
    else
      print -P "${YELLOW}✗ Не найдена иконка icon-changed-${SIZE}.png, используем обычную иконку${NC}"
      # Используем обычную иконку в качестве замены
      if [[ -f "public/icons/icon-${SIZE}.png" ]]; then
        cp -f "public/icons/icon-${SIZE}.png" "dist/icons/icon-changed-${SIZE}.png"
      elif [[ -f "public/icons/icon-changed.svg" ]]; then
        cp -f "public/icons/icon-changed.svg" "dist/icons/icon-changed-${SIZE}.png"
      fi
    fi
  done
  
  print -P "${GREEN}✓ Иконки скопированы${NC}"
}

fix_manifest() {
  print -P "\n${CYAN}Корректировка manifest.json...${NC}"
  local manifest="dist/manifest.json"
  local backup="${manifest}.bak"

  # Создание бэкапа
  cp "$manifest" "$backup"

  # Исправление через jq
  if command -v jq >/dev/null 2>&1; then
    # CSP
    jq 'if .content_security_policy? then .content_security_policy.extension_pages |= sub("unsafe-eval"; "") else . end' "$backup" >"$manifest"

    # Разрешения
    jq '.permissions |= (["activeTab"] + .) | .host_permissions |= (["<all_urls>"] + .)' "$manifest" >"${manifest}.tmp"

    # Добавление element-selector.js
    if ! jq -e '.web_accessible_resources[].resources | index("content-script/element-selector.js")' "$manifest" >/dev/null; then
      jq '.web_accessible_resources[0].resources += ["content-script/element-selector.js"]' "${manifest}.tmp" >"$manifest"
    else
      mv "${manifest}.tmp" "$manifest"
    fi
  else
    print -P "${YELLOW}Используется sed (рекомендуется установить jq)${NC}"
    sed -i.bak 's/"unsafe-eval"//g' "$manifest"
    sed -i.bak 's/"content-script\/\*"/"content-script\/\*", "content-script\/element-selector.js"/g' "$manifest"
  fi

  # Проверка результатов
  if grep -q "unsafe-eval" "$manifest"; then
    print -P "${RED}Ошибка: Не удалось исправить CSP${NC}"
    mv "$backup" "$manifest"
    exit 1
  fi

  print -P "${GREEN}✓ Manifest обновлен${NC}"
  rm -f "$backup" "${manifest}.tmp"
}

package_extension() {
  print -P "\n${CYAN}Создание ZIP-архива...${NC}"
  typeset version=$(jq -r '.version' dist/manifest.json 2>/dev/null || grep -oP '"version":\s*"\K[^"]+' dist/manifest.json)
  typeset zip_name="web-check-v${version}.zip"

  (cd dist && zip -qr "../${zip_name}" .)
  print -P "${GREEN}✓ Создан архив: %s${NC}" "$zip_name"
}

# Основной процесс
check_requirements
check_project_structure

if [[ "$GENERATE_ICONS" == "true" ]]; then
  generate_icons
else
  check_icons
fi

if $CSP_COMPATIBLE; then
  check_csp_compatibility
fi

print -P "\n${CYAN}Запуск сборки проекта...${NC}"
rm -rf dist
pnpm run build
print -P "${GREEN}✓ Сборка проекта выполнена${NC}"

post_build_processing
fix_manifest

if [[ "$MODE" == "production" ]]; then
  package_extension
fi

print -P "\n${BLUE}================================================================${NC}"
print -P "${GREEN}Сборка успешно завершена!${NC}"
print -P "${BLUE}================================================================${NC}"

print -P "${CYAN}Для установки расширения:${NC}"
print -P "1. Откройте chrome://extensions/"
print -P "2. Включите режим разработчика"
print -P "3. Нажмите 'Загрузить распакованное расширение'"
print -P "4. Выберите папку dist"
