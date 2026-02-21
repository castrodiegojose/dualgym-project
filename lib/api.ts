import { supabase } from "./supabaseClient"
import type { User, RegisterData, LoginData } from "./types"

export async function loginUser(
  data: LoginData
): Promise<{ success: boolean; user?: User; error?: string }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })
  if (authError) {
    return { success: false, error: authError.message }
  }
  const userId = authData.user?.id
  if (!userId) return { success: false, error: "Error al obtener sesión" }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  if (profileError || !profile) {
    await supabase.auth.signOut()
    return { success: false, error: "Perfil no encontrado" }
  }
  return { success: true, user: profileToUser(profile) }
}

export async function registerUser(
  data: RegisterData
): Promise<{ success: boolean; user?: User; error?: string }> {
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      },
    },
  })
  if (signUpError) {
    return { success: false, error: signUpError.message }
  }
  const userId = authData.user?.id
  if (!userId) return { success: false, error: "Error al crear la cuenta" }
  const profile = await fetchProfileWithRetry(userId, 5)
  if (!profile) {
    await supabase.auth.signOut()
    return { success: false, error: "Perfil no creado. Intenta de nuevo." }
  }
  return { success: true, user: profileToUser(profile) }
}

type ProfileRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  membership_status: string
  avatar_url?: string | null
  created_at: string
  [key: string]: unknown
}

async function fetchProfileWithRetry(
  userId: string,
  maxAttempts: number
): Promise<ProfileRow | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    if (!error && data) return data as ProfileRow
    await new Promise((r) => setTimeout(r, 400 * (i + 1)))
  }
  return null
}

function userToProfilePatch(data: Partial<User>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (data.firstName !== undefined) patch.first_name = data.firstName
  if (data.lastName !== undefined) patch.last_name = data.lastName
  if (data.email !== undefined) patch.email = data.email
  if (data.phone !== undefined) patch.phone = data.phone
  if (data.role !== undefined) patch.role = data.role
  if (data.membershipStatus !== undefined) patch.membership_status = data.membershipStatus
  if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl
  return patch
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<{ success: boolean; user?: User; error?: string }> {
  const patch = userToProfilePatch(data)
  if (Object.keys(patch).length === 0) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !profile) return { success: false, error: "Usuario no encontrado" }
    return { success: true, user: profileToUser(profile) }
  }
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  if (!updated) return { success: false, error: "Usuario no encontrado" }
  return { success: true, user: profileToUser(updated) }
}

function profileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role === "admin" ? "admin" : "member",
    membershipStatus: row.membership_status === "active" ? "active" : "inactive",
    joinDate: row.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    avatarUrl: row.avatar_url ?? undefined,
  }
}

/** Devuelve el User actual si hay sesión de Supabase (para restaurar al recargar). */
export async function getCurrentUserFromSession(): Promise<User | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return null
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single()
  if (error || !profile) return null
  return profileToUser(profile)
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*")
  if (error) throw error
  return (data ?? []).map(profileToUser)
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single()
  if (error || !data) return null
  return profileToUser(data)
}
