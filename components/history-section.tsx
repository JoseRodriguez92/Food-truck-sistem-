export function HistorySection() {
  return (
    <section id="historia" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-square max-w-sm mx-auto lg:max-w-none bg-card rounded-2xl sm:rounded-3xl border border-border flex items-center justify-center overflow-hidden">
              <div className="text-center p-6 sm:p-8">
                <div className="text-7xl sm:text-8xl lg:text-9xl mb-4">🚚</div>
                <p className="text-muted-foreground text-sm sm:text-base">Nuestro Food Truck</p>
              </div>
            </div>
            {/* Stats */}
            <div className="absolute -bottom-4 -right-2 sm:-bottom-6 sm:-right-6 bg-primary text-primary-foreground p-4 sm:p-6 rounded-xl sm:rounded-2xl">
              <div className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>+5</div>
              <div className="text-xs sm:text-sm opacity-90">Años de experiencia</div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full">
              Nuestra Historia
            </span>
            <h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PASIÓN <span className="text-primary">SOBRE RUEDAS</span>
            </h2>
            <div className="space-y-3 sm:space-y-4 text-muted-foreground leading-relaxed text-sm sm:text-base">
              <p>
                3 Street Food nació con un sueño simple: llevar los sabores más locos y auténticos 
                directamente a las calles de la ciudad.
              </p>
              <p>
                Lo que comenzó como un pequeño food truck se ha convertido en el destino favorito para 
                los amantes de los Dorilocos, Crazy Fries, Boom Fries y Mindoggys.
              </p>
              <p>
                Cada día preparamos todo con ingredientes frescos y la misma pasión del primer día. 
                Street food con actitud, eso es lo nuestro.
              </p>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-4 sm:pt-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>100%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Frescos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>50K+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>4.9</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
