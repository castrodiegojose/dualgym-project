import type { User, RegisterData, LoginData } from "./types"

// Simulated delay to mimic real API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// In-memory store (will be replaced by real backend)
let users: (User & { password: string })[] = [
  {
    id: "1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@dualgym.com",
    phone: "+1 555-0100",
    role: "admin",
    membershipStatus: "active",
    joinDate: "2024-01-15",
    password: "admin123",
  },
  {
    id: "2",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1 555-0101",
    role: "member",
    membershipStatus: "active",
    joinDate: "2024-06-01",
    password: "password123",
  },
  {
    id: "3",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    phone: "+1 555-0102",
    role: "member",
    membershipStatus: "inactive",
    joinDate: "2024-03-10",
    password: "password123",
  },
  {
    id: "4",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike@example.com",
    phone: "+1 555-0103",
    role: "member",
    membershipStatus: "active",
    joinDate: "2025-01-20",
    password: "password123",
  },
]

export async function loginUser(
  data: LoginData
): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(800)
  const found = users.find(
    (u) => u.email === data.email && u.password === data.password
  )
  if (!found) {
    return { success: false, error: "Correo o contrasena incorrectos" }
  }
  const { password: _, ...user } = found
  return { success: true, user }
}

export async function registerUser(
  data: RegisterData
): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(800)
  const exists = users.find((u) => u.email === data.email)
  if (exists) {
    return { success: false, error: "Ya existe una cuenta con este correo" }
  }
  const newUser: User & { password: string } = {
    id: String(users.length + 1),
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    role: "member",
    membershipStatus: "active",
    joinDate: new Date().toISOString().split("T")[0],
    password: data.password,
  }
  users.push(newUser)
  const { password: _, ...user } = newUser
  return { success: true, user }
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(600)
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) {
    return { success: false, error: "Usuario no encontrado" }
  }
  users[index] = { ...users[index], ...data }
  const { password: _, ...user } = users[index]
  return { success: true, user }
}

export async function getAllUsers(): Promise<User[]> {
  await delay(500)
  return users.map(({ password: _, ...user }) => user)
}

export async function getUserById(
  id: string
): Promise<User | null> {
  await delay(300)
  const found = users.find((u) => u.id === id)
  if (!found) return null
  const { password: _, ...user } = found
  return user
}
