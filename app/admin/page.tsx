"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getAllUsers } from "@/lib/api"
import type { User } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  Users,
  UserCheck,
  UserX,
  X,
} from "lucide-react"

function AdminContent() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  const activeCount = users.filter((u) => u.membershipStatus === "active").length
  const inactiveCount = users.filter((u) => u.membershipStatus === "inactive").length

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
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
                  <div className="flex flex-col gap-2">
                    {filtered.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No se encontraron miembros
                      </p>
                    )}
                    {filtered.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/50 ${
                          selectedUser?.id === u.id
                            ? "border-primary/40 bg-secondary/50"
                            : "border-border/50"
                        }`}
                      >
                        <Avatar className="size-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {u.firstName[0]}
                            {u.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            u.membershipStatus === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {u.membershipStatus}
                        </Badge>
                      </button>
                    ))}
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
