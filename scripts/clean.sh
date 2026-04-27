#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

include_node_modules=false
dry_run=false

usage() {
  cat <<'EOF'
Usage: ./scripts/clean.sh [options]

Options:
  --node-modules  Also remove node_modules directories.
  --dry-run       Print paths without removing them.
  -h, --help      Show this help.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --node-modules)
      include_node_modules=true
      ;;
    --dry-run)
      dry_run=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

remove_path() {
  local path="$1"
  if [[ ! -e "$path" && ! -L "$path" ]]; then
    return
  fi
  if [[ "$dry_run" == true ]]; then
    printf '%s\n' "$path"
    return
  fi
  rm -rf -- "$path"
}

remove_find_matches() {
  local name="$1"
  while IFS= read -r -d '' path; do
    remove_path "$path"
  done < <(find . \( -path './.git' -o -path '*/node_modules' \) -prune -o -name "$name" -prune -print0)
}

remove_find_files() {
  local name="$1"
  while IFS= read -r -d '' path; do
    remove_path "$path"
  done < <(find . \( -path './.git' -o -path '*/node_modules' \) -prune -o -name "$name" -type f -print0)
}

remove_node_modules() {
  remove_path './node_modules'
  while IFS= read -r -d '' path; do
    remove_path "$path"
  done < <(find . \( -path './.git' -o -path './node_modules' \) -prune -o -name 'node_modules' -type d -prune -print0)
}

printf 'Cleaning generated files%s...\n' "$([[ "$dry_run" == true ]] && printf ' (dry run)' || true)"

remove_find_matches '.turbo'
remove_find_matches '.build'
remove_find_matches 'dist'
remove_find_matches 'out'
remove_find_matches 'build'
remove_find_matches 'coverage'
remove_find_matches 'playwright-report'
remove_find_matches 'test-results'
remove_find_matches '.firebase'
remove_path '.pnpm-store'
remove_path 'playwright/.cache'
remove_path 'firebase-debug.log'
remove_path 'firestore-debug.log'
remove_path 'ui-debug.log'
remove_find_files '*.tsbuildinfo'

if [[ "$include_node_modules" == true ]]; then
  remove_node_modules
else
  printf 'Skipping node_modules, including ./node_modules. Pass --node-modules to remove them.\n'
fi

printf 'Clean complete.\n'