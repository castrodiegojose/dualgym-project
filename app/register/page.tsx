"use client"

import { useState, useEffect } from "react"
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

export default function RegisterPage() {
  const { isAuthenticated, isSessionReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isSessionReady && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isSessionReady, isAuthenticated, router])

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
              Registro deshabilitado
            </CardTitle>
            <CardDescription>
              Actualmente no es posible crear cuentas desde la web. Contacta al gimnasio para que un administrador registre tu acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Si ya sos socio, podes ingresar desde la pantalla de inicio de sesión usando tu DNI.
              </p>
              <Button asChild>
                <Link href="/login">Ir al inicio de sesión</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
