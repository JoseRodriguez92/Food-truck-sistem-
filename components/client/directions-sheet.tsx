"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Pencil, Trash2, Star, X, Home, Briefcase } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDirection, updateDirection, deleteDirection, setDefaultDirection } from "@/app/client/actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DirectionItem = {
  profile_direction_id: number;
  is_default: boolean;
  direction: {
    direction_id: string;
    label: string | null;
    address_line: string;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    additional_info: string | null;
  } | null;
};

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  label:           z.string().optional(),
  address_line:    z.string().min(1, "La dirección es requerida"),
  city:            z.string().optional(),
  state:           z.string().optional(),
  country:         z.string().optional(),
  postal_code:     z.string().optional(),
  additional_info: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Label icons ───────────────────────────────────────────────────────────────

function LabelIcon({ label }: { label: string | null | undefined }) {
  const l = label?.toLowerCase();
  if (l === "casa" || l === "home")   return <Home className="w-3.5 h-3.5" />;
  if (l === "trabajo" || l === "work") return <Briefcase className="w-3.5 h-3.5" />;
  return <MapPin className="w-3.5 h-3.5" />;
}

// ─── Direction Form ────────────────────────────────────────────────────────────

function DirectionForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const { register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <form id="direction-form" className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="d-label">Etiqueta <span className="text-muted-foreground text-xs">(Casa, Trabajo...)</span></Label>
        <Input id="d-label" placeholder="Ej. Casa, Trabajo, Oficina" {...register("label")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-address">Dirección</Label>
        <Input id="d-address" placeholder="Ej. Cra 7 #45-10" aria-invalid={!!errors.address_line} {...register("address_line")} />
        {errors.address_line && <p className="text-xs text-destructive">{errors.address_line.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="d-city">Ciudad</Label>
          <Input id="d-city" placeholder="Bogotá" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-state">Departamento</Label>
          <Input id="d-state" placeholder="Cundinamarca" {...register("state")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="d-country">País</Label>
          <Input id="d-country" placeholder="Colombia" {...register("country")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-postal">Código postal</Label>
          <Input id="d-postal" placeholder="110111" {...register("postal_code")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-info">Indicaciones adicionales <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Input id="d-info" placeholder="Apto 301, portería sur..." {...register("additional_info")} />
      </div>
    </form>
  );
}

// ─── Main Sheet ────────────────────────────────────────────────────────────────

export function DirectionsSheet({
  directions,
  open,
  onClose,
}: {
  directions: DirectionItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen]         = useState(false);
  const [editItem, setEditItem]       = useState<DirectionItem | null>(null);
  const [deleteItem, setDeleteItem]   = useState<DirectionItem | null>(null);

  function submit(
    action: (fd: FormData) => Promise<{ error: string } | undefined>,
    onSuccess: () => void
  ) {
    const form = document.getElementById("direction-form") as HTMLFormElement;
    if (!form) return;
    startTransition(async () => {
      const res = await action(new FormData(form));
      if (res?.error) toast.error(res.error);
      else onSuccess();
    });
  }

  function handleSetDefault(id: number) {
    startTransition(async () => {
      const res = await setDefaultDirection(id);
      if (res?.error) toast.error(res.error);
      else toast.success("Dirección predeterminada actualizada");
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    startTransition(async () => {
      const res = await deleteDirection(deleteItem.profile_direction_id);
      if (res?.error) toast.error(res.error);
      else { toast.success("Dirección eliminada"); setDeleteItem(null); }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Mis direcciones
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{directions.length} dirección{directions.length !== 1 ? "es" : ""} guardada{directions.length !== 1 ? "s" : ""}</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Botón agregar */}
            <button
              onClick={() => setAddOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Agregar nueva dirección
              </span>
            </button>

            {/* Lista */}
            {directions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <MapPin className="w-8 h-8 opacity-20" />
                <p className="text-sm">Aún no tienes direcciones guardadas</p>
              </div>
            ) : (
              directions.map((item) => {
                const d = item.direction;
                if (!d) return null;
                const lines = [d.address_line, [d.city, d.state].filter(Boolean).join(", "), d.country].filter(Boolean);
                return (
                  <div
                    key={item.profile_direction_id}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                      item.is_default
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    {/* Ícono */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      item.is_default ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <LabelIcon label={d.label} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {d.label && (
                          <span className="text-xs font-semibold text-foreground">{d.label}</span>
                        )}
                        {item.is_default && (
                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                            <Star className="w-3 h-3 fill-primary" /> Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{d.address_line}</p>
                      {lines.slice(1).map((l, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{l}</p>
                      ))}
                      {d.additional_info && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{d.additional_info}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!item.is_default && (
                        <button
                          onClick={() => handleSetDefault(item.profile_direction_id)}
                          disabled={isPending}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary transition-colors"
                          title="Marcar como predeterminada"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditItem(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(item)}
                        disabled={isPending}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva dirección</DialogTitle></DialogHeader>
          <DirectionForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(addDirection, () => { toast.success("Dirección agregada"); setAddOpen(false); })}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar dirección</DialogTitle></DialogHeader>
          {editItem?.direction && (
            <DirectionForm defaultValues={{
              label:           editItem.direction.label           ?? "",
              address_line:    editItem.direction.address_line,
              city:            editItem.direction.city            ?? "",
              state:           editItem.direction.state           ?? "",
              country:         editItem.direction.country         ?? "",
              postal_code:     editItem.direction.postal_code     ?? "",
              additional_info: editItem.direction.additional_info ?? "",
            }} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button disabled={isPending} onClick={() => submit(
              (fd) => updateDirection(editItem!.profile_direction_id, fd),
              () => { toast.success("Dirección actualizada"); setEditItem(null); }
            )}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong className="text-foreground">{deleteItem?.direction?.address_line}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
