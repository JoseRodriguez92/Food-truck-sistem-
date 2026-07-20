"use client";

import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";

export function TruckPicker({ className }: { className?: string }) {
  const trucks = useSelectedTruckStore((s) => s.trucks);
  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);
  const setSelectedTruck = useSelectedTruckStore((s) => s.setSelectedTruck);

  return (
    <Select value={selectedTruck?.toString() ?? ""} onValueChange={(v) => setSelectedTruck(Number(v))}>
      <SelectTrigger className={cn("w-full bg-input/30 hover:bg-input/50", className)}>
        <Truck className="text-primary" />
        <SelectValue placeholder="Selecciona truck" />
      </SelectTrigger>
      <SelectContent>
        {trucks.map((truck) => (
          <SelectItem key={truck.food_truck_id} value={truck.food_truck_id.toString()}>
            {truck.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
