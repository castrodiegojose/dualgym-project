"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { User, LoginData, RegisterData } from "./types"
import { supabase } from "./supabaseClient"
import { loginUser, registerUser, updateUser, getCurrentUserFromSession } from "./api"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /** False hasta terminar la primera comprobación de sesión (evita redirigir a login antes de saber si hay sesión). */
  isSessionReady: boolean
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>
  /** Login para socios usando solo DNI (sin Supabase Auth). */
  loginSocio: (dni: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  /** Relee la sesión de Supabase y actualiza user (útil al montar rutas protegidas). */
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionReady, setIsSessionReady] = useState(false)

  const LOGIN_TIMEOUT_MS = 25_000

  const login = useCallback(async (data: LoginData) => {
    setIsLoading(true)
    try {
      const result = await new Promise<Awaited<ReturnType<typeof loginUser>>>(
        (resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo.")),
            LOGIN_TIMEOUT_MS
          )
          loginUser(data)
            .then((r) => {
              clearTimeout(timer)
              resolve(r)
            })
            .catch((err) => {
              clearTimeout(timer)
              reject(err)
            })
        }
      )
      if (result.success && result.user) {
        setUser(result.user)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Error al conectar. Revisa tu red e intenta de nuevo.",
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)
    try {
      const result = await registerUser(data)
      if (result.success && result.user) {
        setUser(result.user)
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Error al conectar. Revisa tu red e intenta de nuevo.",
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const loginSocio = useCallback(async (dni: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/login-socio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      })
      const data = await res.json()
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "No se pudo iniciar sesión",
        }
      }

      const socioUser: User = {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: "",
        phone: data.telefono || data.celular || "",
        avatarUrl: undefined,
        numeroSocio: data.numeroSocio ?? null,
        dni: data.dni ?? dni,
        direccion: data.direccion ?? null,
        localidad: data.localidad ?? null,
        provincia: data.provincia ?? null,
        fechaNacimiento: null,
        fechaIngreso: data.fechaIngreso ?? null,
        role: "member",
        membershipStatus: "inactive",
        joinDate: data.fechaIngreso ?? new Date().toISOString().split("T")[0],
      }

      setUser(socioUser)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Error al conectar. Revisa tu red e intenta de nuevo.",
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const u = await getCurrentUserFromSession()
    setUser(u ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    getCurrentUserFromSession()
      .then((u) => {
        if (!cancelled) setUser(u ?? null)
      })
      .finally(() => {
        if (!cancelled) setIsSessionReady(true)
      })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = await getCurrentUserFromSession()
        if (!cancelled) setUser(u ?? null)
      } else {
        if (!cancelled) setUser(null)
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return { success: false, error: "No autenticado" }
      setIsLoading(true)
      try {
        const result = await updateUser(user.id, data)
        if (result.success && result.user) {
          setUser(result.user)
          return { success: true }
        }
        return { success: false, error: result.error }
      } finally {
        setIsLoading(false)
      }
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSessionReady,
        login,
        loginSocio,
        register,
        logout,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
