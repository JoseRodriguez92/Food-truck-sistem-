"use client";

import { useState, useRef, useCallback, Fragment } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { USUARIO_COLOR } from "@/components/admin/tareas-calendar";
import { updateTareaFecha } from "@/app/admin/tareas/actions";
import { toast } from "sonner";
import { TareaEditSheet } from "@/components/admin/tarea-edit-sheet";
import type { NotionTarea } from "@/lib/notion";

const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["L","M","X","J","V","S","D"];

const ROWS = [
  { key: "Jose",    label: "Jose",    color: USUARIO_COLOR.Jose },
  { key: "Esteban", label: "Esteban", color: USUARIO_COLOR.Esteban },
  { key: "Ivan",    label: "Ivan",    color: USUARIO_COLOR.Ivan },
];

interface DragState {
  taskId:           string;
  tareaId:          string;
  type:             "start" | "end" | "move";
  startX:           number;
  originalEndDay:   number;
  currentEndDay:    number;
  originalStartDay: number;
  currentStartDay:  number;
  duration:         number; // días de duración (para move)
  containerWidth:   number;
  daysInMonth:      number;
  endDate:          string | null;
  hasMoved:         boolean;
}

function dayOfDate(d: string) { return parseInt(d.split("-")[2], 10); }
function dateForDay(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface Props { tareas: NotionTarea[] }

export function TareasTimeline({ tareas }: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [endOverrides,   setEndOverrides]   = useState<Record<string, number>>({});
  const [startOverrides, setStartOverrides] = useState<Record<string, number>>({});
  const [editTarea, setEditTarea] = useState<NotionTarea | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ Jose: true, Esteban: true, Ivan: true });
  const [modo, setModo] = useState<"filas" | "superponer">("filas");
  const dragRef    = useRef<DragState | null>(null);
  const gridRef    = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false); // true si el último mousedown se convirtió en drag

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); }
  function dayLabel(d: number) { return DAYS_SHORT[(new Date(year, month, d).getDay() + 6) % 7]; }
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Porcentaje left/width de cada barra
  function barStyle(startDay: number, endDay: number) {
    const pct = 100 / daysInMonth;
    return {
      left:  `${(startDay - 1) * pct}%`,
      width: `${(endDay - startDay + 1) * pct}%`,
    };
  }

  // Tareas visibles en este mes para un usuario (incluye las que cruzan el mes)
  function getBars(rowKey: string) {
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const monthEnd   = dateForDay(year, month, daysInMonth);
    return tareas.filter(t => {
      if (!t.fecha) return false;
      if (!t.asignado.includes(rowKey)) return false;
      const end = t.fechaFin ?? t.fecha;
      return t.fecha <= monthEnd && end >= monthStart;
    }).map(t => {
      const rawStart = startOverrides[t.id] ?? dayOfDate(t.fecha!.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}` ? t.fecha! : monthStart);
      const rawEnd   = endOverrides[t.id]   ?? (t.fechaFin ? dayOfDate(t.fechaFin) : dayOfDate(t.fecha!));
      return {
        tarea:    t,
        startDay: Math.max(1, Math.min(rawStart, daysInMonth)),
        endDay:   Math.max(1, Math.min(rawEnd,   daysInMonth)),
        clippedStart: t.fecha! < monthStart, // empezó antes de este mes
      };
    });
  }

  const onResizeStart = useCallback((
    e: React.MouseEvent,
    type: "start" | "end" | "move",
    tarea: NotionTarea,
    startDay: number,
    endDay: number,
  ) => {
    e.preventDefault();
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const containerWidth = gridEl.offsetWidth - 72;

    dragRef.current = {
      taskId:           tarea.id,
      tareaId:          tarea.id,
      type,
      startX:           e.clientX,
      originalEndDay:   endDay,
      currentEndDay:    endDay,
      originalStartDay: startDay,
      currentStartDay:  startDay,
      duration:         endDay - startDay,
      containerWidth,
      daysInMonth,
      endDate:  tarea.fechaFin,
      hasMoved: false,
    };

    function onMouseMove(ev: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dayWidth  = d.containerWidth / d.daysInMonth;
      const deltaDays = Math.round((ev.clientX - d.startX) / dayWidth);
      if (deltaDays !== 0) { d.hasMoved = true; draggedRef.current = true; }

      if (d.type === "end") {
        const newEnd = Math.max(d.currentStartDay, Math.min(d.daysInMonth, d.originalEndDay + deltaDays));
        d.currentEndDay = newEnd;
        setEndOverrides((prev: Record<string,number>) => ({ ...prev, [d.taskId]: newEnd }));
      } else if (d.type === "start") {
        const newStart = Math.max(1, Math.min(d.currentEndDay, d.originalStartDay + deltaDays));
        d.currentStartDay = newStart;
        setStartOverrides((prev: Record<string,number>) => ({ ...prev, [d.taskId]: newStart }));
      } else {
        // move: desplaza start+end manteniendo duración
        const newStart = Math.max(1, Math.min(d.daysInMonth - d.duration, d.originalStartDay + deltaDays));
        const newEnd   = newStart + d.duration;
        d.currentStartDay = newStart;
        d.currentEndDay   = newEnd;
        setStartOverrides((prev: Record<string,number>) => ({ ...prev, [d.taskId]: newStart }));
        setEndOverrides((prev:   Record<string,number>) => ({ ...prev, [d.taskId]: newEnd }));
      }
    }

    async function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.hasMoved;
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      // Resetear flag después de que onClick pueda leerlo
      setTimeout(() => { draggedRef.current = false; }, 0);
      if (!moved) return; // fue un click simple, no guardar

      const newStart = dateForDay(year, month, d.currentStartDay);
      const newEnd   = d.currentEndDay === d.currentStartDay
        ? null
        : dateForDay(year, month, d.currentEndDay);
      try {
        await updateTareaFecha(tarea.id, newStart, newEnd);
        toast.success("Fecha actualizada en Notion");
      } catch {
        toast.error("Error al actualizar Notion");
        setEndOverrides((prev: Record<string,number>) => { const n = { ...prev }; delete n[d.taskId]; return n; });
        setStartOverrides((prev: Record<string,number>) => { const n = { ...prev }; delete n[d.taskId]; return n; });
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [year, month]);

  const LABEL_W = 72;
  const gridCols = `${LABEL_W}px repeat(${daysInMonth}, 1fr)`;

  return (
    <div className="rounded-xl border border-border overflow-hidden select-none" ref={gridRef}>
      {/* Navegación */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          {MONTHS[month]} {year}
        </span>
        <div className="flex items-center gap-3">
          {/* Toggle modo */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-background text-xs">
            <button
              onClick={() => setModo("filas")}
              className={cn("px-2.5 py-1 rounded-md font-medium transition-colors",
                modo === "filas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >Por fila</button>
            <button
              onClick={() => setModo("superponer")}
              className={cn("px-2.5 py-1 rounded-md font-medium transition-colors",
                modo === "superponer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >Superponer</button>
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full" style={{ display: "grid", gridTemplateColumns: gridCols }}>

        {/* ── Header ── */}
        <div className="border-b border-r border-border bg-muted/40" />
        {days.map(d => (
          <div key={d} className={cn(
            "border-b border-r border-border last:border-r-0 bg-muted/40",
            "flex flex-col items-center justify-center py-1.5",
            isToday(d) && "bg-primary/10"
          )}>
            <span className="text-[10px] text-muted-foreground font-medium">{dayLabel(d)}</span>
            <span className={cn("text-[11px] font-bold", isToday(d) ? "text-primary" : "text-foreground")}>{d}</span>
          </div>
        ))}

        {/* ── Filas por usuario ── */}
        {ROWS.map(row => {
          const bars = getBars(row.key);
          const isOpen = open[row.key] ?? true;

          return (
            <Fragment key={row.key}>
              {/* Header full-width — acordeón toggle */}
              <div
                className={cn(
                  "border-b border-border cursor-pointer flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30",
                  row.color.avatar.replace("border-", "border-l-4 border-l-").split(" ")[0]
                )}
                style={{ gridColumn: `1 / ${daysInMonth + 2}`, borderLeft: `3px solid` }}
                onClick={() => setOpen(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
              >
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", row.color.avatar)}>
                  {row.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {bars.length} {bars.length === 1 ? "tarea" : "tareas"} en {MONTHS[month]}
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform duration-200", isOpen && "rotate-180")} />
              </div>

              {/* Fila colapsada */}
              {!open[row.key] && (
                <div
                  className="border-b border-border min-h-10 relative"
                  style={{ gridColumn: `2 / ${daysInMonth + 2}` }}
                >
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map(d => (
                      <div key={d} className={cn("flex-1 border-r border-border last:border-r-0", isToday(d) && "bg-primary/5")} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sin tareas este mes */}
              {isOpen && bars.length === 0 && modo === "filas" && (
                <div className="border-b border-border min-h-10 relative" style={{ gridColumn: `2 / ${daysInMonth + 2}` }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map(d => <div key={d} className={cn("flex-1 border-r border-border last:border-r-0", isToday(d) && "bg-primary/5")} />)}
                  </div>
                </div>
              )}

              {/* MODO POR FILA — una fila por tarea */}
              {isOpen && modo === "filas" && bars.map(({ tarea, startDay, endDay, clippedStart }) => (
                <div
                  key={tarea.id}
                  className="border-b border-border min-h-10 relative py-1"
                  style={{ gridColumn: `2 / ${daysInMonth + 2}` }}
                >
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map(d => <div key={d} className={cn("flex-1 border-r border-border last:border-r-0", isToday(d) && "bg-primary/5")} />)}
                  </div>
                  <div
                    className={cn("absolute top-1 bottom-1 rounded flex items-center px-1.5 group cursor-grab active:cursor-grabbing z-10", row.color.pill, tarea.estado === "Completado" && "opacity-50")}
                    style={barStyle(startDay, endDay)}
                    title={tarea.nombre}
                    onMouseDown={e => { if ((e.target as HTMLElement).dataset.handle) return; onResizeStart(e, "move", tarea, startDay, endDay); }}
                    onClick={() => { if (draggedRef.current) return; setEditTarea(tarea); }}
                  >
                    {/* Handle inicio (izquierdo) */}
                    {!clippedStart && (
                      <div
                        data-handle="start"
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onMouseDown={e => { e.stopPropagation(); onResizeStart(e, "start", tarea, startDay, endDay); }}
                      >
                        <div className="w-0.5 h-4 bg-white/70 rounded-full pointer-events-none" />
                      </div>
                    )}

                    <span className="text-[10px] font-medium truncate flex-1 leading-none px-2 pointer-events-none">
                      {tarea.nombre}
                    </span>

                    {/* Handle fin (derecho) */}
                    <div
                      data-handle="end"
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      onMouseDown={e => { e.stopPropagation(); onResizeStart(e, "end", tarea, startDay, endDay); }}
                    >
                      <div className="w-0.5 h-4 bg-white/70 rounded-full pointer-events-none" />
                    </div>
                  </div>
                </div>
              ))}
            </Fragment>
          );
        })}

        {/* ── MODO SUPERPONER — capas independientes por usuario ── */}
        {modo === "superponer" && (() => {
          const BAND_H = 36; // altura fija por tarea dentro de cada capa

          // Calcular cuántas filas necesita cada usuario (packing dentro de su capa)
          const userLanes = ROWS.map(row => {
            const bars = getBars(row.key);
            const lanes: (typeof bars)[] = [];
            for (const bar of bars) {
              const slot = lanes.findIndex(l => l[l.length - 1].endDay < bar.startDay);
              if (slot === -1) lanes.push([bar]);
              else lanes[slot].push(bar);
            }
            return { row, lanes };
          });

          const totalH = userLanes.reduce((acc, u) => acc + Math.max(1, u.lanes.length) * BAND_H, 0);

          return (
            <>
              {/* Leyenda */}
              <div
                className="border-b border-border bg-muted/20 flex items-center gap-5 px-4 py-2"
                style={{ gridColumn: `1 / ${daysInMonth + 2}` }}
              >
                {ROWS.map(row => (
                  <div key={row.key} className="flex items-center gap-1.5 text-xs">
                    <span className={cn("w-2.5 h-2.5 rounded-full", row.color.dot)} />
                    <span className="text-muted-foreground">{row.label}</span>
                  </div>
                ))}
              </div>

              {/* Col 1 vacía para la capa */}
              <div className="border-b border-r border-border" style={{ gridRow: "auto" }} />

              {/* Zona de capas — UN solo contenedor relativo, capas encima */}
              <div
                className="border-b border-border relative"
                style={{ gridColumn: `2 / ${daysInMonth + 2}`, height: `${totalH}px` }}
              >
                {/* Fondo: líneas de días */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map(d => (
                    <div key={d} className={cn("flex-1 h-full border-r border-border last:border-r-0", isToday(d) && "bg-primary/5")} />
                  ))}
                </div>

                {/* Líneas horizontales de separación entre capas */}
                {(() => {
                  let y = 0;
                  return userLanes.map(({ row, lanes }) => {
                    const h = Math.max(1, lanes.length) * BAND_H;
                    const top = y;
                    y += h;
                    return (
                      <div
                        key={row.key}
                        className="absolute left-0 right-0 border-b border-dashed border-border/50"
                        style={{ top: top + h - 1, height: 1 }}
                      />
                    );
                  });
                })()}

                {/* Capas de tareas — una por usuario, con su propio offset vertical */}
                {(() => {
                  let offsetY = 0;
                  return userLanes.map(({ row, lanes }) => {
                    const layerH = Math.max(1, lanes.length) * BAND_H;
                    const currentOffset = offsetY;
                    offsetY += layerH;

                    return (
                      <div
                        key={row.key}
                        className="absolute left-0 right-0"
                        style={{ top: currentOffset, height: layerH, opacity: 0.85 }}
                      >
                        {lanes.map((lane, li) =>
                          lane.map(({ tarea, startDay, endDay, clippedStart }) => (
                            <div
                              key={tarea.id}
                              title={`${row.label}: ${tarea.nombre}`}
                              className={cn(
                                "absolute rounded flex items-center px-1.5 group cursor-grab active:cursor-grabbing",
                                row.color.pill,
                                tarea.estado === "Completado" && "opacity-50"
                              )}
                              style={{
                                ...barStyle(startDay, endDay),
                                top:    li * BAND_H + 4,
                                height: BAND_H - 8,
                              }}
                              onMouseDown={e => { if ((e.target as HTMLElement).dataset.handle) return; onResizeStart(e, "move", tarea, startDay, endDay); }}
                              onClick={() => { if (draggedRef.current) return; setEditTarea(tarea); }}
                            >
                              {/* Handle inicio */}
                              {!clippedStart && (
                                <div
                                  data-handle="start"
                                  className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  onMouseDown={e => { e.stopPropagation(); onResizeStart(e, "start", tarea, startDay, endDay); }}
                                >
                                  <div className="w-0.5 h-4 bg-white/70 rounded-full pointer-events-none" />
                                </div>
                              )}
                              <span className="text-[10px] font-medium truncate flex-1 leading-none px-2 pointer-events-none">
                                {tarea.nombre}
                              </span>
                              {/* Handle fin */}
                              <div
                                data-handle="end"
                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={e => { e.stopPropagation(); onResizeStart(e, "end", tarea, startDay, endDay); }}
                              >
                                <div className="w-0.5 h-4 bg-white/70 rounded-full pointer-events-none" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          );
        })()}

      </div>
      {/* Sheet edición */}
      <TareaEditSheet
        tarea={editTarea}
        open={!!editTarea}
        onClose={() => setEditTarea(null)}
      />
    </div>
  );
}
