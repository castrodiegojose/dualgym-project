import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

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
          "Configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY para eliminar miembros.",
      },
      { status: 500 }
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: { userId?: string }
  try {
    body = (await request.json()) as { userId?: string }
  } catch {
    return NextResponse.json(
      { success: false, error: "Cuerpo de la petición inválido." },
      { status: 400 }
    )
  }

  const targetUserId = body.userId?.trim()
  if (!targetUserId) {
    return NextResponse.json(
      { success: false, error: "Falta el identificador de usuario." },
      { status: 400 }
    )
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { success: false, error: "No puedes eliminar tu propio usuario." },
      { status: 400 }
    )
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role as string | undefined
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json(
      { success: false, error: "Solo administradores pueden eliminar miembros." },
      { status: 403 }
    )
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId)

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: deleteError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}

