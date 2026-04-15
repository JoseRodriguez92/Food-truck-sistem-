import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;           // `product-{id}` or `combo-{id}`
  type: "product" | "combo";
  itemId: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  menuId: number | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  setMenuId: (id: number) => void;
  total: () => number;
  count: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      menuId: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        })),

      clearCart: () => set({ items: [], menuId: null }),

      setMenuId: (id) => set({ menuId: id }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),

      count: () =>
        get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    { name: "cart-3sf" }
  )
);
