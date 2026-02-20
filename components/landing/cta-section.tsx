import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-10 text-center md:p-16">
          <div className="absolute -left-20 -top-20 size-60 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-60 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative">
            <h2
              className="text-balance text-3xl font-bold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              LISTO PARA <span className="text-primary">TRANSFORMARTE</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Comienza tu camino fitness hoy. Unite a miles de miembros que ya estan alcanzando sus metas en Dual Gym.
            </p>
            <div className="mt-8">
              <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
                <Link href="/register">
                  Comenzar Gratis
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
