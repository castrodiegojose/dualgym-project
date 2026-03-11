import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getLocalDateString } from "@/lib/utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type CreateMemberBody = {
  email: string
  numeroSocio?: string | null
  dni: string
  firstName: string
  lastName: string
  phone?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  fechaNacimiento?: string | null
  fechaIngreso?: string | null
}

async function getNextNumeroSocio(admin: any): Promise<string> {
  const { data: rows, error } = await admin
    .from("profiles")
    .select("numero_socio")
    .not("numero_socio", "is", null)

  if (error) return "001"

  const numericValues = (rows ?? [])
    .map((r: { numero_socio: string | null }) => r.numero_socio)
    .filter((v: string | null): v is string => typeof v === "string" && /^\d+$/.test(v))
    .map((v: string) => parseInt(v, 10))

  const max = numericValues.length > 0 ? Math.max(...numericValues) : 0
  let candidate = max + 1

  for (let i = 0; i < 1000; i++) {
    const formatted = String(candidate).padStart(3, "0")
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("numero_socio", formatted)
      .maybeSingle()
    if (!existing) return formatted
    candidate++
  }

  return String(candidate).padStart(3, "0")
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "")

  if (!token || !anonKey) {
    return NextResponse.json(
      { success: false, error: "No autorizado." },
      { status: 401 }
    )
  }

  const anon = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: userError } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "Sesión inválida." },
      { status: 401 }
    )
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY para crear miembros.",
      },
      { status: 500 }
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await admin
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single()

  const role = profile?.role as string | undefined
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      { success: false, error: "Solo administradores pueden crear miembros." },
      { status: 403 }
    )
  }

  let body: CreateMemberBody
  try {
    body = (await request.json()) as CreateMemberBody
  } catch {
    return NextResponse.json(
      { success: false, error: "Cuerpo de la petición inválido." },
      { status: 400 }
    )
  }

  const emailTrimmed = body.email?.trim()
  if (!emailTrimmed) {
    return NextResponse.json(
      { success: false, error: "El email es obligatorio." },
      { status: 400 }
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    return NextResponse.json(
      { success: false, error: "Ingresa un email válido." },
      { status: 400 }
    )
  }
  if (!body.dni?.trim()) {
    return NextResponse.json(
      { success: false, error: "El DNI es obligatorio." },
      { status: 400 }
    )
  }
  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json(
      { success: false, error: "Nombre y apellido son obligatorios." },
      { status: 400 }
    )
  }

  const { data: existingDni } = await admin
    .from("profiles")
    .select("id")
    .eq("dni", body.dni.trim())
    .maybeSingle()

  if (existingDni) {
    return NextResponse.json(
      { success: false, error: "Ya existe un miembro con este DNI." },
      { status: 400 }
    )
  }

  const { data: existingEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("email", emailTrimmed)
    .maybeSingle()

  if (existingEmail) {
    return NextResponse.json(
      { success: false, error: "Ya existe un miembro con este email." },
      { status: 400 }
    )
  }

  const numeroSocio =
    body.numeroSocio != null && String(body.numeroSocio).trim() !== ""
      ? String(body.numeroSocio).trim()
      : await getNextNumeroSocio(admin)

  const email = emailTrimmed
  const password = crypto.randomUUID() + crypto.randomUUID()

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "member",
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
      },
    })

  if (authError) {
    return NextResponse.json(
      { success: false, error: authError.message },
      { status: 400 }
    )
  }

  if (!authUser.user?.id) {
    return NextResponse.json(
      { success: false, error: "No se pudo crear el usuario de acceso." },
      { status: 500 }
    )
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      email,
      numero_socio: numeroSocio,
      dni: body.dni.trim(),
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      phone: body.phone?.trim() ?? null,
      direccion: body.direccion?.trim() ?? null,
      localidad: body.localidad?.trim() ?? null,
      provincia: body.provincia?.trim() ?? null,
      fecha_nacimiento: body.fechaNacimiento?.trim() || null,
      fecha_ingreso: body.fechaIngreso?.trim() || getLocalDateString(),
      role: "member",
      membership_status: "inactive",
      created_by_email: profile?.email ?? null,
    })
    .eq("id", authUser.user.id)

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    profileId: authUser.user.id,
  })
}
