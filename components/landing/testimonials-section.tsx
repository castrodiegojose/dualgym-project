import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Mitchell",
    initials: "SM",
    role: "Miembro desde 2024",
    quote:
      "Dual Gym cambio por completo mi rutina fitness. Las funciones de seguimiento me mantienen motivada y la comunidad es increiblemente solidaria.",
    rating: 5,
  },
  {
    name: "Carlos Rivera",
    initials: "CR",
    role: "Miembro desde 2023",
    quote:
      "La mejor experiencia de gimnasio que he tenido. La gestion de membresia es impecable y las instalaciones son de primer nivel. Muy recomendado.",
    rating: 5,
  },
  {
    name: "Emily Chen",
    initials: "EC",
    role: "Miembro desde 2025",
    quote:
      "Desde el momento en que me uni, todo fue fluido. Registro facil, excelente panel de control y el sistema de pagos simplemente funciona. Me encanta.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="border-t border-border bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonios
          </p>
          <h2
            className="text-balance text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            LO QUE DICEN NUESTROS MIEMBROS
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/50">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {`"${t.quote}"`}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
