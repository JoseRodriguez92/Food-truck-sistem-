"use client"

import { Button } from "@/components/ui/button"

const products = [
  {
    id: 1,
    name: "Dorilocos",
    description: "Doritos con pepino, jícama, zanahoria, chamoy, salsa valentina, limón y más",
    price: "$5.99",
    emoji: "🔥",
    popular: true,
  },
  {
    id: 2,
    name: "Crazy Fries",
    description: "Papas fritas cargadas con queso, tocino, jalapeños y salsas especiales",
    price: "$7.99",
    emoji: "🍟",
    popular: true,
  },
  {
    id: 3,
    name: "Boom Fries",
    description: "Explosión de sabor con papas, carne, queso derretido y toppings secretos",
    price: "$8.99",
    emoji: "💥",
    popular: false,
  },
  {
    id: 4,
    name: "Mindoggys",
    description: "Hot dogs estilo único con combinaciones locas y salsas artesanales",
    price: "$6.99",
    emoji: "🌭",
    popular: true,
  },
]

export function ProductsSection() {
  return (
    <section id="productos" className="py-16 sm:py-20 lg:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4">
            Nuestro Menú
          </span>
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            PRODUCTOS <span className="text-primary">DESTACADOS</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Cada platillo está preparado con ingredientes frescos y la actitud más loca del street food.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <div 
              key={product.id}
              className="group relative bg-background rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {product.popular && (
                <span className="absolute -top-2 sm:-top-3 left-2 sm:left-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-semibold rounded-full">
                  Popular
                </span>
              )}
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-2 sm:mb-4">{product.emoji}</div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground mb-1 sm:mb-2">{product.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed line-clamp-2 sm:line-clamp-none">{product.description}</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-lg sm:text-xl font-bold text-primary">{product.price}</span>
                <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs sm:text-sm border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                  Añadir
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All */}
        <div className="text-center mt-8 sm:mt-12">
          <Button asChild variant="outline" size="lg" className="border-border hover:bg-secondary font-semibold w-full sm:w-auto">
            <a href="#pedir">Ver Menú Completo</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
