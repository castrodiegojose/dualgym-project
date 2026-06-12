#!/usr/bin/env python3
"""Genera SQL de importación de socios desde los exports del sistema legacy."""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATOS = ROOT.parent / "DB" / "db_datos_socios.txt"
DEFAULT_ESTADO = ROOT.parent / "DB" / "Socios_estado.txt"
OUT_DIR = ROOT / "supabase" / "seed" / "generated_import"


def parse_date(value: str | None) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    parts = value.split("/")
    if len(parts) != 3:
        return None
    try:
        day, month, year = (int(p) for p in parts)
        return date(year, month, day)
    except ValueError:
        return None


def sql_date(value: date | None) -> str:
    return "NULL" if value is None else f"'{value.isoformat()}'"


def sql_text(value: str | None) -> str:
    if value is None:
        return "NULL"
    cleaned = value.strip()
    if not cleaned:
        return "NULL"
    return "'" + cleaned.replace("'", "''") + "'"


def norm_dni(value: str | None) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    return digits if len(digits) >= 7 else None


def normalize_detalle(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def extract_duration_days(detalle: str) -> int:
    match = re.search(r"(\d+)\s*D", detalle, re.IGNORECASE)
    return int(match.group(1)) if match else 30


def pick_phone(datos_row: dict, estado_row: dict | None) -> str | None:
    for key in ("Celular", "Teléfono", "Teléfono", "Celular"):
        source = estado_row if key in ("Celular", "Teléfono") and estado_row else datos_row
        if source is None:
            continue
        val = (source.get(key) or "").strip()
        if val:
            return val
    return None


def build_address(datos_row: dict, estado_row: dict | None) -> str | None:
    parts: list[str] = []
    for key in ("Dirección", "Numero", "Piso", "Barrio"):
        val = (datos_row.get(key) or "").strip()
        if val:
            parts.append(val)
    if estado_row:
        for key in ("Dirección", "Nro", "Piso", "Barrio"):
            val = (estado_row.get(key) or "").strip()
            if val and val not in parts:
                parts.append(val)
    return ", ".join(parts) if parts else None


def pick_estado_row(rows: list[dict]) -> dict | None:
    if not rows:
        return None

    def sort_key(row: dict) -> tuple[int, date]:
        estado = row.get("Estado", "").strip()
        priority = 2 if estado == "Vigente" else 1 if estado == "Suspendido" else 0
        vence = parse_date(row.get("Vence")) or date.min
        return priority, vence

    return max(rows, key=sort_key)


def membership_status_from_estado(estado_row: dict | None, today: date) -> tuple[str, str]:
    if not estado_row:
        return "inactive", "canceled"

    estado = estado_row.get("Estado", "").strip()
    vence = parse_date(estado_row.get("Vence"))

    if estado == "Vigente" and vence and vence >= today:
        return "active", "active"
    if estado == "Suspendido":
        return "inactive", "unpaid"
    return "inactive", "canceled"


def load_data(datos_path: Path, estado_path: Path) -> list[dict]:
    with datos_path.open(encoding="latin-1") as handle:
        datos_rows = list(csv.DictReader(handle, delimiter=";"))

    with estado_path.open(encoding="latin-1") as handle:
        estado_rows = list(csv.DictReader(handle, delimiter=";"))

    estado_by_socio: dict[str, list[dict]] = defaultdict(list)
    for row in estado_rows:
        numero = (row.get("Nº Socio") or "").strip()
        if numero:
            estado_by_socio[numero].append(row)

    merged: list[dict] = []
    seen_dni: set[str] = set()

    for datos in datos_rows:
        numero_socio = (datos.get("NºSoc.") or "").strip()
        if not numero_socio:
            continue

        estado = pick_estado_row(estado_by_socio.get(numero_socio, []))
        dni = norm_dni(datos.get("NºDocumento"))
        if dni and dni in seen_dni:
            dni = None
        elif dni:
            seen_dni.add(dni)

        apellido = (datos.get("Apellido") or "").strip()
        nombres = (datos.get("Nombres") or "").strip()
        if not apellido and estado:
            full_name = (estado.get("Apellido y Nombres") or "").strip()
            if "," in full_name:
                apellido, nombres = [part.strip() for part in full_name.split(",", 1)]
            else:
                nombres = full_name

        merged.append(
            {
                "numero_socio": numero_socio,
                "dni": dni,
                "first_name": nombres or "Sin nombre",
                "last_name": apellido or "Sin apellido",
                "email": (datos.get("Mail") or "").strip() or f"socio{numero_socio}@dualgym.import",
                "phone": pick_phone(datos, estado),
                "direccion": build_address(datos, estado),
                "localidad": (datos.get("Localidad") or (estado or {}).get("Localidad") or "").strip() or None,
                "provincia": (datos.get("Provincia") or (estado or {}).get("Provin") or "").strip() or None,
                "fecha_nacimiento": parse_date(datos.get("Fecha Nac.")),
                "fecha_ingreso": parse_date(datos.get("Fecha Ing")) or parse_date((estado or {}).get("Ingreso")),
                "estado": estado,
            }
        )

    merged.sort(key=lambda item: int(item["numero_socio"]) if item["numero_socio"].isdigit() else item["numero_socio"])
    return merged


def build_plan_sql(members: list[dict], today: date) -> tuple[str, dict[str, str]]:
    plans: dict[str, dict] = {}

    for member in members:
        estado = member["estado"]
        if not estado:
            continue
        detalle = normalize_detalle(estado.get("Detalle"))
        if not detalle:
            continue
        if detalle not in plans:
            price_raw = re.sub(r"\D", "", estado.get("P.Art") or estado.get("P.Vta") or "0")
            price_cents = int(price_raw) * 100 if price_raw else 0
            plans[detalle] = {
                "name": detalle[:120],
                "description": "Plan importado del sistema legacy",
                "price_cents": price_cents,
                "duration_days": extract_duration_days(detalle),
            }

    if not plans:
        return "", {}

    values = []
    for detalle, plan in sorted(plans.items()):
        values.append(
            "("
            f"{sql_text(plan['name'])}, "
            f"{sql_text(plan['description'])}, "
            f"{plan['price_cents']}, "
            f"'ARS', "
            f"'month', "
            f"{plan['duration_days']}, "
            "true)"
        )

    sql = (
        "INSERT INTO public.plans (name, description, price_cents, currency, interval, duration_days, active)\n"
        "VALUES\n  " + ",\n  ".join(values) + "\n"
        "ON CONFLICT DO NOTHING;\n\n"
        "SELECT id, name FROM public.plans WHERE name IN ("
        + ", ".join(sql_text(normalize_detalle(m["estado"]["Detalle"])[:120]) for m in members if m["estado"])
        + ");"
    )

    # Plan map will be resolved at runtime from DB; store detalle->name mapping in JSON sidecar.
    plan_map = {detalle: plan["name"] for detalle, plan in plans.items()}
    return sql, plan_map


def build_member_batch(members: list[dict], today: date, plan_name_by_detalle: dict[str, str]) -> str:
    chunks: list[str] = []

    for member in members:
        user_id_expr = "gen_random_uuid()"
        email = member["email"]
        meta = json.dumps(
            {"first_name": member["first_name"], "last_name": member["last_name"], "phone": member["phone"]},
            ensure_ascii=False,
        ).replace("'", "''")

        membership_status, subscription_status = membership_status_from_estado(member["estado"], today)

        dni_check = ""
        if member["dni"]:
            dni_check = f"""
  IF EXISTS (SELECT 1 FROM public.profiles WHERE dni = {sql_text(member['dni'])}) THEN
    RETURN;
  END IF;"""

        chunks.append(
            f"""
DO $import$
DECLARE
  uid uuid := gen_random_uuid();
  plan_id uuid;
  sub_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE numero_socio = {sql_text(member['numero_socio'])}) THEN
    RETURN;
  END IF;{dni_check}

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    {sql_text(email)},
    extensions.crypt('ImportDualGym2026!', extensions.gen_salt('bf')),
    now(),
    '{{"provider":"email","providers":["email"]}}',
    '{meta}',
    now(),
    now()
  );

  UPDATE public.profiles SET
    numero_socio = {sql_text(member['numero_socio'])},
    dni = {sql_text(member['dni'])},
    first_name = {sql_text(member['first_name'])},
    last_name = {sql_text(member['last_name'])},
    phone = {sql_text(member['phone'])},
    direccion = {sql_text(member['direccion'])},
    localidad = {sql_text(member['localidad'])},
    provincia = {sql_text(member['provincia'])},
    fecha_nacimiento = {sql_date(member['fecha_nacimiento'])},
    fecha_ingreso = {sql_date(member['fecha_ingreso'])},
    membership_status = {sql_text(membership_status)},
    role = 'member',
    created_by_email = 'import@dualgym.local'
  WHERE id = uid;
"""
        )

        estado = member["estado"]
        if estado:
            detalle = normalize_detalle(estado.get("Detalle"))
            plan_name = plan_name_by_detalle.get(detalle)
            vence = parse_date(estado.get("Vence"))
            ingreso = member["fecha_ingreso"] or parse_date(estado.get("Ingreso"))
            price_raw = re.sub(r"\D", "", estado.get("P.Art") or estado.get("P.Vta") or "0")
            amount_cents = int(price_raw) * 100 if price_raw else 0

            if plan_name:
                chunks[-1] += f"""
  SELECT id INTO plan_id FROM public.plans WHERE name = {sql_text(plan_name)} LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      profile_id, plan_id, status, current_period_start, current_period_end
    ) VALUES (
      uid,
      plan_id,
      {sql_text(subscription_status)},
      {sql_date(ingreso)},
      {sql_date(vence)}
    ) RETURNING id INTO sub_id;

    IF {amount_cents} > 0 THEN
      INSERT INTO public.payments (
        profile_id, subscription_id, amount_cents, currency, status, payment_provider, metadata
      ) VALUES (
        uid,
        sub_id,
        {amount_cents},
        'ARS',
        'succeeded',
        'legacy_import',
        jsonb_build_object('detalle', {sql_text(detalle)}, 'numero_socio', {sql_text(member['numero_socio'])})
      );
    END IF;
  END IF;
"""

        chunks[-1] += "END $import$;\n"

    return "\n".join(chunks)


def main() -> int:
    datos_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATOS
    estado_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_ESTADO
    today = date.today()

    members = load_data(datos_path, estado_path)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Build unique legacy plans
    plans: dict[str, dict] = {}
    for member in members:
        estado = member["estado"]
        if not estado:
            continue
        detalle = normalize_detalle(estado.get("Detalle"))
        if not detalle or detalle in plans:
            continue
        price_raw = re.sub(r"\D", "", estado.get("P.Art") or estado.get("P.Vta") or "0")
        plans[detalle] = {
            "name": detalle[:120],
            "description": "Plan importado del sistema legacy",
            "price_cents": int(price_raw) * 100 if price_raw else 0,
            "duration_days": extract_duration_days(detalle),
        }

    plan_sql_parts = []
    if plans:
        values = []
        for plan in sorted(plans.values(), key=lambda p: p["name"]):
            values.append(
                "("
                f"{sql_text(plan['name'])}, "
                f"{sql_text(plan['description'])}, "
                f"{plan['price_cents']}, "
                f"'ARS', "
                f"'month', "
                f"{plan['duration_days']}, "
                "true)"
            )
        plan_sql_parts.append(
            "INSERT INTO public.plans (name, description, price_cents, currency, interval, duration_days, active)\n"
            "SELECT v.name, v.description, v.price_cents, v.currency, v.interval, v.duration_days, v.active\n"
            "FROM (VALUES\n  " + ",\n  ".join(values) + "\n) AS v(name, description, price_cents, currency, interval, duration_days, active)\n"
            "WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.name = v.name);\n"
        )

    plan_name_by_detalle = {detalle: plan["name"] for detalle, plan in plans.items()}

    batch_size = 40
    manifest = {
        "total_members": len(members),
        "with_dni": sum(1 for m in members if m["dni"]),
        "with_estado": sum(1 for m in members if m["estado"]),
        "vigentes": sum(
            1
            for m in members
            if m["estado"] and m["estado"].get("Estado", "").strip() == "Vigente"
        ),
        "plans": len(plans),
        "batches": (len(members) + batch_size - 1) // batch_size,
        "generated_at": today.isoformat(),
    }

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT_DIR / "00_plans.sql").write_text("\n".join(plan_sql_parts), encoding="utf-8")

    for index in range(0, len(members), batch_size):
        batch = members[index : index + batch_size]
        batch_no = index // batch_size + 1
        sql = build_member_batch(batch, today, plan_name_by_detalle)
        (OUT_DIR / f"batch_{batch_no:03d}.sql").write_text(sql, encoding="utf-8")

    print(json.dumps(manifest, indent=2))
    print(f"Generated SQL in {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
