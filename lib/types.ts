export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: "member" | "admin"
  membershipStatus: "active" | "inactive"
  joinDate: string
  avatarUrl?: string
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
