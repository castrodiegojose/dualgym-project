"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Dumbbell, Menu, X, LogOut, User, LayoutDashboard, Shield } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Dumbbell className="size-7 text-primary" />
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            DUAL GYM
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  Panel
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <User className="size-4" />
                  Perfil
                </Link>
              </Button>
              {user?.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">
                    <Shield className="size-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4" />
                Salir
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Iniciar Sesion</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Registrarse</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2 pt-2">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" className="justify-start" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" />
                    Panel
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-start" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/profile">
                    <User className="size-4" />
                    Perfil
                  </Link>
                </Button>
                {user?.role === "admin" && (
                  <Button variant="ghost" className="justify-start" asChild onClick={() => setMobileOpen(false)}>
                    <Link href="/admin">
                      <Shield className="size-4" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" className="justify-start" onClick={() => { logout(); setMobileOpen(false) }}>
                  <LogOut className="size-4" />
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="justify-start" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/login">Iniciar Sesion</Link>
                </Button>
                <Button className="justify-start" asChild onClick={() => setMobileOpen(false)}>
                  <Link href="/register">Registrarse</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
