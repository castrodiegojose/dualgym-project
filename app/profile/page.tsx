"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Check, Camera } from "lucide-react"

function ProfileContent() {
  const { user, updateProfile, isLoading } = useAuth()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      })
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)

    const result = await updateProfile(form)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(result.error || "Error al actualizar")
    }
  }

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="mb-8">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              TU <span className="text-primary">PERFIL</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Actualiza tu informacion personal
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Avatar Card */}
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-6 pt-6">
                <div className="relative">
                  <Avatar className="size-20">
                    <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Cambiar avatar"
                  >
                    <Camera className="size-4" />
                  </button>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {user.role} &middot; Miembro desde{" "}
                    {new Date(user.joinDate).toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Informacion Personal</CardTitle>
                <CardDescription>
                  Actualiza tus datos y haz clic en guardar para aplicar los cambios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                      <Check className="size-4" />
                      Perfil actualizado correctamente
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Correo Electronico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      className="font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar Cambios"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}
