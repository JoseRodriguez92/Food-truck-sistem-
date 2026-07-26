import { Header } from "@/components/header"
import { HeroSlider } from "@/components/hero-slider"
import { ProductsSection } from "@/components/products-section"
import { HistorySection } from "@/components/history-section"
import { BuildYourTruckSection } from "@/components/build-your-truck-section"
import { LocationsSection } from "@/components/locations-section"
import { GoogleReviewsSection } from "@/components/google-reviews-section"
import { ContactSection } from "@/components/contact-section"
import { OrderCTA } from "@/components/order-cta"
import { Footer } from "@/components/footer"
import { WhatsappFloat } from "@/components/whatsapp-float"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSlider />
      <ProductsSection />
      <HistorySection />
      <BuildYourTruckSection />
      <LocationsSection />
      <GoogleReviewsSection />
      <OrderCTA />
      <ContactSection />
      <Footer />
      <WhatsappFloat />
      <div className="hidden"></div>
    </main>
  )
}
