'use client'

import dynamic from 'next/dynamic'
import type { MapLocation } from '@/components/locations-map'

const LocationsMap = dynamic(
  () => import('@/components/locations-map').then((m) => m.LocationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Cargando mapa…</p>
      </div>
    ),
  }
)

export function LocationsMapClient({ locations }: { locations: MapLocation[] }) {
  return <LocationsMap locations={locations} />
}
