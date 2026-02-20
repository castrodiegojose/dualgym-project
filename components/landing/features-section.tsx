import { Card, CardContent } from "@/components/ui/card"
import { Activity, CreditCard, Users } from "lucide-react"

const features = [
  {
    icon: Activity,
    title: "Registra Entrenamientos",
    description:
      "Registra y monitorea tus sesiones de entrenamiento. Establece metas, sigue tu progreso y mantente enfocado con analiticas detalladas.",
  },
  {
    icon: Users,
    title: "Gestiona tu Membresia",
    description:
      "Control total sobre tu membresia. Consulta el estado, renueva planes y accede a beneficios exclusivos en un solo lugar.",
  },
  {
    icon: CreditCard,
    title: "Pagos Faciles",
    description:
      "Procesamiento de pagos seguro y sin complicaciones. Paga cuotas, compra extras y administra tu facturacion con unos pocos clics.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Por Que Dual Gym
          </p>
          <h2
            className="text-balance text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            TODO LO QUE NECESITAS
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Una plataforma para gestionar toda tu vida fitness. Desde entrenamientos hasta pagos, lo tenemos cubierto.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/50 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="flex flex-col items-start gap-4 pt-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
