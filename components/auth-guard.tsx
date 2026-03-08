"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: ReactNode
  /** Acceso al panel admin: admin o superadmin */
  requireAdmin?: boolean
  /** Solo superadmin (p. ej. /admin/reportes). Implica requireAdmin. */
  requireSuperAdmin?: boolean
}

const isAdminRole = (role: string) => role === "admin" || role === "superadmin"

export function AuthGuard({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
}: AuthGuardProps) {
  const { isAuthenticated, user, isLoading, isSessionReady, refreshSession } = useAuth()
  const router = useRouter()
  const hasTriedRefresh = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Si la sesión está lista pero no hay user (p. ej. navegación client-side), intentar rehidratar una vez
  useEffect(() => {
    if (!isSessionReady || isLoading || isAuthenticated) return
    if (hasTriedRefresh.current) return
    hasTriedRefresh.current = true
    setIsRefreshing(true)
    refreshSession().finally(() => setIsRefreshing(false))
  }, [isSessionReady, isLoading, isAuthenticated, refreshSession])

  useEffect(() => {
    if (!isSessionReady || isLoading || isRefreshing) return
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (requireAdmin && !user?.role) {
      router.push("/dashboard")
      return
    }
    if (requireAdmin && !isAdminRole(user?.role ?? "")) {
      router.push("/dashboard")
      return
    }
    if (requireSuperAdmin && user?.role !== "superadmin") {
      router.push("/admin")
    }
  }, [isSessionReady, isLoading, isRefreshing, isAuthenticated, requireAdmin, requireSuperAdmin, user, router])

  if (!isSessionReady || (!isAuthenticated && isSessionReady) || isRefreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requireAdmin && !isAdminRole(user?.role ?? "")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requireSuperAdmin && user?.role !== "superadmin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
