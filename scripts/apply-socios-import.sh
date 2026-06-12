#!/usr/bin/env bash
# Aplica los lotes SQL generados en supabase/seed/generated_import/
# Requiere: supabase CLI linkeado al proyecto o DATABASE_URL con permisos de escritura.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEED_DIR="$ROOT/supabase/seed/generated_import"

if [[ ! -d "$SEED_DIR" ]]; then
  echo "No existe $SEED_DIR. Ejecuta primero: python3 scripts/generate-socios-import-sql.py"
  exit 1
fi

run_sql() {
  local file="$1"
  echo ">> Aplicando $(basename "$file")"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  else
    supabase db execute --file "$file" --linked
  fi
}

run_sql "$SEED_DIR/00_plans.sql"

for file in "$SEED_DIR"/batch_*.sql; do
  run_sql "$file"
done

echo "Importación completada."
