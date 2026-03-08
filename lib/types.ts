export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: "member" | "admin" | "superadmin"
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

export interface Plan {
  id: string
  name: string
  description: string | null
  priceCents: number
  currency: string
  interval: "month" | "year"
  active: boolean
}

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "unpaid"

export interface Subscription {
  id: string
  profileId: string
  planId: string
  planName?: string
  status: SubscriptionStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
}

export type PaymentStatus = "succeeded" | "pending" | "failed" | "refunded"

export interface Payment {
  id: string
  profileId: string
  amountCents: number
  currency: string
  status: PaymentStatus
  method: string
  notes?: string
  createdAt: string
}
