import { createClient } from '@/lib/supabase/server'
import { LocationsFilterClient } from '@/components/locations-filter-client'
import type { MapLocation } from '@/components/locations-map'

async function geocode(
  address: string,
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  const q = [address, city, country].filter(Boolean).join(', ')
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      {
        headers: { 'User-Agent': 'TresStreetFood/1.0 (contact@tresstreetfood.com)' },
        next: { revalidate: 86400 },
      }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

export async function LocationsSection() {
  const supabase = await createClient()

  const [{ data: rows }, { data: trucks }] = await Promise.all([
    supabase
      .from('location')
      .select('*, food_truck(food_truck_id, name, color)')
      .order('location_id'),
    supabase.from('food_truck').select('food_truck_id, name, color').order('name'),
  ])

  const locations: MapLocation[] = await Promise.all(
    (rows ?? []).map(async (loc) => {
      const ft = loc.food_truck as { food_truck_id: number; name: string; color: string | null } | null
      const coords =
        loc.latitude != null && loc.longitude != null
          ? { lat: loc.latitude, lng: loc.longitude }
          : await geocode(loc.address ?? '', loc.city ?? '', loc.country ?? 'México')
      return {
        id: loc.location_id,
        name: loc.name,
        address: [loc.address, loc.city].filter(Boolean).join(', '),
        active: loc.estatus ?? true,
        lat: coords?.lat ?? 19.4326,
        lng: coords?.lng ?? -99.1332,
        food_truck_id: ft?.food_truck_id,
        food_truck_name: ft?.name,
      }
    })
  )

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

        {locations.length > 0 ? (
          <LocationsFilterClient
            locations={locations}
            trucks={(trucks ?? []) as { food_truck_id: number; name: string; color: string | null }[]}
          />
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-background rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 animate-pulse"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-muted rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
