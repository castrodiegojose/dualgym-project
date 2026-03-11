"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import {
  getUserById,
  updateUser,
  deleteUserById,
  getPlans,
  getSubscriptionsByProfileId,
  getPaymentsByProfileId,
  createSubscription,
  updateSubscription,
  createPayment,
} from "@/lib/api"
import type { User, Plan, Subscription, Payment } from "@/lib/types"
import { addDaysToDate } from "@/lib/utils"
import { formSchemaMemberDni } from "@/lib/validations"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Loader2, PlusCircle, Save } from "lucide-react"

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "transferencia", label: "Transferencia" },
] as const

const ROLE_OPTIONS = [
  { value: "member" as const, label: "Usuario" },
  { value: "admin" as const, label: "Admin" },
  { value: "superadmin" as const, label: "Superadmin" },
]

function AdminUserProfileContent() {
  const params = useParams()
  const userId = typeof params.id === "string" ? params.id : ""
  const router = useRouter()
  const { user: authUser } = useAuth()

  const [user, setUser] = useState<User | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form: user info (todos los campos editables del perfil)
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editNumeroSocio, setEditNumeroSocio] = useState("")
  const [editDni, setEditDni] = useState("")
  const [editDireccion, setEditDireccion] = useState("")
  const [editLocalidad, setEditLocalidad] = useState("")
  const [editProvincia, setEditProvincia] = useState("")
  const [editFechaNacimiento, setEditFechaNacimiento] = useState("")
  const [editFechaIngreso, setEditFechaIngreso] = useState("")
  const [editRole, setEditRole] = useState<User["role"]>("member")
  const [savingUser, setSavingUser] = useState(false)
  const [userMessage, setUserMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dniError, setDniError] = useState<string | null>(null)

  // Form: nueva o actualización de membresía
  const [subPlanId, setSubPlanId] = useState("")
  const [subStartDate, setSubStartDate] = useState("")
  const [subEndDate, setSubEndDate] = useState("")
  const [membershipFormMode, setMembershipFormMode] = useState<"edit" | "create">("create")
  const [savingSub, setSavingSub] = useState(false)
  const [subMessage, setSubMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Dialog: new payment
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState<string>("efectivo")
  const [payNotes, setPayNotes] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [userRes, plansRes, subsRes, paysRes] = await Promise.all([
        getUserById(userId),
        getPlans(),
        getSubscriptionsByProfileId(userId),
        getPaymentsByProfileId(userId),
      ])
      if (!userRes) {
        setError("Usuario no encontrado")
        return
      }
      setUser(userRes)
      setEditFirstName(userRes.firstName)
      setEditLastName(userRes.lastName)
      setEditPhone(userRes.phone ?? "")
      setEditNumeroSocio(userRes.numeroSocio ?? "")
      setEditDni(userRes.dni ?? "")
      setEditDireccion(userRes.direccion ?? "")
      setEditLocalidad(userRes.localidad ?? "")
      setEditProvincia(userRes.provincia ?? "")
      setEditFechaNacimiento(userRes.fechaNacimiento ?? "")
      setEditFechaIngreso(userRes.fechaIngreso ?? "")
      setEditRole(userRes.role)
      setPlans(plansRes)
      setSubscriptions(subsRes)
      setPayments(paysRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Prellenar formulario de membresía si ya tiene una (modo actualizar)
  useEffect(() => {
    if (subscriptions.length > 0 && plans.length > 0) {
      const first = subscriptions[0]
      setSubPlanId(first.planId)
      setSubStartDate(first.currentPeriodStart ?? "")
      setMembershipFormMode("edit")
    } else {
      setSubPlanId("")
      setSubStartDate("")
      setSubEndDate("")
      setMembershipFormMode("create")
    }
  }, [subscriptions, plans])

  // Calcular fecha fin de membresía según plan.durationDays
  useEffect(() => {
    if (!subPlanId || !subStartDate) {
      if (!subPlanId && !subStartDate) setSubEndDate("")
      return
    }
    const plan = plans.find((p) => p.id === subPlanId)
    if (!plan) return
    const days = plan.durationDays ?? 30
    setSubEndDate(addDaysToDate(subStartDate, days))
  }, [subPlanId, subStartDate, plans])

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setDniError(null)
    const dniTrimmed = editDni.trim()
    if (dniTrimmed) {
      const dniResult = formSchemaMemberDni.safeParse({ dni: dniTrimmed })
      if (!dniResult.success) {
        const msg = dniResult.error.errors[0]?.message ?? "DNI inválido."
        setDniError(msg)
        return
      }
    }
    setSavingUser(true)
    setUserMessage(null)
    const payload: Parameters<typeof updateUser>[1] = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() || undefined,
      numeroSocio: editNumeroSocio.trim() || undefined,
      dni: dniTrimmed || undefined,
      direccion: editDireccion.trim() || undefined,
      localidad: editLocalidad.trim() || undefined,
      provincia: editProvincia.trim() || undefined,
      fechaNacimiento: editFechaNacimiento.trim() || undefined,
      fechaIngreso: editFechaIngreso.trim() || undefined,
    }
    if (authUser?.role === "superadmin" && authUser.id !== user.id) {
      payload.role = editRole
    }
    const result = await updateUser(user.id, payload)
    setSavingUser(false)
    if (result.success && result.user) {
      setUser(result.user)
      setEditRole(result.user.role)
      setEditNumeroSocio(result.user.numeroSocio ?? "")
      setEditDni(result.user.dni ?? "")
      setEditDireccion(result.user.direccion ?? "")
      setEditLocalidad(result.user.localidad ?? "")
      setEditProvincia(result.user.provincia ?? "")
      setEditFechaNacimiento(result.user.fechaNacimiento ?? "")
      setEditFechaIngreso(result.user.fechaIngreso ?? "")
      setUserMessage({ type: "success", text: "Cambios guardados." })
    } else {
      setUserMessage({ type: "error", text: result.error ?? "Error al guardar" })
    }
  }

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !subPlanId || !subStartDate || !subEndDate) {
      setSubMessage({ type: "error", text: "Completa plan, fecha inicio y fecha fin." })
      return
    }
    setSavingSub(true)
    setSubMessage(null)
    const isUpdate =
      membershipFormMode === "edit" && subscriptions.length > 0 && subscriptions[0]?.id
    const result = isUpdate
      ? await updateSubscription(subscriptions[0].id, {
          planId: subPlanId,
          startDate: subStartDate,
          endDate: subEndDate,
        })
      : await createSubscription({
          profileId: userId,
          planId: subPlanId,
          startDate: subStartDate,
          endDate: subEndDate,
        })
    setSavingSub(false)
    if (result.success) {
      setSubMessage({
        type: "success",
        text: isUpdate ? "Membresía actualizada." : "Membresía creada.",
      })
      if (!isUpdate) {
        setSubPlanId("")
        setSubStartDate("")
        setSubEndDate("")
      }
      loadData()
    } else {
      setSubMessage({ type: "error", text: result.error ?? "Error al guardar" })
    }
  }

  const handleDeleteUser = async () => {
    if (!user || !authUser) return
    if (authUser.id === user.id) {
      setUserMessage({
        type: "error",
        text: "No puedes eliminar tu propio usuario.",
      })
      return
    }
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer."
    )
    if (!confirmDelete) return
    setDeletingUser(true)
    const result = await deleteUserById(user.id)
    setDeletingUser(false)
    if (!result.success) {
      setUserMessage({
        type: "error",
        text: result.error ?? "No se pudo eliminar el usuario.",
      })
      return
    }
    router.replace("/admin")
  }
  const handleSwitchToNewMembership = () => {
    setMembershipFormMode("create")
    setSubPlanId("")
    setSubStartDate("")
    setSubEndDate("")
    setSubMessage(null)
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(payAmount) * 100)
    if (!userId || !payAmount || isNaN(amount) || amount <= 0) {
      return
    }
    setSavingPayment(true)
    const result = await createPayment({
      profileId: userId,
      amountCents: amount,
      method: payMethod,
      notes: payNotes.trim() || undefined,
    })
    setSavingPayment(false)
    if (result.success) {
      setPaymentOpen(false)
      setPayAmount("")
      setPayMethod("efectivo")
      setPayNotes("")
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="size-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <p className="text-muted-foreground">{error ?? "Usuario no encontrado"}</p>
          <Button variant="outline" asChild>
            <Link href="/admin">Volver al panel</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin" aria-label="Volver">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight md:text-3xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Perfil de Usuario
              </h1>
              <p className="text-sm text-muted-foreground">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>

          {/* 1. Información del Usuario */}
          <Card className="mb-6 border-border/50">
            <CardHeader>
              <CardTitle>Información del Usuario</CardTitle>
              <CardDescription>Datos personales editables del perfil.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} disabled className="bg-muted" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Teléfono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroSocio">Número de socio</Label>
                    <Input
                      id="numeroSocio"
                      value={editNumeroSocio}
                      onChange={(e) => setEditNumeroSocio(e.target.value)}
                      placeholder="Ej. 001"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={editDni}
                      onChange={(e) => {
                        setEditDni(e.target.value)
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
                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={editFechaNacimiento}
                      onChange={(e) => setEditFechaNacimiento(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={editDireccion}
                    onChange={(e) => setEditDireccion(e.target.value)}
                    placeholder="Calle, número"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="localidad">Localidad</Label>
                    <Input
                      id="localidad"
                      value={editLocalidad}
                      onChange={(e) => setEditLocalidad(e.target.value)}
                      placeholder="Localidad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={editProvincia}
                      onChange={(e) => setEditProvincia(e.target.value)}
                      placeholder="Provincia"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaIngreso">Fecha de ingreso</Label>
                  <Input
                    id="fechaIngreso"
                    type="date"
                    value={editFechaIngreso}
                    onChange={(e) => setEditFechaIngreso(e.target.value)}
                  />
                </div>
                {authUser?.role === "superadmin" && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    {authUser.id === user.id ? (
                      <Input
                        id="role"
                        value={ROLE_OPTIONS.find((o) => o.value === user.role)?.label ?? user.role}
                        disabled
                        className="bg-muted capitalize"
                      />
                    ) : (
                      <Select
                        value={editRole}
                        onValueChange={(v) => setEditRole(v as User["role"])}
                      >
                        <SelectTrigger id="role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solo visible para superadmin. No puedes cambiar tu propio rol.
                    </p>
                  </div>
                )}
                {userMessage && (
                  <p
                    className={
                      userMessage.type === "success"
                        ? "text-sm text-emerald-600 dark:text-emerald-400"
                        : "text-sm text-destructive"
                    }
                  >
                    {userMessage.text}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={savingUser} className="gap-2">
                    {savingUser ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Guardar cambios</span>
                      </>
                    )}
                  </Button>
                  {authUser?.role && authUser.role !== "member" && authUser.id !== user.id && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deletingUser}
                      onClick={handleDeleteUser}
                    >
                      {deletingUser ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Eliminar usuario"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 2. Gestión de Membresía */}
          <Card className="mb-6 border-border/50">
            <CardHeader>
              <CardTitle>Gestión de Membresía</CardTitle>
              <CardDescription>
                {subscriptions.length > 0
                  ? membershipFormMode === "edit"
                    ? "Actualiza la membresía actual o crea una nueva."
                    : "Crear una nueva membresía para este usuario."
                  : "El usuario no tiene membresía. Crea una nueva."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length > 0 && (
                <div className="mb-6 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Membresías
                  </p>
                  <ul className="space-y-1 text-sm">
                    {subscriptions.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.planName ?? s.planId}</span>
                        <span className="text-muted-foreground">
                          {s.currentPeriodStart
                            ? new Date(s.currentPeriodStart).toLocaleDateString("es-ES")
                            : "—"}
                          {" – "}
                          {s.currentPeriodEnd
                            ? new Date(s.currentPeriodEnd).toLocaleDateString("es-ES")
                            : "—"}
                        </span>
                        <span className="capitalize text-muted-foreground">({s.status})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <form onSubmit={handleSaveSubscription} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={subPlanId} onValueChange={setSubPlanId}>
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
                  <div className="space-y-2">
                    <Label htmlFor="subStart">Fecha inicio</Label>
                    <Input
                      id="subStart"
                      type="date"
                      value={subStartDate}
                      onChange={(e) => setSubStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subEnd">Fecha fin</Label>
                    <Input
                      id="subEnd"
                      type="date"
                      value={subEndDate}
                      readOnly
                      className="bg-muted"
                      title="Se calcula automáticamente según el plan (mensual o anual)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Calculada según el plan seleccionado
                    </p>
                  </div>
                </div>
                {subMessage && (
                  <p
                    className={
                      subMessage.type === "success"
                        ? "text-sm text-emerald-600 dark:text-emerald-400"
                        : "text-sm text-destructive"
                    }
                  >
                    {subMessage.text}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={savingSub}>
                    {savingSub ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : membershipFormMode === "edit" && subscriptions.length > 0 ? (
                      "Actualizar membresía"
                    ) : (
                      "Crear membresía"
                    )}
                  </Button>
                  {subscriptions.length > 0 && membershipFormMode === "edit" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSwitchToNewMembership}
                    >
                      Crear nueva membresía
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. Historial de Pagos */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Historial de Pagos</CardTitle>
                  <CardDescription>Pagos registrados del usuario.</CardDescription>
                </div>
                <Button onClick={() => setPaymentOpen(true)}>
                  <PlusCircle className="size-4" />
                  Agregar Pago
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Método de pago</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No hay pagos registrados
                        </TableCell>
                      </TableRow>
                    )}
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.createdAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {(p.amountCents / 100).toLocaleString("es-ES", {
                            style: "currency",
                            currency: p.currency,
                          })}
                        </TableCell>
                        <TableCell className="capitalize">{p.method}</TableCell>
                        <TableCell className="capitalize">{p.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Dialog: Agregar Pago */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="payAmount">Monto</Label>
              <Input
                id="payAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payNotes">Notas</Label>
              <Input
                id="payNotes"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingPayment || !payAmount}>
                {savingPayment ? <Loader2 className="size-4 animate-spin" /> : "Guardar pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminUserProfilePage() {
  return (
    <AuthGuard requireAdmin>
      <AdminUserProfileContent />
    </AuthGuard>
  )
}
