'use client'

import { useState } from 'react'
import { MapPin, Truck } from 'lucide-react'
import { LocationsMapClient } from '@/components/locations-map-client'
import type { MapLocation } from '@/components/locations-map'

interface TruckOption {
  food_truck_id: number
  name: string
  color: string | null
}

export function LocationsFilterClient({
  locations,
  trucks,
}: {
  locations: MapLocation[]
  trucks: TruckOption[]
}) {
  const trucksWithLocations = trucks.filter((t) =>
    locations.some((l) => l.food_truck_id === t.food_truck_id)
  )
  const showFilter = trucksWithLocations.length > 1

  const [selectedTruckId, setSelectedTruckId] = useState<number | null>(null)

  const filtered =
    selectedTruckId === null
      ? locations
      : locations.filter((l) => l.food_truck_id === selectedTruckId)

  return (
    <>
      {/* Truck selector */}
      {showFilter && (
        <div className="flex gap-2 flex-wrap justify-center mb-8 sm:mb-10">
          <button
            onClick={() => setSelectedTruckId(null)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedTruckId === null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-foreground border border-border hover:bg-accent'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Todos
          </button>
          {trucksWithLocations.map((truck) => (
            <button
              key={truck.food_truck_id}
              onClick={() => setSelectedTruckId(truck.food_truck_id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTruckId === truck.food_truck_id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-foreground border border-border hover:bg-accent'
              }`}
            >
              {truck.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: truck.color }}
                />
              )}
              {truck.name}
            </button>
          ))}
        </div>
      )}

      {/* Location cards */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((location) => (
            <div
              key={location.id}
              className={`relative bg-background rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${
                location.active
                  ? 'border-primary/50 hover:shadow-lg hover:shadow-primary/5'
                  : 'border-border opacity-60'
              }`}
            >
              {location.active && (
                <span className="absolute -top-2 sm:-top-3 right-3 sm:right-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-500/20 text-green-400 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
                  Activo Hoy
                </span>
              )}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">{location.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{location.address}</p>
                  {showFilter && !selectedTruckId && location.food_truck_name && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5">{location.food_truck_name}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay ubicaciones disponibles para este food truck.
        </div>
      )}

      {/* Map */}
      <div className="mt-8 sm:mt-12 rounded-xl sm:rounded-2xl overflow-hidden border border-border h-64 sm:h-80 lg:h-96">
        <LocationsMapClient locations={filtered} />
      </div>
    </>
  )
}
