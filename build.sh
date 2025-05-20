#!/bin/zsh
set -euo pipefail

# Универсальный скрипт сборки Web Check (Manifest V3)
# Полная версия с исправлением ошибки element-selector.js
# Последнее обновление: 25.03.2024

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
  *)
    print -P "${RED}Ошибка: Неизвестный аргумент: %s${NC}" "$arg"
    exit 1
    ;;
  esac
done

# Заголовок
print -P "${BLUE}================================================================${NC}"
print -P "${BLUE}         Web Check - Улучшенный скрипт сборки                  ${NC}"
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

  # Создание или замена иконок стандартными изображениями
  print -P "${CYAN}Создание стандартных иконок...${NC}"

  # Гарантируем, что директория существует
  mkdir -p dist/icons
  
  # Создаем базовые иконки с помощью функции create_icon
  create_icon() {
    local size=$1
    local color="#4F46E5" # Синий цвет по умолчанию
    local changed=$2
    local output_path=$3
    
    if [[ "$changed" = "true" ]]; then
      color="#F59E0B" # Желтый цвет для измененных иконок
    fi
    
    # Создаем SVG иконку на лету
    local bg_color="white"
    local svg="<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"$size\" height=\"$size\" viewBox=\"0 0 24 24\" fill=\"$bg_color\" stroke=\"$color\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">
  <circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"$bg_color\" stroke=\"$color\" stroke-width=\"2\"></circle>
  <line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\" stroke=\"$color\" stroke-width=\"2\"></line>
  <line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"16\" stroke=\"$color\" stroke-width=\"2\"></line>
</svg>"
    
    # Записываем во временный SVG файл
    local temp_svg=$(mktemp)
    echo $svg > "$temp_svg"
    
    # Проверяем, есть ли ImageMagick и определяем подходящую команду
    if command -v magick >/dev/null 2>&1; then
      # ImageMagick v7+
      magick "$temp_svg" "$output_path"
      print -P "${GREEN}✓ Создана иконка: $output_path${NC}"
    elif command -v convert >/dev/null 2>&1; then
      # ImageMagick v6 или ранее
      convert -background none "$temp_svg" "$output_path"
      print -P "${GREEN}✓ Создана иконка: $output_path${NC}"
    else
      # Если ImageMagick нет, просто копируем SVG как есть
      cp "$temp_svg" "${output_path%.png}.svg"
      print -P "${YELLOW}✓ ImageMagick не найден, создана SVG иконка: ${output_path%.png}.svg${NC}"
    fi
    
    # Удаляем временный файл
    rm "$temp_svg"
  }
  
  # Создаем стандартные иконки
  create_icon 16 false "dist/icons/icon-16.png"
  create_icon 32 false "dist/icons/icon-32.png"
  create_icon 48 false "dist/icons/icon-48.png"
  create_icon 128 false "dist/icons/icon-128.png"
  
  # Создаем иконки измененного состояния
  create_icon 16 true "dist/icons/icon-changed-16.png"
  create_icon 32 true "dist/icons/icon-changed-32.png"
  create_icon 48 true "dist/icons/icon-changed-48.png"
  create_icon 128 true "dist/icons/icon-changed-128.png"
  
  print -P "${GREEN}✓ Все иконки созданы${NC}"
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

if $CSP_COMPATIBLE; then
  check_csp_compatibility
fi

rm -rf dist
pnpm run build
post_build_processing
fix_manifest

if [[ "$MODE" == "production" ]]; then
  package_extension
fi

print -P "\n${BLUE}================================================================${NC}"
print -P "${GREEN}Сборка успешно завершена!${NC}"
print -P "${BLUE}================================================================${NC}"
