"use client";

/**
 * QuickOrderDialog
 *
 * "Pedido rápido" — el staff escribe en texto libre algo tipo
 * "parcerita, quatro para Javier, soberana, agua para Laura" y el sistema
 * interpreta: busca cada palabra contra el catálogo (nombre real o alias
 * registrado en search_aliases) y agrupa por cliente, porque un mismo texto
 * puede contener VARIOS pedidos — cada "para <nombre>" cierra un grupo.
 *
 * Arma un preview editable antes de crear nada: nunca se crea un pedido sin
 * que el staff confirme qué entendió el sistema.
 *
 * @module components/admin/quick-order-dialog
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles, Plus, Minus, X, Package, Layers, Loader2,
  AlertTriangle, Search, User, Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getLocationsForOrder,
  parseQuickOrderText,
  createManualOrder,
} from "@/app/dashboard/orders-actions";
// El tipo se importa de la lib, no del archivo "use server" (ahí todo export
// se trata como server action y un re-export de tipos rompe el build).
import type { QuickOrderCandidate } from "@/lib/quick-order-parser";
import { useSelectedTruckStore } from "@/lib/store/selected-truck";
import { cn } from "@/lib/utils";

type LocationOption = {
  location_id: number;
  name: string;
  food_truck_id: number;
  food_truck: { name: string } | { name: string }[] | null;
};

type CartLine = {
  lineId: string;
  raw: string;
  quantity: number;
  matched: QuickOrderCandidate | null;
  candidates: QuickOrderCandidate[];
};

/** Un pedido dentro del preview. Editable antes de confirmar. */
type EditableGroup = {
  groupId: string;
  alias: string;
  /** Quedó suelto después del último "para <nombre>" — hay que asignarlo. */
  orphan: boolean;
  lines: CartLine[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function uid(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function groupTotal(group: EditableGroup) {
  return group.lines.reduce((acc, l) => acc + (l.matched ? l.matched.price * l.quantity : 0), 0);
}

export function QuickOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [isParsing, startParsing] = useTransition();

  const selectedTruck = useSelectedTruckStore((s) => s.selectedTruck);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState<string>("");

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(false);
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [fullCatalog, setFullCatalog] = useState<QuickOrderCandidate[]>([]);
  const [manualSearch, setManualSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    getLocationsForOrder().then((data) => setLocations(data as LocationOption[]));
  }, [open]);

  useEffect(() => {
    const truckLocations = locations.filter((l) => l.food_truck_id === selectedTruck);
    setLocationId(truckLocations.length === 1 ? String(truckLocations[0].location_id) : "");
  }, [locations, selectedTruck]);

  function resetAll() {
    setText("");
    setParsed(false);
    setGroups([]);
    setManualSearch({});
  }

  function handleInterpretar() {
    if (!text.trim()) {
      toast.error("Escribí algo primero");
      return;
    }
    if (!locationId) {
      toast.error("Elegí un truck con ubicación arriba en el sidebar");
      return;
    }
    startParsing(async () => {
      const result = await parseQuickOrderText(text, Number(locationId));
      setGroups(
        result.groups.map((g) => ({
          groupId: uid("g"),
          alias: g.alias ?? "",
          orphan: g.orphan,
          lines: g.items.map((it) => ({
            lineId: uid("l"),
            raw: it.raw,
            quantity: it.quantity,
            matched: it.matched,
            candidates: it.candidates,
          })),
        })),
      );
      setFullCatalog(result.catalog);
      setParsed(true);
    });
  }

  // ── Edición de líneas ──────────────────────────────────────────────────────
  function updateLine(groupId: string, lineId: string, patch: Partial<CartLine>) {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId !== groupId
          ? g
          : { ...g, lines: g.lines.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)) },
      ),
    );
  }

  function changeQty(groupId: string, lineId: string, delta: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId !== groupId
          ? g
          : {
              ...g,
              lines: g.lines.map((l) =>
                l.lineId === lineId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l,
              ),
            },
      ),
    );
  }

  function removeLine(groupId: string, lineId: string) {
    setGroups((prev) =>
      prev
        .map((g) => (g.groupId !== groupId ? g : { ...g, lines: g.lines.filter((l) => l.lineId !== lineId) }))
        // Un grupo sin líneas ya no tiene sentido
        .filter((g) => g.lines.length > 0),
    );
  }

  function setAlias(groupId: string, alias: string) {
    setGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, alias } : g)));
  }

  function removeGroup(groupId: string) {
    setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
  }

  // ── Huérfanos: ítems sueltos después del último "para <nombre>" ────────────
  function assignOrphanTo(orphanId: string, targetId: string) {
    setGroups((prev) => {
      const orphan = prev.find((g) => g.groupId === orphanId);
      if (!orphan) return prev;
      return prev
        .map((g) => (g.groupId === targetId ? { ...g, lines: [...g.lines, ...orphan.lines] } : g))
        .filter((g) => g.groupId !== orphanId);
    });
  }

  function keepOrphanSeparate(orphanId: string) {
    setGroups((prev) => prev.map((g) => (g.groupId === orphanId ? { ...g, orphan: false } : g)));
  }

  // ── Estado derivado ────────────────────────────────────────────────────────
  const namedGroups = groups.filter((g) => !g.orphan);
  const pendingOrphans = groups.filter((g) => g.orphan);
  const creatableGroups = groups.filter((g) => g.lines.some((l) => l.matched));
  const grandTotal = groups.reduce((acc, g) => acc + groupTotal(g), 0);
  const hasUnresolved = groups.some((g) => g.lines.some((l) => !l.matched));
  const canCreate = creatableGroups.length > 0 && pendingOrphans.length === 0;

  function handleCreate() {
    if (!canCreate) return;

    startTransition(async () => {
      const created: number[] = [];
      const failed: string[] = [];

      // Secuencial a propósito: cada pedido toma su propio order_number y
      // descuenta stock; en paralelo se pisan entre sí.
      for (const group of creatableGroups) {
        const items = group.lines.filter((l) => l.matched);
        const result = await createManualOrder({
          profileId: null,
          locationId: Number(locationId),
          customerAlias: group.alias,
          items: items.map((l) => ({
            type: l.matched!.type,
            itemId: l.matched!.id,
            name: l.matched!.name,
            price: l.matched!.price,
            quantity: l.quantity,
          })),
        });

        if ("error" in result) failed.push(`${group.alias || "sin nombre"}: ${result.error}`);
        else created.push(result.orderNumber);
      }

      if (created.length > 0) {
        toast.success(
          created.length === 1
            ? `Pedido #${created[0]} creado`
            : `${created.length} pedidos creados (#${created.join(", #")})`,
        );
      }
      // Si alguno falló no cerramos: el staff tiene que ver cuál quedó pendiente.
      if (failed.length > 0) {
        failed.forEach((f) => toast.error(f));
        return;
      }

      resetAll();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAll(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Pedido rápido
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {!selectedTruck ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
              Elegí un truck arriba en el sidebar para tomar el pedido.
            </p>
          ) : !locationId ? (
            <p className="text-xs text-destructive rounded-lg border border-destructive/30 px-3 py-2">
              Ese truck no tiene una ubicación activa configurada.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="quick-order-text">Escribí el pedido</Label>
            <Textarea
              id="quick-order-text"
              rows={3}
              value={text}
              onChange={(e) => { setText(e.target.value); setParsed(false); }}
              placeholder="Ej: parcerita, quatro para Javier, soberana, agua para Laura"
            />
            <p className="text-xs text-muted-foreground">
              Separá los items por coma. Cada &quot;para &lt;nombre&gt;&quot; cierra un pedido: podés tomar
              varios clientes de una.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleInterpretar}
            disabled={isParsing || !locationId}
          >
            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Interpretar
          </Button>

          {parsed && groups.length === 0 && (
            <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
              No encontré nada para armar — revisá el texto.
            </p>
          )}

          {parsed && groups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {groups.length === 1 ? "Pedido" : `${groups.length} pedidos detectados`}
                </Label>
                {groups.length > 1 && (
                  <span className="text-xs text-muted-foreground">Se crea uno por persona</span>
                )}
              </div>

              {groups.map((group, index) => {
                const total = groupTotal(group);
                const targets = namedGroups.filter((g) => g.groupId !== group.groupId);

                return (
                  <div
                    key={group.groupId}
                    className={cn(
                      "rounded-xl border",
                      group.orphan ? "border-primary/40 bg-primary/5" : "border-border",
                    )}
                  >
                    {/* Encabezado del pedido: nombre + total */}
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                      <div className="relative flex-1 min-w-0">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          value={group.alias}
                          onChange={(e) => setAlias(group.groupId, e.target.value)}
                          placeholder="Sin nombre (mostrador)"
                          maxLength={40}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                      <span className="text-sm font-semibold shrink-0">{formatCurrency(total)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeGroup(group.groupId)}
                        aria-label="Descartar este pedido"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Aviso de huérfanos */}
                    {group.orphan && (
                      <div className="px-3 pt-3 space-y-2">
                        <p className="text-xs flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-px" />
                          <span className="text-muted-foreground">
                            Esto quedó suelto después del último nombre. ¿De quién es?
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {targets.map((t) => (
                            <button
                              key={t.groupId}
                              type="button"
                              onClick={() => assignOrphanTo(group.groupId, t.groupId)}
                              className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                            >
                              Sumar a {t.alias || "sin nombre"}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => keepOrphanSeparate(group.groupId)}
                            className="text-xs px-2 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                          >
                            Pedido aparte
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Líneas */}
                    <div className="divide-y divide-border">
                      {group.lines.map((line) => {
                        const Icon = line.matched?.type === "combo" ? Layers : Package;
                        const search = manualSearch[line.lineId] ?? "";

                        return (
                          <div key={line.lineId} className="p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {line.matched ? (
                                  <>
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{line.matched.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatCurrency(line.matched.price)} c/u — de &quot;{line.raw}&quot;
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        No reconocido: &quot;{line.raw}&quot;
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Elegí manualmente o quitalo
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {line.matched && (
                                  <>
                                    <Button
                                      type="button" variant="outline" size="icon" className="h-6 w-6"
                                      onClick={() => changeQty(group.groupId, line.lineId, -1)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm w-5 text-center">{line.quantity}</span>
                                    <Button
                                      type="button" variant="outline" size="icon" className="h-6 w-6"
                                      onClick={() => changeQty(group.groupId, line.lineId, 1)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  type="button" variant="ghost" size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeLine(group.groupId, line.lineId)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            {!line.matched && line.candidates.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {line.candidates.map((c) => (
                                  <button
                                    key={`${c.type}-${c.id}`}
                                    type="button"
                                    onClick={() =>
                                      updateLine(group.groupId, line.lineId, { matched: c, candidates: [] })
                                    }
                                    className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            {!line.matched && (
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                <Input
                                  value={search}
                                  onChange={(e) =>
                                    setManualSearch((prev) => ({ ...prev, [line.lineId]: e.target.value }))
                                  }
                                  placeholder="Buscar en el catálogo..."
                                  className="pl-7 h-8 text-xs"
                                />
                                {search.trim() && (
                                  <div className="mt-1 rounded-lg border border-border max-h-32 overflow-y-auto">
                                    {fullCatalog
                                      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                                      .slice(0, 6)
                                      .map((c) => (
                                        <button
                                          key={`${c.type}-${c.id}`}
                                          type="button"
                                          onClick={() => {
                                            updateLine(group.groupId, line.lineId, {
                                              matched: c,
                                              candidates: [],
                                            });
                                            setManualSearch((prev) => ({ ...prev, [line.lineId]: "" }));
                                          }}
                                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                                        >
                                          {c.name} — {formatCurrency(c.price)}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {hasUnresolved && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                  Los items sin reconocer no se incluyen hasta que los resuelvas o los quites.
                </p>
              )}

              {pendingOrphans.length > 0 && (
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Resolvé los items sueltos para poder crear los pedidos.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center border-t border-border pt-4 sm:justify-between">
          <span className="text-sm font-semibold">Total: {formatCurrency(grandTotal)}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isPending || !canCreate}>
              {isPending
                ? "Creando..."
                : creatableGroups.length > 1
                  ? `Crear ${creatableGroups.length} pedidos`
                  : "Crear pedido"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
