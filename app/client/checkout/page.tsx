"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Package, Layers, ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/store/cart";
import { createOrder } from "./actions";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

export default function CheckoutPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const locationId  = searchParams.get("location") ? Number(searchParams.get("location")) : null;

  const { items, total, count, clearCart } = useCartStore();
  const [mounted, setMounted]   = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  // Redirigir si carrito vacío (solo después de montar)
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.replace(locationId ? `/client/menu?location=${locationId}` : "/client/menu");
    }
  }, [mounted, items.length, locationId, router]);

  if (!mounted || items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  function handlePay() {
    startTransition(async () => {
      const result = await createOrder(items, locationId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // Limpiar carrito antes de redirigir a MP
      clearCart();
      window.location.href = result.initPoint;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-base" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Confirmar pedido
        </h1>
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4 pb-32">
        {/* Items */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Tu pedido</span>
            <span className="ml-auto text-xs text-muted-foreground">{count()} item{count() !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Imagen */}
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === "combo"
                        ? <Layers className="w-4 h-4 text-muted-foreground opacity-40" />
                        : <Package className="w-4 h-4 text-muted-foreground opacity-40" />
                      }
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCOP(item.price)} × {item.quantity}</p>
                </div>
                {/* Subtotal */}
                <span className="text-sm font-semibold shrink-0">{formatCOP(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de totales */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCOP(total())}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Domicilio</span>
            <span className="text-muted-foreground">No aplica</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="text-lg text-primary">{formatCOP(total())}</span>
          </div>
        </div>
      </div>

      {/* Footer fijo con botón de pago */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-background/95 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handlePay}
            disabled={isPending}
            className="w-full h-12 text-base font-bold gap-2"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pagar {formatCOP(total())} con MercadoPago
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Serás redirigido al portal seguro de MercadoPago
          </p>
        </div>
      </div>
    </div>
  );
}
