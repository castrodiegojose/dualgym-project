"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-gym.jpg"
          alt="Interior de Dual Gym con equipamiento fitness moderno"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Experiencia Fitness Premium
          </p>
          <h1
            className="text-balance text-5xl font-bold leading-tight tracking-tight md:text-7xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            LIBERA TU{" "}
            <span className="text-primary">POTENCIAL</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Unite a Dual Gym y transforma tu camino fitness. Registra entrenamientos, administra tu membresia y conecta con una comunidad que te impulsa a mas.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
              <Link href="/login">
                Ingresar
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
