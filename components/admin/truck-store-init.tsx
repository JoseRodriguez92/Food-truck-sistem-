"use client";

import { useEffect } from "react";
import { useSelectedTruckStore, type Truck } from "@/lib/store/selected-truck";

export function TruckStoreInit({ trucks }: { trucks: Truck[] }) {
  const setTrucks = useSelectedTruckStore((s) => s.setTrucks);

  useEffect(() => {
    setTrucks(trucks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks]);

  return null;
}
