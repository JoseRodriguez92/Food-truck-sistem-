"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

export type ShowcaseProduct = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price)
}

function ProductCard({ product }: { product: ShowcaseProduct }) {
  return (
    <div className="group relative rounded-3xl border border-border bg-background p-2 sm:p-2.5 shadow-xs transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1.5">
      {/* Marco interno: la foto vive adentro, con aire respecto al borde de la card */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary text-6xl">🫓</div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/10 via-45% to-transparent" />

        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/70 backdrop-blur-md border border-primary/30 text-primary text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
          Arepa
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          {product.description && (
            <p className="text-white/60 text-xs mb-1.5 leading-relaxed line-clamp-1">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3
              className="min-w-0 truncate text-white text-base sm:text-lg font-bold drop-shadow-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {product.name}
            </h3>
            <span className="shrink-0 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm sm:text-base font-bold shadow-lg shadow-primary/30">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductsShowcase({ products }: { products: ShowcaseProduct[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!api) return
    setSelected(api.selectedScrollSnap())
    api.on("select", () => setSelected(api.selectedScrollSnap()))
  }, [api])

  return (
    <>
      {/* Mobile: swipe carousel */}
      <div className="sm:hidden">
        <Carousel setApi={setApi} opts={{ align: "start", loop: false }}>
          <CarouselContent className="-ml-4">
            {products.map((product) => (
              <CarouselItem key={product.id} className="basis-[82%] pl-4">
                <ProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {products.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {products.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selected ? "w-6 bg-primary" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop / tablet: grid estático */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-5 sm:gap-7 max-w-4xl mx-auto">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}
