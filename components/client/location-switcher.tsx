"use client";

import { useRouter } from "next/navigation";
import { MapPin, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LocationOption = { location_id: number; name: string; city: string | null };

export function LocationSwitcher({
  locations,
  currentLocationId,
  currentLabel,
}: {
  locations: LocationOption[];
  currentLocationId?: number | null;
  currentLabel?: string;
}) {
  const router = useRouter();

  if (locations.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 group outline-none">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-primary">{currentLabel ?? "Elegir ubicación"}</span>
        <ChevronDown className="w-3 h-3 text-primary/70 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.location_id}
            onSelect={() => router.push(`/client/menu?location=${loc.location_id}`)}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate">{loc.name}</p>
              {loc.city && <p className="text-xs text-muted-foreground truncate">{loc.city}</p>}
            </div>
            {loc.location_id === currentLocationId && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
