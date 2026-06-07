"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TareasCalendar, USUARIO_COLOR, MULTI_COLOR } from "@/components/admin/tareas-calendar";
import { TareasTimeline } from "@/components/admin/tareas-timeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NotionTarea } from "@/lib/notion";

/* ── colores ── */
const estadoColor: Record<string, string> = {
  Completado:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "En progreso": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Pendiente:     "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};
const prioridadColor: Record<string, string> = {
  Alta:  "bg-red-500/15 text-red-400 border-red-500/20",
  Media: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Baja:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};
const tipoColor: Record<string, string> = {
  Marketing:   "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Finanzas:    "bg-green-500/15 text-green-400 border-green-500/20",
  Digital:     "bg-sky-500/15 text-sky-400 border-sky-500/20",
  Operaciones: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Domicilios:  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Legal:       "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
};

function ColorBadge({ label, map }: { label: string; map: Record<string, string> }) {
  if (!label) return null;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
      map[label] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
    )}>
      {label}
    </span>
  );
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── tipos de filtro ── */
interface Filtros {
  estados:   string[];
  prioridades: string[];
  tipos:     string[];
  asignados: string[];
  fechaDesde: string;
  fechaHasta: string;
}

const filtrosVacios: Filtros = {
  estados: [], prioridades: [], tipos: [], asignados: [], fechaDesde: "", fechaHasta: "",
};

const estadoDot: Record<string, string> = {
  Completado:    "bg-emerald-400",
  "En progreso": "bg-blue-400",
  Pendiente:     "bg-zinc-400",
};
const prioridadDot: Record<string, string> = {
  Alta:  "bg-red-400",
  Media: "bg-amber-400",
  Baja:  "bg-emerald-400",
};
const usuarioChip: Record<string, { active: string; dot: string }> = {
  Jose:    { active: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50", dot: "bg-emerald-400" },
  Ivan:    { active: "bg-sky-500/25 text-sky-300 border-sky-500/50",             dot: "bg-sky-400" },
  Esteban: { active: "bg-violet-500/25 text-violet-300 border-violet-500/50",    dot: "bg-violet-400" },
};

/* ── checkbox group ── */
function CheckGroup({
  label, options, selected, onChange, dotMap, colorMap,
}: {
  label:     string;
  options:   string[];
  selected:  string[];
  onChange:  (v: string[]) => void;
  dotMap?:   Record<string, string>;
  colorMap?: Record<string, { active: string; dot?: string }>;
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);
  }
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active   = selected.includes(opt);
          const custom   = colorMap?.[opt];
          const dot      = dotMap?.[opt] ?? custom?.dot;
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
                active
                  ? custom
                    ? custom.active
                    : "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40 hover:border-border hover:text-foreground"
              )}
            >
              {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── componente principal ── */
export function TareasViews({ tareas }: { tareas: NotionTarea[] }) {
  const [vista]                   = useState<"tabla" | "calendario" | "timeline">("timeline");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtros, setFiltros]     = useState<Filtros>(filtrosVacios);
  /* opciones únicas derivadas de los datos */
  const opciones = useMemo(() => ({
    estados:    [...new Set(tareas.map(t => t.estado).filter(Boolean))],
    prioridades:[...new Set(tareas.map(t => t.prioridad).filter(Boolean))],
    tipos:      [...new Set(tareas.map(t => t.tipo).filter(Boolean))],
    asignados:  [...new Set(tareas.flatMap(t => t.asignado).filter(Boolean))],
  }), [tareas]);

  /* aplicar filtros */
  const filtradas = useMemo(() => tareas.filter(t => {
    if (filtros.estados.length    && !filtros.estados.includes(t.estado))       return false;
    if (filtros.prioridades.length && !filtros.prioridades.includes(t.prioridad)) return false;
    if (filtros.tipos.length      && !filtros.tipos.includes(t.tipo))           return false;
    if (filtros.asignados.length  && !t.asignado.some(a => filtros.asignados.includes(a))) return false;
    if (filtros.fechaDesde && t.fecha && t.fecha < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && t.fecha && t.fecha > filtros.fechaHasta) return false;
    return true;
  }), [tareas, filtros]);

  const activosFiltros =
    filtros.estados.length + filtros.prioridades.length + filtros.tipos.length +
    filtros.asignados.length + (filtros.fechaDesde ? 1 : 0) + (filtros.fechaHasta ? 1 : 0);

  function set<K extends keyof Filtros>(key: K, val: Filtros[K]) {
    setFiltros(f => ({ ...f, [key]: val }));
  }

  return (
    <>
      {/* Conteo */}
      <p className="text-xs text-muted-foreground -mt-4">
        {filtradas.length} de {tareas.length} tareas
        {activosFiltros > 0 && (
          <button onClick={() => setFiltros(filtrosVacios)} className="ml-2 text-primary hover:underline">
            Limpiar filtros
          </button>
        )}
      </p>

      {/* Vista tabla */}
      {vista === "tabla" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prioridad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asignado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Día</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                      Sin resultados para los filtros aplicados.
                    </td>
                  </tr>
                ) : filtradas.map((t, i) => (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors hover:bg-muted/30",
                      i % 2 !== 0 && "bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <span className="line-clamp-2">{t.nombre}</span>
                    </td>
                    <td className="px-4 py-3"><ColorBadge label={t.estado} map={estadoColor} /></td>
                    <td className="px-4 py-3"><ColorBadge label={t.prioridad} map={prioridadColor} /></td>
                    <td className="px-4 py-3"><ColorBadge label={t.tipo} map={tipoColor} /></td>
                    <td className="px-4 py-3">
                      {t.asignado.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : t.asignado.length > 1 ? (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                          MULTI_COLOR.avatar
                        )}>
                          {t.asignado.join(", ")}
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                          USUARIO_COLOR[t.asignado[0]]?.avatar ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        )}>
                          {t.asignado[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.dia || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatFecha(t.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista calendario */}
      {vista === "calendario" && <TareasCalendar tareas={filtradas} />}

      {/* Vista timeline por persona */}
      {vista === "timeline" && <TareasTimeline tareas={filtradas} />}

      {/* Botón flotante de filtros */}
      <button
        onClick={() => setSheetOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all",
          activosFiltros > 0
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-foreground hover:bg-accent"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm font-medium">Filtros</span>
        {activosFiltros > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs font-bold">
            {activosFiltros}
          </span>
        )}
      </button>

      {/* Sheet de filtros */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="text-base">Filtros</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
            <CheckGroup
              label="Estado"
              options={opciones.estados}
              selected={filtros.estados}
              onChange={v => set("estados", v)}
              dotMap={estadoDot}
            />

            <div className="h-px bg-border/40" />

            <CheckGroup
              label="Prioridad"
              options={opciones.prioridades}
              selected={filtros.prioridades}
              onChange={v => set("prioridades", v)}
              dotMap={prioridadDot}
            />

            <div className="h-px bg-border/40" />

            <CheckGroup
              label="Tipo"
              options={opciones.tipos}
              selected={filtros.tipos}
              onChange={v => set("tipos", v)}
            />

            <div className="h-px bg-border/40" />

            <CheckGroup
              label="Asignado"
              options={opciones.asignados}
              selected={filtros.asignados}
              onChange={v => set("asignados", v)}
              colorMap={usuarioChip}
            />

            <div className="h-px bg-border/40" />

            {/* Rango de fechas */}
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Fecha</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted-foreground">Desde</label>
                  <input
                    type="date"
                    value={filtros.fechaDesde}
                    onChange={e => set("fechaDesde", e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted-foreground">Hasta</label>
                  <input
                    type="date"
                    value={filtros.fechaHasta}
                    onChange={e => set("fechaHasta", e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border/60 flex flex-col gap-2 bg-muted/10">
            <button
              onClick={() => setSheetOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Ver {filtradas.length} tarea{filtradas.length !== 1 ? "s" : ""}
            </button>
            {activosFiltros > 0 && (
              <button
                onClick={() => setFiltros(filtrosVacios)}
                className="w-full py-2 text-xs text-muted-foreground/70 hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar {activosFiltros} filtro{activosFiltros !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
