import { Header } from "@/components/header"
import { HeroSlider } from "@/components/hero-slider"
import { ProductsSection } from "@/components/products-section"
import { HistorySection } from "@/components/history-section"
import { LocationsSection } from "@/components/locations-section"
import { ContactSection } from "@/components/contact-section"
import { OrderCTA } from "@/components/order-cta"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSlider />
      <ProductsSection />
      <HistorySection />
      <LocationsSection />
      <OrderCTA />
      <ContactSection />
      <Footer />
    </main>
  )
}
