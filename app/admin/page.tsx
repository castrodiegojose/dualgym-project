"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getAllUsers, createMember } from "@/lib/api"
import type { User } from "@/lib/types"
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
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")
  const [memberForm, setMemberForm] = useState({
    numeroSocio: "",
    dni: "",
    firstName: "",
    lastName: "",
    telefono: "",
    celular: "",
    direccion: "",
    localidad: "",
    provincia: "",
    fechaIngreso: "",
  })

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.dni ?? "").toLowerCase().includes(q)
    )
  })

  const activeCount = users.filter((u) => u.membershipStatus === "active").length
  const inactiveCount = users.filter((u) => u.membershipStatus === "inactive").length

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
                  <p className="text-2xl font-bold">{users.length}</p>
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
                  <p className="text-2xl font-bold">{activeCount}</p>
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
                  <p className="text-2xl font-bold">{inactiveCount}</p>
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
                    if (!memberForm.dni.trim()) {
                      setCreateError("El DNI es obligatorio.")
                      return
                    }
                    if (!memberForm.firstName.trim() || !memberForm.lastName.trim()) {
                      setCreateError("Nombre y apellido son obligatorios.")
                      return
                    }
                    setCreating(true)
                    const result = await createMember({
                      numeroSocio: memberForm.numeroSocio.trim() || null,
                      dni: memberForm.dni.trim(),
                      firstName: memberForm.firstName.trim(),
                      lastName: memberForm.lastName.trim(),
                      telefono: memberForm.telefono.trim() || null,
                      celular: memberForm.celular.trim() || null,
                      direccion: memberForm.direccion.trim() || null,
                      localidad: memberForm.localidad.trim() || null,
                      provincia: memberForm.provincia.trim() || null,
                      fechaIngreso: memberForm.fechaIngreso || null,
                    })
                    setCreating(false)
                    if (!result.success) {
                      setCreateError(result.error || "No se pudo crear el miembro.")
                      return
                    }
                    setCreateSuccess("Miembro creado correctamente.")
                    setMemberForm({
                      numeroSocio: "",
                      dni: "",
                      firstName: "",
                      lastName: "",
                      telefono: "",
                      celular: "",
                      direccion: "",
                      localidad: "",
                      provincia: "",
                      fechaIngreso: "",
                    })
                    getAllUsers().then(setUsers).catch(() => {})
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Número de socio
                    </label>
                    <Input
                      value={memberForm.numeroSocio}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, numeroSocio: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      DNI *
                    </label>
                    <Input
                      value={memberForm.dni}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, dni: e.target.value }))
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
                      value={memberForm.telefono}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, telefono: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Celular
                    </label>
                    <Input
                      value={memberForm.celular}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, celular: e.target.value }))
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
