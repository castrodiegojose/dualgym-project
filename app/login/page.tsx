"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Loader2 } from "lucide-react"

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.email || !form.password) {
      setError("Por favor completa todos los campos")
      return
    }

    const result = await login(form)
    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Error al iniciar sesion")
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="size-6 text-primary" />
            </div>
            <CardTitle
              className="text-2xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              BIENVENIDO DE NUEVO
            </CardTitle>
            <CardDescription>
              Inicia sesion en tu cuenta de Dual Gym
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Correo Electronico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contrasena</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Olvidaste tu contrasena?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contrasena"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>

              <Button type="submit" className="mt-2 w-full font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Iniciando sesion...
                  </>
                ) : (
                  "Iniciar Sesion"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {"No tienes una cuenta? "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Registrarse
                </Link>
              </p>

              {/* Demo credentials hint */}
              <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Cuentas de Prueba:
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin: admin@dualgym.com / admin123
                </p>
                <p className="text-xs text-muted-foreground">
                  Member: john@example.com / password123
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
