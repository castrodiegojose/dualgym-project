#!/usr/bin/env node
/**
 * Aplica la importación de socios leyendo lotes SQL y ejecutándolos vía Supabase service role.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso: node scripts/run-socios-import.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SEED_DIR = join(ROOT, "supabase", "seed", "generated_import")

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const idx = trimmed.indexOf("=")
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvFile(join(ROOT, ".env.local"))
loadEnvFile(join(ROOT, ".env.loca"))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function execSql(sql) {
  const { error } = await admin.rpc("exec_sql", { query: sql })
  if (!error) return
  // Fallback: muchos proyectos no tienen RPC exec_sql; usar REST sql endpoint no está disponible en JS client.
  throw new Error(error.message)
}

async function main() {
  const plansPath = join(SEED_DIR, "00_plans.sql")
  const plansSql = readFileSync(plansPath, "utf8")
  console.log(">> Aplicando planes...")
  await execSql(plansSql)

  const batchFiles = readdirSync(SEED_DIR)
    .filter((f) => /^batch_\d+\.sql$/.test(f))
    .sort()

  for (const file of batchFiles) {
    const sql = readFileSync(join(SEED_DIR, file), "utf8")
    console.log(`>> Aplicando ${file} (${sql.length} bytes)`)
    await execSql(sql)
  }

  console.log("Importación completada.")
}

main().catch((err) => {
  console.error("Error:", err.message)
  process.exit(1)
})
