import { MapPin, Clock } from "lucide-react"

const locations = [
  {
    id: 1,
    name: "Centro Histórico",
    address: "Av. Principal #123, Centro",
    schedule: "Lun - Vie: 11am - 9pm",
    active: true,
  },
  {
    id: 2,
    name: "Zona Norte",
    address: "Plaza Comercial Norte, Local 45",
    schedule: "Mar - Sáb: 12pm - 10pm",
    active: true,
  },
  {
    id: 3,
    name: "Parque Central",
    address: "Junto al Parque Central",
    schedule: "Sáb - Dom: 10am - 8pm",
    active: false,
  },
]

export function LocationsSection() {
  return (
    <section id="ubicaciones" className="py-16 sm:py-20 lg:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4">
            Encuéntranos
          </span>
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            NUESTRAS <span className="text-primary">UBICACIONES</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Estamos en constante movimiento para estar más cerca de ti. Consulta nuestras ubicaciones actuales.
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {locations.map((location) => (
            <div 
              key={location.id}
              className={`relative bg-background rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${
                location.active 
                  ? "border-primary/50 hover:shadow-lg hover:shadow-primary/5" 
                  : "border-border opacity-60"
              }`}
            >
              {location.active && (
                <span className="absolute -top-2 sm:-top-3 right-3 sm:right-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-500/20 text-green-400 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
                  Activo Hoy
                </span>
              )}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">{location.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{location.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{location.schedule}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Map Placeholder */}
        <div className="mt-8 sm:mt-12 bg-background rounded-xl sm:rounded-2xl border border-border p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🗺️</div>
          <p className="text-sm sm:text-base text-muted-foreground">Mapa interactivo próximamente</p>
        </div>
      </div>
    </section>
  )
}
