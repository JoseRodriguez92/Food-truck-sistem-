export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "nequi", label: "Nequi" },
  { value: "datafono", label: "Datáfono" },
  { value: "transferencia", label: "Transferencia" },
  { value: "bre_b", label: "Bre-B" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function paymentMethodLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
