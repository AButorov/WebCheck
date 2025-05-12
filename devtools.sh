#!/bin/bash

# Скрипт для быстрого переключения между режимами разработки (MV3 CSP-совместимый и режим разработки)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода меню
show_menu() {
    echo -e "${BLUE}=== Web Check Development Tools ===${NC}"
    echo "1) Запустить режим разработки (dev server)"
    echo "2) Создать отладочную сборку (debug)"
    echo "3) Создать CSP-совместимую MV3 сборку"
    echo "4) Создать production сборку"
    echo "5) Очистить временные файлы"
    echo "6) Создать резервную копию"
    echo "7) Запустить диагностику"
    echo "0) Выход"
}

# Функция для запуска режима разработки
run_dev() {
    echo -e "${YELLOW}Запуск режима разработки...${NC}"
    pnpm run dev
}

# Функция для создания отладочной сборки
run_debug() {
    echo -e "${YELLOW}Создание отладочной сборки...${NC}"
    chmod +x debug.sh
    ./debug.sh
}

# Функция для создания CSP-совместимой MV3 сборки
run_mv3_build() {
    echo -e "${YELLOW}Создание CSP-совместимой MV3 сборки...${NC}"
    chmod +x mv3-build.sh
    ./mv3-build.sh
}

# Функция для создания production сборки
run_production() {
    echo -e "${YELLOW}Создание production сборки...${NC}"
    chmod +x build.sh
    ./build.sh
}

# Функция для очистки временных файлов
run_clean() {
    echo -e "${YELLOW}Очистка временных файлов...${NC}"
    chmod +x clear.sh
    ./clear.sh
}

# Функция для создания резервной копии
run_backup() {
    echo -e "${YELLOW}Создание резервной копии...${NC}"
    chmod +x backup.sh
    ./backup.sh
}

# Функция для запуска диагностики
run_diagnose() {
    echo -e "${YELLOW}Запуск диагностики...${NC}"
    chmod +x diagnose.sh
    ./diagnose.sh
}

# Основной цикл
while true; do
    show_menu
    read -p "Выберите действие (0-7): " choice
    
    case $choice in
        1) run_dev ;;
        2) run_debug ;;
        3) run_mv3_build ;;
        4) run_production ;;
        5) run_clean ;;
        6) run_backup ;;
        7) run_diagnose ;;
        0) echo -e "${GREEN}Выход${NC}"; break ;;
        *) echo -e "${RED}Неверный выбор, попробуйте снова${NC}" ;;
    esac
    
    echo # Пустая строка для разделения
    read -p "Нажмите Enter для продолжения..."
    clear
done
