import { z } from "zod"

export const dniSchema = z
  .string()
  .min(7, "El DNI debe tener al menos 7 dígitos")
  .max(8, "El DNI no puede tener más de 8 dígitos")
  .regex(/^\d+$/, "El DNI solo debe contener números")

export const formSchemaMemberDni = z.object({
  dni: dniSchema,
})

export type FormMemberDni = z.infer<typeof formSchemaMemberDni>
