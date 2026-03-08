# Revisión de arquitectura – Dual Gym

Resumen de lo revisado y sugerencias para mantener coherencia y evitar problemas.

---

## Lo que está bien resuelto

- **Next.js App Router** con rutas claras: `/`, `/login`, `/register`, `/dashboard`, `/profile`, `/admin`, `/admin/reportes`, `/admin/usuarios/[id]`.
- **Auth**: un solo `AuthProvider` en el layout; `AuthGuard` para rutas protegidas con `requireAdmin` y `requireSuperAdmin`; sesión restaurada con `getCurrentUserFromSession` + `onAuthStateChange`.
- **Datos**: `lib/api.ts` como capa única de llamadas a Supabase (auth, perfiles, planes, suscripciones, pagos). La autorización se delega a **RLS** en Supabase.
- **API route**: solo `GET /api/auth/profile` para obtener el perfil con el token tras el login; el resto va por cliente + RLS. Es una decisión coherente.
- **Tipos**: `lib/types.ts` centraliza `User`, `Plan`, `Subscription`, `Payment`, etc., y se usan en api y en la app.

---

## Sugerencias (ordenadas por impacto)

### 1. Tipo `AuthState` sin uso

En `lib/types.ts` está definido:

```ts
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
```

El contexto de auth no usa este tipo; define su propia `AuthContextType` (con `isSessionReady`, `refreshSession`, etc.). Nadie importa `AuthState`.

**Sugerencia:** Eliminar `AuthState` de `lib/types.ts` para no dejar tipos huérfanos, o documentar que está deprecado y que se use `AuthContextType` vía `useAuth()`.

---

### 2. Duplicación del hook `useIsMobile`

Existen dos implementaciones idénticas:

- `hooks/use-mobile.ts`
- `components/ui/use-mobile.tsx`

Solo `components/ui/sidebar.tsx` importa desde `@/hooks/use-mobile`. El de `components/ui/` no se usa.

**Sugerencia:** Eliminar `components/ui/use-mobile.tsx` y dejar un único hook en `hooks/use-mobile.ts` para evitar divergencias futuras.

---

### 3. `ThemeProvider` no usado

Existe `components/theme-provider.tsx` (next-themes), pero en `app/layout.tsx` no se usa; el tema se fija con `className="dark"` en `<html>`.

**Sugerencia:**  
- Si no vas a ofrecer tema claro/oscuro: eliminar `ThemeProvider` o dejarlo documentado como “para uso futuro”.  
- Si quieres soporte light/dark: envolver la app con `ThemeProvider` en el layout y quitar la clase `dark` fija.

---

### 4. Logs de depuración en producción

- **`lib/api.ts`**: función `LOG()` y varias llamadas (`loginUser`, perfil, etc.).
- **`lib/auth-context.tsx`**: `console.log` en `login()` y en el `useEffect` de sesión / `onAuthStateChange`.

**Sugerencia:** Quitar estos logs en producción o usar un logger condicionado por `process.env.NODE_ENV === "development"` (o una variable de entorno tipo `NEXT_PUBLIC_DEBUG_AUTH`), para no ensuciar consola y no exponer detalles de flujo de auth.

---

### 5. Nombre del proyecto en `package.json`

`"name": "my-project"` no refleja el producto.

**Sugerencia:** Cambiar a algo como `"gym-membership-app"` o `"dualgym"` para consistencia con el repo y el dominio.

---

### 6. Redirección tras login y “dashboard cargando”

En `app/login/page.tsx`, si se hace `router.replace("/dashboard")` justo después de `login()` (en `handleSubmit`), el dashboard puede montarse antes de que React actualice el contexto con el usuario, y el `AuthGuard` muestra loading un rato o se queda colgado.

**Sugerencia:** Mantener un pequeño delay (por ejemplo 100 ms) antes de `router.replace("/dashboard")` en `handleSubmit`, o redirigir solo desde el `useEffect` cuando `isSessionReady && isAuthenticated`. Así el contexto ya tiene `user` al montar el dashboard.

---

### 7. Consistencia login vs register en redirección

- **Login:** puede redirigir en `handleSubmit` y además tiene `useEffect` cuando `isSessionReady && isAuthenticated`.  
- **Register:** solo redirige en `useEffect` (no en `handleSubmit`).

**Sugerencia:** Unificar el criterio: o bien ambos redirigen con un delay desde `handleSubmit` (y el `useEffect` solo para “ya estaba logueado”), o ambos solo desde `useEffect`. Eso evita comportamientos distintos entre login y registro.

---

### 8. Crecimiento futuro de `lib/api.ts`

`lib/api.ts` concentra auth, usuarios, planes, suscripciones y pagos. Está bien para el tamaño actual.

**Sugerencia:** Si el archivo crece mucho, plantear separar por dominio, por ejemplo:

- `lib/api/auth.ts` (loginUser, registerUser, getCurrentUserFromSession)
- `lib/api/users.ts` (getUserById, getAllUsers, updateUser)
- `lib/api/plans.ts`
- `lib/api/subscriptions.ts`
- `lib/api/payments.ts`
- `lib/api/index.ts` reexportando lo que la app necesite

Mientras tanto, la estructura actual es válida.

---

### 9. Rutas admin sin layout compartido

`/admin` y `/admin/reportes` y `/admin/usuarios/[id]` no tienen un `layout.tsx` bajo `app/admin/`. Cada página incluye `AuthGuard`, `Navbar`, `Footer` y contenido.

**Sugerencia (opcional):** Crear `app/admin/layout.tsx` que renderice `AuthGuard requireAdmin`, `Navbar` y `Footer`, y deje `{children}` para el contenido. Las páginas de admin solo tendrían que devolver el contenido específico, sin repetir guard/navbar/footer. Reportes podría usar el mismo layout y comprobar superadmin solo en su página o en un guard adicional.

---

### 10. Perfil de usuario: email no editable

En `/profile` el formulario no permite cambiar el email; `updateProfile`/`updateUser` sí aceptan `email` en la API. Si la intención es que el usuario no pueda cambiar el email, está bien y no hace falta tocar nada. Si en el futuro se permite, habría que tener en cuenta la re-verificación de email en Supabase.

---

## Resumen de acciones recomendadas

| Prioridad | Acción | Estado |
|----------|--------|--------|
| Alta     | Eliminar o condicionar logs de auth/api en producción. | ✅ Aplicado: sin logs en `lib/api.ts` ni `lib/auth-context.tsx`. |
| Media    | Eliminar tipo `AuthState` si no se usa; eliminar `components/ui/use-mobile.tsx` duplicado. | ✅ `AuthState` ya no estaba en types; eliminado `components/ui/use-mobile.tsx`. |
| Media    | Unificar redirección post-login (delay o solo useEffect) y alinear login/register. | Pendiente. |
| Baja     | Renombrar `package.json`; usar o quitar `ThemeProvider`; opcional: layout admin y futura división de `lib/api`. | Pendiente. |
