import { Dumbbell, Mail, Phone, MapPin, Instagram } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="size-6 text-primary" />
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                DUAL GYM
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Experiencia fitness premium. Supera tus limites, alcanza tus metas y transforma tu vida con Dual Gym.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Enlaces Rapidos</h3>
            <div className="flex flex-col gap-2">
              <Link href="/login" className="text-sm text-foreground/80 transition-colors hover:text-primary">
                Iniciar Sesion
              </Link>
              <Link href="/dashboard" className="text-sm text-foreground/80 transition-colors hover:text-primary">
                Panel
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contacto</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <MapPin className="size-4 shrink-0 text-primary" />
                Santa Rita 72, Chamical, La Rioja, Argentina
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Phone className="size-4 shrink-0 text-primary" />
                +54 9 (3826) 40-1746
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Mail className="size-4 shrink-0 text-primary" />
                dualgym105@gmail.com
              </div>
              <a
                href="https://www.instagram.com/dual_gym?igsh=MXhoYm8wZ2E2ZXgydg=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                <Instagram className="size-4 shrink-0 text-primary" />
                @dualgym
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          2026 Dual Gym. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
