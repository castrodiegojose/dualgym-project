import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: Request) {
  const { dni } = (await request.json().catch(() => ({}))) as { dni?: string }

  if (!dni || typeof dni !== "string") {
    return NextResponse.json(
      { error: "Debes ingresar un DNI." },
      { status: 400 },
    )
  }

  // Usamos service role para evitar que RLS bloquee la lectura por DNI.
  // (Login de socio NO tiene JWT todavía.)
  const keyToUse = serviceRoleKey ?? supabaseAnonKey
  const supabase = createClient(supabaseUrl, keyToUse, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("dni", dni.trim())
    .maybeSingle()

  console.log(profile)

  if (error) {
    return NextResponse.json(
      { error: "Error al buscar el DNI. Intenta de nuevo." },
      { status: 500 },
    )
  }

  if (!profile) {
    return NextResponse.json(
      { error: "No estás registrado en el sistema. Contacta al gimnasio." },
      { status: 404 },
    )
  }

  if (profile.rol && profile.rol !== "user") {
    return NextResponse.json(
      { error: "Este DNI pertenece a un administrador. Usa el login de administrador." },
      { status: 403 },
    )
  }

  return NextResponse.json({
    id: profile.id,
    email: profile.email ?? "",
    dni: profile.dni,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    phone: profile.phone ?? "",
    direccion: profile.direccion ?? "",
    localidad: profile.localidad ?? "",
    provincia: profile.provincia ?? "",
    fechaIngreso: profile.fecha_ingreso ?? null,
  })
}

