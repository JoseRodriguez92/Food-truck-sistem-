import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Truck = { food_truck_id: number; name: string };

type SelectedTruckStore = {
  trucks: Truck[];
  selectedTruck: number | null;
  setTrucks: (trucks: Truck[]) => void;
  setSelectedTruck: (id: number) => void;
};

export const useSelectedTruckStore = create<SelectedTruckStore>()(
  persist(
    (set, get) => ({
      trucks: [],
      selectedTruck: null,

      // Se llama una vez desde el layout con la lista fresca del server.
      // Si el truck persistido ya no existe (o no hay ninguno guardado
      // todavía), cae al primero de la lista.
      setTrucks: (trucks) => {
        const current = get().selectedTruck;
        const stillValid = current !== null && trucks.some((t) => t.food_truck_id === current);
        set({
          trucks,
          selectedTruck: stillValid ? current : (trucks[0]?.food_truck_id ?? null),
        });
      },

      setSelectedTruck: (id) => set({ selectedTruck: id }),
    }),
    {
      name: "selected-truck-3sf",
      // La lista de trucks siempre viene fresca del server — solo
      // persistimos cuál quedó elegido.
      partialize: (state) => ({ selectedTruck: state.selectedTruck }),
    },
  ),
);
