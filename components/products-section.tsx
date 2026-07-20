import { Button } from "@/components/ui/button"
import { ProductsShowcase } from "@/components/products-showcase"
import { createClient } from "@/lib/supabase/server"

async function getArepaProducts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("product")
    .select(`
      product_id, name, description, price,
      category!inner(name),
      product_has_image(image_url)
    `)
    .eq("category.name", "Arepa")
    .order("product_id")

  return (data ?? []).map((p) => ({
    id: p.product_id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    image: p.product_has_image?.[0]?.image_url ?? null,
  }))
}

export async function ProductsSection() {
  const products = await getArepaProducts()

  return (
    <section id="productos" className="relative py-16 sm:py-20 lg:py-24 bg-card overflow-hidden">
      {/* Blur orbs decorativos */}
      <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

        <ProductsShowcase products={products} />

        {/* View All */}
        <div className="text-center mt-10 sm:mt-12">
          <Button asChild variant="outline" size="lg" className="border-border hover:bg-secondary font-semibold w-full sm:w-auto">
            <a href="#pedir">Ver Menú Completo</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
