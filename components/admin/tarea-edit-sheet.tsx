"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { updateTarea } from "@/app/admin/tareas/actions";
import type { NotionTarea } from "@/lib/notion";

const ESTADOS    = ["Pendiente", "En progreso", "Completado"];
const PRIORIDADES = ["Alta", "Media", "Baja"];
const TIPOS      = ["Marketing", "Finanzas", "Digital", "Operaciones", "Domicilios", "Legal"];
const USUARIOS   = ["Ivan", "Jose", "Esteban"];

const estadoColor: Record<string, string> = {
  Completado:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "En progreso": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Pendiente:     "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};
const prioridadColor: Record<string, string> = {
  Alta:  "bg-red-500/20 text-red-400 border-red-500/30",
  Media: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Baja:  "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};
const tipoColor: Record<string, string> = {
  Marketing:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Finanzas:    "bg-green-500/20 text-green-400 border-green-500/30",
  Digital:     "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Operaciones: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Domicilios:  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Legal:       "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};
const usuarioColor: Record<string, string> = {
  Ivan:    "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Jose:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Esteban: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

function ChipGroup({
  label, options, selected, colorMap, multi = false, onChange,
}: {
  label: string;
  options: string[];
  selected: string | string[];
  colorMap: Record<string, string>;
  multi?: boolean;
  onChange: (val: string | string[]) => void;
}) {
  function toggle(opt: string) {
    if (multi) {
      const arr = selected as string[];
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
    } else {
      onChange(opt);
    }
  }
  const isActive = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              isActive(opt)
                ? colorMap[opt] ?? "bg-primary/20 text-primary border-primary/30"
                : "bg-muted/20 text-muted-foreground border-border hover:border-foreground/30"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  tarea: NotionTarea | null;
  open: boolean;
  onClose: () => void;
}

export function TareaEditSheet({ tarea, open, onClose }: Props) {
  const [nombre,      setNombre]      = useState(tarea?.nombre      ?? "");
  const [estado,      setEstado]      = useState(tarea?.estado      ?? "Pendiente");
  const [prioridad,   setPrioridad]   = useState(tarea?.prioridad   ?? "Media");
  const [tipo,        setTipo]        = useState(tarea?.tipo        ?? "");
  const [asignado,    setAsignado]    = useState<string[]>(tarea?.asignado ?? []);
  const [fecha,       setFecha]       = useState(tarea?.fecha       ?? "");
  const [fechaFin,    setFechaFin]    = useState(tarea?.fechaFin    ?? "");
  const [checkpoints, setCheckpoints] = useState<string[]>(tarea?.checkpoints ?? []);
  const [pending, startTransition] = useTransition();

  // Sync cuando cambia la tarea seleccionada
  if (tarea && nombre !== tarea.nombre && !pending) {
    setNombre(tarea.nombre);
    setEstado(tarea.estado);
    setPrioridad(tarea.prioridad);
    setTipo(tarea.tipo);
    setAsignado(tarea.asignado);
    setFecha(tarea.fecha ?? "");
    setFechaFin(tarea.fechaFin ?? "");
    setCheckpoints(tarea.checkpoints ?? []);
  }

  function addCheckpoint() {
    setCheckpoints(prev => [...prev, ""]);
  }

  function updateCheckpoint(index: number, value: string) {
    setCheckpoints(prev => prev.map((d, i) => (i === index ? value : d)));
  }

  function removeCheckpoint(index: number) {
    setCheckpoints(prev => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!tarea) return;
    const validCheckpoints = checkpoints.filter(Boolean);
    startTransition(async () => {
      try {
        await updateTarea(tarea.id, {
          nombre, estado, prioridad, tipo, asignado,
          fecha, fechaFin, checkpoints: validCheckpoints,
        });
        toast.success("Tarea actualizada en Notion");
        onClose();
      } catch {
        toast.error("Error al guardar en Notion");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-96 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-base">Editar tarea</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</label>
            <textarea
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <ChipGroup label="Estado"    options={ESTADOS}    selected={estado}    colorMap={estadoColor}    onChange={v => setEstado(v as string)} />
          <ChipGroup label="Prioridad" options={PRIORIDADES} selected={prioridad} colorMap={prioridadColor} onChange={v => setPrioridad(v as string)} />
          <ChipGroup label="Tipo"      options={TIPOS}      selected={tipo}      colorMap={tipoColor}      onChange={v => setTipo(v as string)} />
          <ChipGroup label="Asignado"  options={USUARIOS}   selected={asignado}  colorMap={usuarioColor}   multi onChange={v => setAsignado(v as string[])} />

          {/* Fechas */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Inicio</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Fin</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Checkpoints */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Checkpoints
              </label>
              <button
                type="button"
                onClick={addCheckpoint}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Agregar
              </button>
            </div>

            {checkpoints.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">
                Sin checkpoints. Agrega fechas de seguimiento intermedias.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <input
                        type="date"
                        value={cp}
                        onChange={e => updateCheckpoint(i, e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-input/30 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCheckpoint(i)}
                      className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {checkpoints.length > 0 && (
              <p className="text-xs text-muted-foreground/50">
                Se envía un email de recordatorio a los asignados en cada fecha.
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={pending}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar en Notion"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
