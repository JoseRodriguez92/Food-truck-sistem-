"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Slide {
  id: number
  title: string
  subtitle: string
  description: string
  cta: string
  ctaLink: string
  bgColor: string
}

const slides: Slide[] = [
  {
    id: 1,
    title: "SABOR QUE EXPLOTA",
    subtitle: "3 Street Food",
    description: "Dorilocos, Crazy Fries, Boom Fries y Mindoggys. Street food con actitud y sabores que no olvidarás.",
    cta: "Ver Menú",
    ctaLink: "#productos",
    bgColor: "from-background via-background to-card",
  },
  {
    id: 2,
    title: "CRAZY COMBO",
    subtitle: "Oferta Especial",
    description: "Dorilocos + Crazy Fries + Bebida por solo $14.99. El combo más loco de la ciudad.",
    cta: "Ordenar Ahora",
    ctaLink: "#pedir",
    bgColor: "from-card via-background to-background",
  },
  {
    id: 3,
    title: "ENCUÉNTRANOS",
    subtitle: "Nuevas Ubicaciones",
    description: "El food truck con los mejores Dorilocos y Mindoggys. Consulta dónde estamos hoy.",
    cta: "Ver Mapa",
    ctaLink: "#ubicaciones",
    bgColor: "from-background via-card to-background",
  },
]

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  return (
    <section className="relative min-h-screen pt-16 overflow-hidden">
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].bgColor} transition-all duration-700`} />
      
      {/* Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-40 sm:w-60 lg:w-80 h-40 sm:h-60 lg:h-80 bg-primary/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          {/* Text Content */}
          <div className="space-y-4 sm:space-y-6">
            <div 
              key={slides[currentSlide].id}
              className="animate-in fade-in slide-in-from-left-4 duration-500"
            >
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4">
                {slides[currentSlide].subtitle}
              </span>
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {slides[currentSlide].title.split(" ").map((word, i) => (
                  <span key={i} className={i === 1 ? "text-primary" : ""}>
                    {word}{" "}
                  </span>
                ))}
              </h1>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-muted-foreground max-w-lg leading-relaxed">
                {slides[currentSlide].description}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 sm:px-8 w-full sm:w-auto">
                  <a href={slides[currentSlide].ctaLink}>{slides[currentSlide].cta}</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-semibold px-6 sm:px-8 border-border hover:bg-secondary w-full sm:w-auto">
                  <a href="#historia">Nuestra Historia</a>
                </Button>
              </div>
            </div>
          </div>

          {/* Visual Element - Hidden on mobile, shown on lg */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              <div className="w-64 xl:w-80 h-64 xl:h-80 bg-card rounded-3xl border border-border flex items-center justify-center overflow-hidden">
                <div className="text-center p-6 xl:p-8">
                  <div className="text-6xl xl:text-8xl mb-4">🍟</div>
                  <p className="text-muted-foreground text-xs xl:text-sm">Imagen de publicidad</p>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-3 -right-3 xl:-top-4 xl:-right-4 w-16 xl:w-24 h-16 xl:h-24 bg-primary/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl xl:text-4xl">🔥</span>
              </div>
              <div className="absolute -bottom-3 -left-3 xl:-bottom-4 xl:-left-4 w-14 xl:w-20 h-14 xl:h-20 bg-secondary rounded-2xl flex items-center justify-center">
                <span className="text-xl xl:text-3xl">⭐</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Slide Indicators */}
            <div className="flex items-center gap-2 sm:gap-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? "w-6 sm:w-8 bg-primary" 
                      : "w-1.5 sm:w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Ir a slide ${index + 1}`}
                />
              ))}
              <span className="ml-2 sm:ml-4 text-xs sm:text-sm text-muted-foreground">
                {currentSlide + 1} / {slides.length}
              </span>
            </div>

            {/* Arrow Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-primary bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Siguiente slide"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
