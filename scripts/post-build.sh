#!/bin/bash

echo "🔄 Post-build: копирование файлов..."

# 1. Создаем необходимые папки
mkdir -p dist/offscreen
mkdir -p dist/content-script

# 2. Копируем content script
if [[ -f "src/content-script/index-legacy.js" ]]; then
    cp "src/content-script/index-legacy.js" "dist/content-script/index-legacy.js"
    echo "✅ Content script: src/content-script/index-legacy.js → dist/content-script/index-legacy.js"
else
    echo "❌ Content script не найден: src/content-script/index-legacy.js"
    exit 1
fi

# 3. Копируем offscreen HTML файл
if [[ -f "dist/src/offscreen/index.html" ]]; then
    cp "dist/src/offscreen/index.html" "dist/offscreen/offscreen.html"
    echo "✅ Offscreen HTML: dist/src/offscreen/index.html → dist/offscreen/offscreen.html"
elif [[ -f "src/offscreen/offscreen.html" ]]; then
    cp "src/offscreen/offscreen.html" "dist/offscreen/offscreen.html"
    echo "✅ Offscreen HTML: src/offscreen/offscreen.html → dist/offscreen/offscreen.html"
else
    echo "❌ Offscreen HTML файл не найден"
    exit 1
fi

# 4. Копируем offscreen JS файл
if [[ -f "dist/offscreen/index.js" && ! -f "dist/offscreen/offscreen.js" ]]; then
    cp "dist/offscreen/index.js" "dist/offscreen/offscreen.js"
    echo "✅ Offscreen JS: dist/offscreen/index.js → dist/offscreen/offscreen.js"
elif [[ -f "src/offscreen/offscreen.js" && ! -f "dist/offscreen/offscreen.js" ]]; then
    cp "src/offscreen/offscreen.js" "dist/offscreen/offscreen.js"
    echo "✅ Offscreen JS: src/offscreen/offscreen.js → dist/offscreen/offscreen.js"
elif [[ -f "dist/offscreen/offscreen.js" ]]; then
    echo "ℹ️ Offscreen JS файл уже существует"
else
    echo "❌ Offscreen JS файл не найден"
    exit 1
fi

# 5. Исправляем manifest.json
echo ""
echo "🔧 Исправление manifest.json..."
if [[ -f "dist/manifest.json" ]]; then
    # Исправляем путь к content script
    sed -i.bak 's|"assets/js/index-legacy.js.js"|"content-script/index-legacy.js"|g' dist/manifest.json
    
    # Удаляем backup файл
    rm -f dist/manifest.json.bak
    
    echo "✅ Manifest.json исправлен: content script путь обновлен"
else
    echo "❌ dist/manifest.json не найден"
    exit 1
fi

# 6. Проверяем результат
echo ""
echo "📋 Проверка скопированных файлов:"

files_copied=0
total_files=3

if [[ -f "dist/content-script/index-legacy.js" ]]; then
    echo "✅ Content script: $(wc -c < dist/content-script/index-legacy.js) байт"
    ((files_copied++))
else
    echo "❌ Content script не скопирован"
fi

if [[ -f "dist/offscreen/offscreen.html" ]]; then
    echo "✅ Offscreen HTML: $(wc -c < dist/offscreen/offscreen.html) байт"
    ((files_copied++))
else
    echo "❌ Offscreen HTML не скопирован"
fi

if [[ -f "dist/offscreen/offscreen.js" ]]; then
    echo "✅ Offscreen JS: $(wc -c < dist/offscreen/offscreen.js) байт"
    ((files_copied++))
else
    echo "❌ Offscreen JS не скопирован"
fi

# 7. Проверяем manifest.json
echo ""
echo "📝 Проверка manifest.json:"
if grep -q "content-script/index-legacy.js" dist/manifest.json; then
    echo "✅ Manifest: правильный путь к content script"
else
    echo "❌ Manifest: неправильный путь к content script"
    exit 1
fi

echo ""
if ((files_copied == total_files)); then
    echo "🎉 Post-build завершен успешно! Скопировано: $files_copied/$total_files файлов"
    echo "✅ Manifest.json исправлен"
    exit 0
else
    echo "❌ Post-build завершен с ошибками! Скопировано: $files_copied/$total_files файлов"
    exit 1
fi
