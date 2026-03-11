import { supabase } from "./supabaseClient"
import type {
  User,
  RegisterData,
  LoginData,
  Plan,
  Subscription,
  Payment,
  SubscriptionStatus,
} from "./types"

const SIGN_IN_WAIT_MS = 8000

export async function loginUser(
  data: LoginData
): Promise<{ success: boolean; user?: User; error?: string }> {
  let resolveFromEvent: (payload: { userId: string; accessToken: string } | null) => void
  const eventPayloadPromise = new Promise<{ userId: string; accessToken: string } | null>((r) => {
    resolveFromEvent = r
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user?.id && session?.access_token) {
      subscription.unsubscribe()
      resolveFromEvent({ userId: session.user.id, accessToken: session.access_token })
    }
  })

  const signInPromise = supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  const timeoutPromise = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), SIGN_IN_WAIT_MS))

  const result = await Promise.race([
    signInPromise.then((r) => ({ type: "signIn" as const, ...r })),
    eventPayloadPromise.then((p) => ({ type: "event" as const, payload: p })),
    timeoutPromise.then(() => ({ type: "timeout" as const })),
  ])

  subscription.unsubscribe()

  let userId: string | undefined
  let accessToken: string | undefined

  if (result.type === "signIn") {
    const { data: authData, error: authError } = result
    if (authError) return { success: false, error: authError.message }
    userId = authData.user?.id
    accessToken = authData.session?.access_token
  } else if (result.type === "event" && result.payload) {
    userId = result.payload.userId
    accessToken = result.payload.accessToken
  } else {
    return { success: false, error: "La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo." }
  }

  if (!userId) return { success: false, error: "Error al obtener sesión" }

  const PROFILE_FETCH_MS = 12_000
  let profile: ProfileRow | null = null
  let profileError: string | null = null

  if (accessToken) {
    try {
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const res = await Promise.race([
        fetch(`${base}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout al cargar el perfil.")), PROFILE_FETCH_MS)
        ),
      ]) as Response
      const data = await res.json()
      if (!res.ok) {
        profileError = data.error ?? res.statusText
      } else {
        profile = data as ProfileRow
      }
    } catch (err) {
      profileError = err instanceof Error ? err.message : "Error al cargar el perfil."
    }
  }

  if (!profile) {
    if (!accessToken) {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
      profile = data as ProfileRow | null
      profileError = error?.message ?? null
    }
    if (profileError || !profile) {
      await supabase.auth.signOut()
      return { success: false, error: profileError ?? "Perfil no encontrado" }
    }
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

export async function createAdminUser(params: {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}): Promise<{ success: boolean; error?: string }> {
  // Crea un usuario de Supabase Auth y luego ajusta el perfil a rol "admin"
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
      },
    },
  })
  if (signUpError) {
    return { success: false, error: signUpError.message }
  }
  const userId = authData.user?.id
  if (!userId) return { success: false, error: "Error al crear la cuenta de administrador" }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      role: "admin",
    })
    .eq("id", userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

/** Obtiene el siguiente número de socio disponible (no existente en BD). Formato "001", "002", ... */
async function getNextNumeroSocio(): Promise<string> {
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("numero_socio")
    .not("numero_socio", "is", null)

  if (error) return "001"

  const numericValues = (rows ?? [])
    .map((r) => r.numero_socio)
    .filter((v): v is string => typeof v === "string" && /^\d+$/.test(v))
    .map((v) => parseInt(v, 10))

  const max = numericValues.length > 0 ? Math.max(...numericValues) : 0
  let candidate = max + 1

  // Asegurar que el número no exista (por si hay valores no numéricos o huecos)
  for (let i = 0; i < 1000; i++) {
    const formatted = String(candidate).padStart(3, "0")
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("numero_socio", formatted)
      .maybeSingle()
    if (!existing) return formatted
    candidate++
  }

  return String(candidate).padStart(3, "0")
}

export async function createMember(params: {
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
}): Promise<{ success: boolean; error?: string; profileId?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    return { success: false, error: "Debes iniciar sesión para agregar miembros." }
  }

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? ""

  const res = await fetch(`${base}/api/admin/create-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: params.email.trim(),
      numeroSocio: params.numeroSocio,
      dni: params.dni.trim(),
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      phone: params.phone ?? null,
      direccion: params.direccion ?? null,
      localidad: params.localidad ?? null,
      provincia: params.provincia ?? null,
      fechaNacimiento: params.fechaNacimiento ?? null,
      fechaIngreso: params.fechaIngreso ?? null,
    }),
  })

  const data = (await res.json()) as {
    success: boolean
    error?: string
    profileId?: string
  }

  if (!res.ok) {
    return { success: false, error: data.error ?? "Error al crear el miembro." }
  }

  return { success: data.success, profileId: data.profileId, error: data.error }
}

export async function deleteUserById(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    return { success: false, error: "Debes iniciar sesión para eliminar usuarios." }
  }

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? ""

  const res = await fetch(`${base}/api/admin/delete-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: id }),
  })

  const data = (await res.json()) as { success: boolean; error?: string }

  if (!res.ok) {
    return { success: false, error: data.error ?? "Error al eliminar el usuario." }
  }

  return { success: data.success, error: data.error }
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
  /** Campos de migración / gestión de socios */
  numero_socio?: string | null
  dni?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  fecha_nacimiento?: string | null
  fecha_ingreso?: string | null
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
  if (data.numeroSocio !== undefined) patch.numero_socio = data.numeroSocio
  if (data.dni !== undefined) patch.dni = data.dni
  if (data.direccion !== undefined) patch.direccion = data.direccion
  if (data.localidad !== undefined) patch.localidad = data.localidad
  if (data.provincia !== undefined) patch.provincia = data.provincia
  if (data.fechaNacimiento !== undefined) patch.fecha_nacimiento = data.fechaNacimiento
  if (data.fechaIngreso !== undefined) patch.fecha_ingreso = data.fechaIngreso
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
    numeroSocio: row.numero_socio ?? null,
    dni: row.dni ?? null,
    direccion: row.direccion ?? null,
    localidad: row.localidad ?? null,
    provincia: row.provincia ?? null,
    fechaNacimiento: row.fecha_nacimiento ?? null,
    fechaIngreso: row.fecha_ingreso ?? null,
    role:
      row.role === "superadmin"
        ? "superadmin"
        : row.role === "admin"
          ? "admin"
          : "member",
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

export async function getUsersPage(params: {
  page: number
  pageSize: number
}): Promise<{ users: User[]; total: number }> {
  const page = Math.max(1, params.page)
  const pageSize = Math.max(1, params.pageSize)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error
  return {
    users: (data ?? []).map(profileToUser),
    total: count ?? 0,
  }
}

export async function getUserStats(): Promise<{
  total: number
  active: number
  inactive: number
}> {
  const [totalRes, activeRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("membership_status", "active"),
  ])

  if (totalRes.error) throw totalRes.error
  if (activeRes.error) throw activeRes.error

  const total = totalRes.count ?? 0
  const active = activeRes.count ?? 0
  const inactive = Math.max(0, total - active)

  return { total, active, inactive }
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

// ---------------------------------------------------------------------------
// Planes (para admin)
// ---------------------------------------------------------------------------

type PlanRow = {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  interval: string
  duration_days: number
  active: boolean
  [key: string]: unknown
}

function planRowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    interval: row.interval === "year" ? "year" : "month",
    durationDays: row.duration_days ?? 30,
    active: row.active,
  }
}

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => planRowToPlan(r as PlanRow))
}

// ---------------------------------------------------------------------------
// Suscripciones por perfil (tabla subscriptions)
// ---------------------------------------------------------------------------

type SubscriptionRow = {
  id: string
  profile_id: string
  plan_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  plans?: { name: string } | { name: string }[] | null
  plan?: { name: string } | null
  [key: string]: unknown
}

function subscriptionRowToSubscription(row: SubscriptionRow): Subscription {
  const raw = row.plans ?? row.plan
  const plan = Array.isArray(raw) ? raw[0] : raw
  return {
    id: row.id,
    profileId: row.profile_id,
    planId: row.plan_id,
    planName: plan?.name,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  }
}

export async function getSubscriptionsByProfileId(
  profileId: string
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, profile_id, plan_id, status, current_period_start, current_period_end, created_at, plans(name)"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) =>
    subscriptionRowToSubscription(r as SubscriptionRow)
  )
}

/** Todas las suscripciones (admin/superadmin). Para reportes. */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, profile_id, plan_id, status, current_period_start, current_period_end, created_at, plans(name)"
    )
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) =>
    subscriptionRowToSubscription(r as SubscriptionRow)
  )
}

/** Actualiza el perfil a membership_status = 'active' (p. ej. al activar por membresía o pago). */
async function setProfileMembershipActive(profileId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ membership_status: "active" })
    .eq("id", profileId)
}

export async function createSubscription(params: {
  profileId: string
  planId: string
  startDate: string
  endDate: string
  status?: SubscriptionStatus
}): Promise<{ success: boolean; error?: string }> {
  const status = params.status ?? "active"
  const { error } = await supabase.from("subscriptions").insert({
    profile_id: params.profileId,
    plan_id: params.planId,
    current_period_start: params.startDate,
    current_period_end: params.endDate,
    status,
  })
  if (error) return { success: false, error: error.message }
  const today = new Date().toISOString().split("T")[0]
  if (status === "active" && params.endDate >= today) {
    await setProfileMembershipActive(params.profileId)
  }
  return { success: true }
}

export async function updateSubscription(
  id: string,
  params: {
    planId?: string
    startDate?: string
    endDate?: string
    status?: SubscriptionStatus
  }
): Promise<{ success: boolean; error?: string }> {
  const patch: Record<string, unknown> = {}
  if (params.planId != null) patch.plan_id = params.planId
  if (params.startDate != null) patch.current_period_start = params.startDate
  if (params.endDate != null) patch.current_period_end = params.endDate
  if (params.status != null) patch.status = params.status
  if (Object.keys(patch).length === 0) return { success: true }
  const { error } = await supabase.from("subscriptions").update(patch).eq("id", id)
  if (error) return { success: false, error: error.message }
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("profile_id, status, current_period_end")
    .eq("id", id)
    .single()
  if (sub?.profile_id && sub.status === "active" && sub.current_period_end) {
    const today = new Date().toISOString().split("T")[0]
    if (sub.current_period_end >= today) {
      await setProfileMembershipActive(sub.profile_id as string)
    }
  }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Pagos por perfil (tabla payments)
// ---------------------------------------------------------------------------

type PaymentRow = {
  id: string
  profile_id: string
  amount_cents: number
  currency: string
  status: string
  payment_provider: string
  metadata: { notes?: string } | null
  created_at: string
  [key: string]: unknown
}

function paymentRowToPayment(row: PaymentRow): Payment {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    profileId: row.profile_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status as Payment["status"],
    method: row.payment_provider,
    notes: typeof meta.notes === "string" ? meta.notes : undefined,
    createdAt: row.created_at,
  }
}

export async function getPaymentsByProfileId(
  profileId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => paymentRowToPayment(r as PaymentRow))
}

/** Todos los pagos (admin/superadmin). Para reportes. */
export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => paymentRowToPayment(r as PaymentRow))
}

export async function createPayment(params: {
  profileId: string
  amountCents: number
  method: string
  notes?: string
  currency?: string
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("payments")
    .insert({
      profile_id: params.profileId,
      amount_cents: params.amountCents,
      currency: params.currency ?? "USD",
      status: "succeeded",
      payment_provider: params.method,
      metadata: params.notes ? { notes: params.notes } : null,
    })
  if (error) return { success: false, error: error.message }
  await setProfileMembershipActive(params.profileId)
  return { success: true }
}
