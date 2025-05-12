#!/bin/bash

# Скрипт для удаления устаревших скриптов сборки

# Список скриптов для удаления
SCRIPTS_TO_REMOVE=(
    "build-csp-safe.sh"
    "build-extension.sh"
    "csp-build.sh"
    "debug.sh"
    "mv3-build.sh"
    "simple-mv3-build.sh"
    "run-build.sh"
    "diagnose.sh"
    "devtools.sh"
)

# Удаление скриптов
for script in "${SCRIPTS_TO_REMOVE[@]}"; do
    if [ -f "$script" ]; then
        echo "Удаление скрипта: $script"
        rm -f "$script"
    else
        echo "Скрипт $script не найден, пропускаем."
    fi
done

echo "Удаление устаревших скриптов завершено."
echo "Остались только необходимые скрипты: build.sh, backup.sh и clear.sh"
