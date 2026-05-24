'use client'

import { useRef, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import type { MapRef, MapMouseEvent, MarkerDragEvent } from 'react-map-gl/maplibre'
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
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster' as const, source: 'carto' }],
}

interface MapPreviewProps {
  lat: number
  lng: number
  onCoordChange?: (lat: number, lng: number) => void
}

export function MapPreview({ lat, lng, onCoordChange }: MapPreviewProps) {
  const mapRef = useRef<MapRef>(null)
  const fromInteraction = useRef(false)

  useEffect(() => {
    if (fromInteraction.current) {
      fromInteraction.current = false
      return
    }
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 700 })
  }, [lat, lng])

  function handleMapClick(e: MapMouseEvent) {
    if (!onCoordChange) return
    fromInteraction.current = true
    onCoordChange(e.lngLat.lat, e.lngLat.lng)
  }

  function handleDragEnd(e: MarkerDragEvent) {
    if (!onCoordChange) return
    fromInteraction.current = true
    onCoordChange(e.lngLat.lat, e.lngLat.lng)
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 15 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        onClick={onCoordChange ? handleMapClick : undefined}
        cursor={onCoordChange ? 'crosshair' : 'grab'}
      >
        <Marker
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          draggable={!!onCoordChange}
          onDragEnd={handleDragEnd}
        >
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            cursor: onCoordChange ? 'grab' : 'default',
            filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.55))',
          }}>
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
      </Map>

      {onCoordChange && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground pointer-events-none whitespace-nowrap">
          Haz clic en el mapa o arrastra el pin
        </div>
      )}
    </div>
  )
}
