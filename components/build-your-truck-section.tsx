"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BuildYourTruckSection() {
  return (
    <section id="truck" className="py-16 sm:py-20 lg:py-24 bg-card relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-64 lg:w-80 h-48 sm:h-64 lg:h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-56 sm:w-72 lg:w-96 h-56 sm:h-72 lg:h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4">
          Construye Tu Truck
        </span>
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
          style={{ fontFamily: "var(--font-display)" }}
        >
          TENER TU PROPIO FOOD TRUCK ES{" "}
          <span className="text-primary">UN DOLOR DE CABEZA</span>
        </h2>
        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          <p>
            Encontrar quién te construya un trailer bueno, sin esperas eternas
            ni acabados mediocres, es más difícil de lo que parece. Nosotros
            ya pasamos por eso.
          </p>
          <p>
            Te ayudamos a construir tu trailer personalizado — cocina pensada
            para tu operación, buenos acabados, y hacemos el levantamiento de
            requerimientos contigo desde el día uno.
          </p>
        </div>
        <div className="mt-6 sm:mt-8 lg:mt-10">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 sm:px-8 gap-2 w-full sm:w-auto">
            <Link href="/arma-tu-truck">
              Arma El Tuyo Ya
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
