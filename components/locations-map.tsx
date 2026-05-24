'use client'

import { useState, useRef, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import { Truck } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-layer', type: 'raster' as const, source: 'carto' }],
}

export interface MapLocation {
  id: number
  name: string
  address: string
  schedule?: string
  active: boolean
  lat: number
  lng: number
  food_truck_id?: number
  food_truck_name?: string
}

export function LocationsMap({ locations }: { locations: MapLocation[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = locations.find((l) => l.id === selectedId) ?? null

  const mapRef = useRef<MapRef>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!mapRef.current || locations.length === 0) return
    if (locations.length === 1) {
      mapRef.current.flyTo({ center: [locations[0].lng, locations[0].lat], zoom: 14, duration: 700 })
    } else {
      const lngsE = locations.map((l) => l.lng)
      const latsE = locations.map((l) => l.lat)
      mapRef.current.fitBounds(
        [[Math.min(...lngsE), Math.min(...latsE)], [Math.max(...lngsE), Math.max(...latsE)]],
        { padding: 80, maxZoom: 14, duration: 700 },
      )
    }
  }, [locations])

  const lngs = locations.map((l) => l.lng)
  const lats = locations.map((l) => l.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const initialViewState = locations.length === 1
    ? { longitude: lngs[0], latitude: lats[0], zoom: 14 }
    : {
        bounds: [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]],
        fitBoundsOptions: { padding: 80, maxZoom: 14 },
      }

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      onClick={() => setSelectedId(null)}
    >
      <NavigationControl position="top-right" />

      {locations.map((loc) => (
        <Marker
          key={loc.id}
          longitude={loc.lng}
          latitude={loc.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            setSelectedId(loc.id === selectedId ? null : loc.id)
          }}
        >
          <div
            title={loc.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))',
              transform: selectedId === loc.id ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.2s',
              opacity: loc.active ? 1 : 0.5,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#F97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2.5px solid rgba(255,255,255,0.85)',
            }}>
              <Truck size={18} color="white" strokeWidth={2.2} />
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '9px solid #F97316',
              marginTop: -1,
            }} />
          </div>
        </Marker>
      ))}

      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          anchor="top"
          offset={[0, 8] as [number, number]}
          onClose={() => setSelectedId(null)}
          closeOnClick={false}
          style={{ padding: 0 }}
        >
          <div style={{ padding: '10px 14px', minWidth: 190, fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {selected.active && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
              )}
              <strong style={{ fontSize: 13, color: '#111' }}>{selected.name}</strong>
            </div>
            <p style={{ fontSize: 12, color: '#555', margin: 0 }}>{selected.address}</p>
            {selected.schedule && (
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{selected.schedule}</p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  )
}
