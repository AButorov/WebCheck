#!/bin/zsh
# Архивирование старых файлов документации Web Check

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

print -P "${YELLOW}📦 Архивирование старых файлов документации...${NC}"

mkdir -p archive

# Список файлов для архивирования
old_files=(
  "ARCHITECTURE_FIX_INSTRUCTIONS.md"
  "ARCHITECTURE_SOLUTION.md" 
  "BUILD_GUIDE.md"
  "BUILD_GUIDE_UPDATED.md"
  "ES_MODULE_FIX.md"
  "FINAL_BUILD_SYSTEM.md"
  "FINAL_BUILD_SYSTEM_REPORT.md"
  "FINAL_COMPLETION.md"
  "FINAL_FIX_README.md"
  "FINAL_SUMMARY.md"
  "FIXES_SUMMARY.md"
  "GITHUB_SOLUTIONS.md"
  "PROBLEMS_FIXED.md"
  "PROBLEM_FIXED.md"
  "QUICK_SOLUTION.md"
  "QUICK_START.md"
  "QUICK_START_BUILD.md"
  "RELIABILITY_FIXES_SUMMARY.md"
  "RELIABILITY_TESTING.md"
  "TESTING_FIXES.md"
  "UPDATED_BUILD_SYSTEM.md"
  "todo_now.md"
)

archived_count=0
for file in $old_files; do
  if [[ -f "$file" ]]; then
    mv "$file" archive/
    print -P "${GREEN}✅ $file → archive/${NC}"
    ((archived_count++))
  fi
done

print -P "${GREEN}🎉 Архивировано файлов: $archived_count${NC}"
