"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import {
  User,
  CreditCard,
  Activity,
  Crown,
  CalendarDays,
  ArrowRight,
} from "lucide-react"

function DashboardContent() {
  const { user } = useAuth()

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`
  const isActive = user.membershipStatus === "active"

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              BIENVENIDO,{" "}
              <span className="text-primary">
                {user.firstName.toUpperCase()}
              </span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Aqui tienes un resumen de tu membresia en Dual Gym.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Membership Status */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Estado de Membresia
                  </CardTitle>
                  <Crown className="size-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {isActive ? "Activa" : "Inactiva"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {isActive ? "Acceso completo" : "Renueva para acceder"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Member Since */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Miembro Desde
                  </CardTitle>
                  <CalendarDays className="size-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Date(user.joinDate).toLocaleDateString("es-ES", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Workouts this month */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Entrenamientos Este Mes
                  </CardTitle>
                  <Activity className="size-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">+3 respecto al mes pasado</p>
              </CardContent>
            </Card>
          </div>

          {/* Profile Summary + Actions */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Profile Summary */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Resumen de Perfil</CardTitle>
                <CardDescription>Informacion de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <p className="text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Acciones Rapidas</CardTitle>
                <CardDescription>Administra tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="justify-between" asChild>
                    <Link href="/profile">
                      <span className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        Editar Perfil
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-between" disabled>
                    <span className="flex items-center gap-2">
                      <Crown className="size-4 text-primary" />
                      Ver Membresia
                    </span>
                    <Badge variant="secondary" className="text-xs">Proximamente</Badge>
                  </Button>
                  <Button variant="outline" className="justify-between" disabled>
                    <span className="flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      Pagos
                    </span>
                    <Badge variant="secondary" className="text-xs">Proximamente</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
