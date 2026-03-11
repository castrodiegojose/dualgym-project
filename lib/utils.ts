import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Fecha en zona horaria local como YYYY-MM-DD (evita desfase UTC, ej. Argentina). */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Suma días a una fecha y devuelve YYYY-MM-DD en hora local. */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  if (isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + days)
  return getLocalDateString(d)
}
