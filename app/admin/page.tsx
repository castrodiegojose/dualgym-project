"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import {
  getAllUsers,
  getUsersPage,
  getUserStats,
  createMember,
  getPlans,
  createSubscription,
} from "@/lib/api"
import type { User, Plan } from "@/lib/types"
import { addDaysToDate, getLocalDateString } from "@/lib/utils"
import { formSchemaMemberDni } from "@/lib/validations"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Users,
  UserCheck,
  UserX,
  X,
  UserCircle,
  BarChart3,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

function AdminContent() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [statsTotal, setStatsTotal] = useState(0)
  const [statsActive, setStatsActive] = useState(0)
  const [statsInactive, setStatsInactive] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [plans, setPlans] = useState<Plan[]>([])
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")
  const [dniError, setDniError] = useState<string | null>(null)
  const [memberForm, setMemberForm] = useState(() => ({
    email: "",
    dni: "",
    firstName: "",
    lastName: "",
    phone: "",
    direccion: "",
    localidad: "",
    provincia: "",
    fechaNacimiento: "",
    fechaIngreso: getLocalDateString(),
    planId: "",
    startDate: "",
  }))
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    let cancelled = false
    getUsersPage({ page, pageSize: PAGE_SIZE })
      .then(({ users, total }) => {
        if (!cancelled) {
          setUsers(users)
          setTotalUsers(total)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [page])

  useEffect(() => {
    let cancelled = false
    getUserStats()
      .then(({ total, active, inactive }) => {
        if (!cancelled) {
          setStatsTotal(total)
          setStatsActive(active)
          setStatsInactive(inactive)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    getPlans().then(setPlans)
  }, [])

  // Calcular fecha de caducidad según plan.durationDays
  useEffect(() => {
    if (!memberForm.planId || !memberForm.startDate) {
      setEndDate("")
      return
    }
    const plan = plans.find((p) => p.id === memberForm.planId)
    if (!plan) return
    const days = plan.durationDays ?? 30
    setEndDate(addDaysToDate(memberForm.startDate, days))
  }, [memberForm.planId, memberForm.startDate, plans])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.dni ?? "").toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                PANEL DE <span className="text-primary">ADMINISTRACION</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Administra los miembros del gimnasio y consulta todas las cuentas
              </p>
            </div>
            {authUser?.role === "superadmin" && (
              <Button variant="outline" asChild>
                <Link href="/admin/reportes" className="gap-2">
                  <BarChart3 className="size-4" />
                  Reportes
                </Link>
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsTotal}</p>
                  <p className="text-sm text-muted-foreground">Total Miembros</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <UserCheck className="size-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsActive}</p>
                  <p className="text-sm text-muted-foreground">Activos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <UserX className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsInactive}</p>
                  <p className="text-sm text-muted-foreground">Inactivos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crear miembro */}
          <div className="mb-8">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Agregar miembro</CardTitle>
                <CardDescription>
                  Alta manual de un socio común (rol miembro).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {createError && (
                  <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="mb-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
                    {createSuccess}
                  </div>
                )}
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setCreateError("")
                    setCreateSuccess("")
                    setDniError(null)
                    const dniResult = formSchemaMemberDni.safeParse({
                      dni: memberForm.dni.trim(),
                    })
                    if (!dniResult.success) {
                      const msg = dniResult.error.errors[0]?.message ?? "DNI inválido."
                      setDniError(msg)
                      return
                    }
                    if (!memberForm.firstName.trim() || !memberForm.lastName.trim()) {
                      setCreateError("Nombre y apellido son obligatorios.")
                      return
                    }
                    const emailTrimmed = memberForm.email.trim()
                    if (!emailTrimmed) {
                      setCreateError("El email es obligatorio.")
                      return
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                      setCreateError("Ingresa un email válido.")
                      return
                    }
                    setCreating(true)
                    const result = await createMember({
                      email: emailTrimmed,
                      dni: memberForm.dni.trim(),
                      firstName: memberForm.firstName.trim(),
                      lastName: memberForm.lastName.trim(),
                      phone: memberForm.phone.trim() || null,
                      direccion: memberForm.direccion.trim() || null,
                      localidad: memberForm.localidad.trim() || null,
                      provincia: memberForm.provincia.trim() || null,
                      fechaNacimiento: memberForm.fechaNacimiento || null,
                      fechaIngreso: memberForm.fechaIngreso || null,
                    })
                    if (!result.success) {
                      setCreating(false)
                      setCreateError(result.error || "No se pudo crear el miembro.")
                      return
                    }
                    if (
                      result.profileId &&
                      memberForm.planId &&
                      memberForm.startDate &&
                      endDate
                    ) {
                      const subResult = await createSubscription({
                        profileId: result.profileId,
                        planId: memberForm.planId,
                        startDate: memberForm.startDate,
                        endDate,
                      })
                      if (!subResult.success) {
                        setCreating(false)
                        setCreateError(
                          subResult.error || "Miembro creado pero no se pudo asignar la membresía."
                        )
                        return
                      }
                    }
                    setCreating(false)
                    setCreateSuccess(
                      result.profileId && memberForm.planId && endDate
                        ? "Miembro y membresía creados correctamente."
                        : "Miembro creado correctamente."
                    )
                    setMemberForm({
                      email: "",
                      dni: "",
                      firstName: "",
                      lastName: "",
                      phone: "",
                      direccion: "",
                      localidad: "",
                      provincia: "",
                      fechaNacimiento: "",
                      fechaIngreso: getLocalDateString(),
                      planId: "",
                      startDate: "",
                    })
                    setEndDate("")
                    // Recargar primera página y estadísticas tras crear miembro
                    setPage(1)
                    getUsersPage({ page: 1, pageSize: PAGE_SIZE })
                      .then(({ users, total }) => {
                        setUsers(users)
                        setTotalUsers(total)
                      })
                      .catch(() => {})
                    getUserStats()
                      .then(({ total, active, inactive }) => {
                        setStatsTotal(total)
                        setStatsActive(active)
                        setStatsInactive(inactive)
                      })
                      .catch(() => {})
                  }}
                >
                  <div className="flex flex-col gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-2 md:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Número de socio
                    </span>
                    <span className="text-sm">Se asignará automáticamente (ej. 001, 002…)</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      DNI *
                    </label>
                    <Input
                      value={memberForm.dni}
                      onChange={(e) => {
                        setMemberForm((p) => ({ ...p, dni: e.target.value }))
                        if (dniError) setDniError(null)
                      }}
                      placeholder="7 u 8 dígitos"
                      className={dniError ? "border-destructive" : undefined}
                      maxLength={8}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    {dniError && (
                      <p className="text-xs text-destructive">{dniError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="socio@ejemplo.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fecha de nacimiento
                    </label>
                    <Input
                      type="date"
                      value={memberForm.fechaNacimiento}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, fechaNacimiento: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Nombre *
                    </label>
                    <Input
                      value={memberForm.firstName}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Apellido *
                    </label>
                    <Input
                      value={memberForm.lastName}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Teléfono
                    </label>
                    <Input
                      value={memberForm.phone}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Dirección
                    </label>
                    <Input
                      value={memberForm.direccion}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, direccion: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Localidad
                    </label>
                    <Input
                      value={memberForm.localidad}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, localidad: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Provincia
                    </label>
                    <Input
                      value={memberForm.provincia}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, provincia: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fecha de ingreso
                    </label>
                    <Input
                      type="date"
                      value={memberForm.fechaIngreso}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, fechaIngreso: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Plan (opcional)
                    </label>
                    <Select
                      value={memberForm.planId}
                      onValueChange={(v) =>
                        setMemberForm((p) => ({ ...p, planId: v }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fecha inicio membresía
                    </label>
                    <Input
                      type="date"
                      value={memberForm.startDate}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fecha caducidad
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      readOnly
                      className="bg-muted"
                      title="Se calcula según el plan"
                    />
                    <span className="text-xs text-muted-foreground">
                      Calculada según el plan
                    </span>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <span className="mr-1">Guardando...</span>
                        </>
                      ) : (
                        "Guardar miembro"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* User List */}
            <div className="lg:col-span-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Miembros</CardTitle>
                  <CardDescription>
                    {filtered.length} de {users.length} miembros
                  </CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o correo..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Estado Membresia</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-sm text-muted-foreground"
                            >
                              No se encontraron miembros
                            </TableCell>
                          </TableRow>
                        )}
                        {filtered.map((u) => (
                          <TableRow
                            key={u.id}
                            className={
                              selectedUser?.id === u.id
                                ? "bg-secondary/50"
                                : undefined
                            }
                          >
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => setSelectedUser(u)}
                                className="flex items-center gap-3 text-left hover:opacity-80"
                              >
                                <Avatar className="size-8 shrink-0">
                                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                    {u.firstName[0]}
                                    {u.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {u.firstName} {u.lastName}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {u.email}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {u.phone || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  u.membershipStatus === "active"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {u.membershipStatus === "active"
                                  ? "Activa"
                                  : "Inactiva"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/admin/usuarios/${u.id}`}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  <UserCircle className="size-4" />
                                  Ver Perfil
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Mostrando{" "}
                      {users.length === 0
                        ? 0
                        : (page - 1) * PAGE_SIZE + 1}{" "}
                      –{" "}
                      {(page - 1) * PAGE_SIZE + users.length} de {totalUsers} miembros
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <span>
                        Página {page} de {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Detail */}
            <div>
              <Card className="sticky top-24 border-border/50">
                <CardHeader>
                  <CardTitle>Detalles del Miembro</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12">
                            <AvatarFallback className="bg-primary/10 font-bold text-primary">
                              {selectedUser.firstName[0]}
                              {selectedUser.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">
                              {selectedUser.firstName} {selectedUser.lastName}
                            </p>
                            <Badge variant="secondary" className="mt-1 text-xs capitalize">
                              {selectedUser.role}
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Cerrar detalles"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-secondary/30 p-4">
                        <DetailRow label="Correo" value={selectedUser.email} />
                        <DetailRow label="Telefono" value={selectedUser.phone} />
                        <DetailRow
                          label="Estado"
                          value={
                            <Badge
                              variant="secondary"
                              className={
                                selectedUser.membershipStatus === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {selectedUser.membershipStatus}
                            </Badge>
                          }
                        />
                        <DetailRow
                          label="Registro"
                          value={new Date(
                            selectedUser.joinDate
                          ).toLocaleDateString("es-ES", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        />
                        <DetailRow label="ID" value={selectedUser.id} />
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Selecciona un miembro para ver sus detalles
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  )
}
