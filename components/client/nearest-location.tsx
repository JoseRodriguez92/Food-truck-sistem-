"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "lucide-react";

type LocationOption = {
  location_id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

// Haversine — distancia en km entre dos coordenadas
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearestLocationRedirect({ locations }: { locations: LocationOption[] }) {
  const router = useRouter();
  const resolvedRef = useRef(false);

  useEffect(() => {
    // Ordenadas por nombre desde el server → [0] es el fallback si no hay geolocalización.
    const fallbackId = locations[0].location_id;

    function goTo(locationId: number) {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      router.replace(`/client/menu?location=${locationId}`);
    }

    if (!("geolocation" in navigator)) {
      goTo(fallbackId);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: userLat, longitude: userLng } = pos.coords;
        const withCoords = locations.filter(
          (l): l is LocationOption & { latitude: number; longitude: number } =>
            l.latitude != null && l.longitude != null
        );
        if (withCoords.length === 0) {
          goTo(fallbackId);
          return;
        }
        const nearest = withCoords.reduce((closest, l) => {
          const d = distanceKm(userLat, userLng, l.latitude, l.longitude);
          return d < closest.d ? { d, id: l.location_id } : closest;
        }, { d: Infinity, id: withCoords[0].location_id });
        goTo(nearest.id);
      },
      () => goTo(fallbackId),
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [locations, router]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-background px-6">
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-56 h-56 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xs gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Navigation className="w-9 h-9 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Buscando el truck más cercano
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Permití el acceso a tu ubicación para mostrarte el food truck más cerca de ti.
          </p>
        </div>

        <p className="text-xs text-muted-foreground/50 mt-4 font-medium tracking-widest uppercase">
          3 Street Food
        </p>
      </div>
    </div>
  );
}
