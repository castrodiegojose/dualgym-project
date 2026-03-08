"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import {
  getAllUsers,
  getAllSubscriptions,
  getAllPayments,
  getPlans,
} from "@/lib/api"
import type { User, Subscription, Payment, Plan } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Loader2,
  Users,
  CalendarClock,
  DollarSign,
  AlertCircle,
  UserCircle,
  Search,
} from "lucide-react"

const DAYS_UNTIL_WARNING = 7

type MembershipBadgeStatus = "activo" | "vencido" | "proximo"

function getMembershipBadgeStatus(
  sub: Subscription | null,
  today: string
): MembershipBadgeStatus | null {
  if (!sub) return null
  const end = sub.currentPeriodEnd ?? ""
  if (sub.status !== "active") return "vencido"
  if (end < today) return "vencido"
  const warningEnd = new Date(today)
  warningEnd.setDate(warningEnd.getDate() + DAYS_UNTIL_WARNING)
  const warningEndStr = warningEnd.toISOString().split("T")[0]
  if (end <= warningEndStr) return "proximo"
  return "activo"
}

function ReportesContent() {
  const [users, setUsers] = useState<User[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterPlanId, setFilterPlanId] = useState<string>("todos")
  const [filterVencimiento, setFilterVencimiento] = useState<string>("todos")

  useEffect(() => {
    Promise.all([
      getAllUsers(),
      getAllSubscriptions(),
      getAllPayments(),
      getPlans(),
    ])
      .then(([u, s, p, pl]) => {
        setUsers(u)
        setSubscriptions(s)
        setPayments(p)
        setPlans(pl)
      })
      .finally(() => setLoading(false))
  }, [])

  const today = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  )

  const paymentsByProfile = useMemo(() => {
    const map = new Map<string, Payment[]>()
    for (const pay of payments) {
      const list = map.get(pay.profileId) ?? []
      list.push(pay)
      map.set(pay.profileId, list)
    }
    return map
  }, [payments])

  const subscriptionsByProfile = useMemo(() => {
    const map = new Map<string, Subscription[]>()
    for (const sub of subscriptions) {
      const list = map.get(sub.profileId) ?? []
      list.push(sub)
      map.set(sub.profileId, list)
    }
    return map
  }, [subscriptions])

  const currentOrLatestSubscription = (profileId: string): Subscription | null => {
    const list = subscriptionsByProfile.get(profileId) ?? []
    const active = list.filter(
      (s) => s.status === "active" && (s.currentPeriodEnd ?? "") >= today
    )
    if (active.length > 0) {
      active.sort(
        (a, b) =>
          (b.currentPeriodEnd ?? "").localeCompare(a.currentPeriodEnd ?? "")
      )
      return active[0]
    }
    if (list.length > 0) {
      list.sort(
        (a, b) =>
          (b.currentPeriodEnd ?? "").localeCompare(a.currentPeriodEnd ?? "")
      )
      return list[0]
    }
    return null
  }

  const lastPayment = (profileId: string): Payment | null => {
    const list = paymentsByProfile.get(profileId) ?? []
    return list[0] ?? null
  }

  const metrics = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0]
    const warningEnd = new Date(today)
    warningEnd.setDate(warningEnd.getDate() + DAYS_UNTIL_WARNING)
    const warningEndStr = warningEnd.toISOString().split("T")[0]

    let usuariosActivos = 0
    let membresiasPorVencer = 0
    let ingresosMes = 0
    let pagosPendientes = 0

    const profileIdsWithActive = new Set<string>()
    for (const sub of subscriptions) {
      if (sub.status !== "active") continue
      const end = sub.currentPeriodEnd ?? ""
      if (end >= today) {
        profileIdsWithActive.add(sub.profileId)
        if (end <= warningEndStr) {
          membresiasPorVencer++
        }
      }
    }
    usuariosActivos = profileIdsWithActive.size

    for (const pay of payments) {
      if (pay.status === "succeeded" && pay.createdAt >= monthStart) {
        ingresosMes += pay.amountCents
      }
      if (pay.status === "pending") pagosPendientes++
    }

    return {
      usuariosActivos,
      membresiasPorVencer,
      ingresosMes,
      pagosPendientes,
    }
  }, [subscriptions, payments, today])

  const rows = useMemo(() => {
    return users.map((user) => {
      const sub = currentOrLatestSubscription(user.id)
      const lastPay = lastPayment(user.id)
      const badgeStatus = getMembershipBadgeStatus(sub, today)
      return {
        user,
        subscription: sub,
        lastPayment: lastPay,
        badgeStatus,
      }
    })
  }, [users, subscriptionsByProfile, paymentsByProfile, today])

  const filteredRows = useMemo(() => {
    let list = rows
    const q = search.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (r) =>
          r.user.firstName.toLowerCase().includes(q) ||
          r.user.lastName.toLowerCase().includes(q) ||
          r.user.email.toLowerCase().includes(q)
      )
    }
    if (filterEstado !== "todos") {
      list = list.filter((r) => r.badgeStatus === filterEstado)
    }
    if (filterPlanId !== "todos") {
      list = list.filter((r) => r.subscription?.planId === filterPlanId)
    }
    if (filterVencimiento === "vencidas") {
      list = list.filter((r) => r.badgeStatus === "vencido")
    }
    if (filterVencimiento === "por_vencer") {
      list = list.filter((r) => r.badgeStatus === "proximo")
    }
    if (filterVencimiento === "vigentes") {
      list = list.filter((r) => r.badgeStatus === "activo")
    }
    return list
  }, [rows, search, filterEstado, filterPlanId, filterVencimiento])

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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
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
                Reporte de Pagos y Membresías
              </h1>
              <p className="text-sm text-muted-foreground">
                Vista global de usuarios, membresías y pagos
              </p>
            </div>
          </div>

          {/* Dashboard de métricas */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.usuariosActivos}</p>
                  <p className="text-sm text-muted-foreground">
                    Usuarios activos
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <CalendarClock className="size-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {metrics.membresiasPorVencer}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Membresías por vencer
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {((metrics.ingresosMes / 100)).toLocaleString("es-ES", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ingresos del mes
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertCircle className="size-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.pagosPendientes}</p>
                  <p className="text-sm text-muted-foreground">
                    Pagos pendientes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla y filtros */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Vista global de usuarios</CardTitle>
              <CardDescription>
                Estado de membresía, fechas y último pago por usuario
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado membresía" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="proximo">Próximo a vencer</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPlanId} onValueChange={setFilterPlanId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los planes</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterVencimiento}
                  onValueChange={setFilterVencimiento}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Vencimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Cualquier vencimiento</SelectItem>
                    <SelectItem value="vigentes">Vigentes</SelectItem>
                    <SelectItem value="por_vencer">Por vencer</SelectItem>
                    <SelectItem value="vencidas">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Pago</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No hay resultados
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRows.map(({ user, subscription, lastPayment: lp, badgeStatus }) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {subscription?.planName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {subscription?.currentPeriodStart
                            ? new Date(
                                subscription.currentPeriodStart
                              ).toLocaleDateString("es-ES")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {subscription?.currentPeriodEnd
                            ? new Date(
                                subscription.currentPeriodEnd
                              ).toLocaleDateString("es-ES")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {badgeStatus === "activo" && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Activo
                            </Badge>
                          )}
                          {badgeStatus === "proximo" && (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                              Próximo a vencer
                            </Badge>
                          )}
                          {badgeStatus === "vencido" && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                              Vencido
                            </Badge>
                          )}
                          {!badgeStatus && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lp
                            ? new Date(lp.createdAt).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {lp
                            ? (lp.amountCents / 100).toLocaleString("es-ES", {
                                style: "currency",
                                currency: lp.currency,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/admin/usuarios/${user.id}`}
                              className="inline-flex items-center gap-1.5"
                            >
                              <UserCircle className="size-4" />
                              Ver perfil
                            </Link>
                          </Button>
                        </TableCell>
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
    </div>
  )
}

export default function AdminReportesPage() {
  return (
    <AuthGuard requireAdmin requireSuperAdmin>
      <ReportesContent />
    </AuthGuard>
  )
}
