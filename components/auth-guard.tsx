"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
    if (!isLoading && requireAdmin && user?.role !== "admin") {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, requireAdmin, user, router])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requireAdmin && user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
