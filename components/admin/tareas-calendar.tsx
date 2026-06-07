"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotionTarea } from "@/lib/notion";

const DAYS   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const USUARIO_COLOR: Record<string, { pill: string; dot: string; avatar: string }> = {
  Ivan:    { pill: "bg-sky-500     text-white", dot: "bg-sky-500",     avatar: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  Jose:    { pill: "bg-emerald-500 text-white", dot: "bg-emerald-500", avatar: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  Esteban: { pill: "bg-violet-500  text-white", dot: "bg-violet-500",  avatar: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};
// Naranja de marca para tareas con múltiples asignados
const MULTI_PILL   = "bg-orange-400/40 text-orange-100 border border-orange-400";
const MULTI_DOT    = "bg-orange-400/40";
const DEFAULT_PILL = "bg-zinc-500 text-white";

export const MULTI_COLOR = { pill: MULTI_PILL, dot: MULTI_DOT, avatar: "bg-orange-400/15 text-orange-300 border-orange-400/25" };

function getPillColor(asignado: string[]): string {
  if (asignado.length > 1) return MULTI_PILL;
  return USUARIO_COLOR[asignado[0]]?.pill ?? DEFAULT_PILL;
}

interface Props { tareas: NotionTarea[] }

export function TareasCalendar({ tareas }: Props) {
  const today  = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const firstDay    = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const tareasPorDia: Record<string, NotionTarea[]> = {};
  for (const t of tareas) {
    if (t.fecha) {
      const key = t.fecha.slice(0, 10);
      if (!tareasPorDia[key]) tareasPorDia[key] = [];
      tareasPorDia[key].push(t);
    }
  }

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    return { dayNum, dateStr, tareas: tareasPorDia[dateStr] ?? [] };
  });

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Navegación */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Leyenda de usuarios */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-muted/10 flex-wrap">
        {Object.entries(USUARIO_COLOR).map(([nombre, c]) => (
          <div key={nombre} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
            {nombre}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("w-2.5 h-2.5 rounded-full", MULTI_DOT)} />
          Varios
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
          Sin asignar
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cn(
              "min-h-25 p-1.5 border-b border-border flex flex-col gap-1",
              !cell && "bg-muted/10",
            )}
          >
            {cell && (
              <>
                <span className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end",
                  isToday(cell.dayNum)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}>
                  {cell.dayNum}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {cell.tareas.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      title={`${t.nombre}${t.asignado.length ? ` — ${t.asignado.join(", ")}` : ""}`}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate leading-4 font-medium",
                        getPillColor(t.asignado),
                        t.estado === "Completado" && "opacity-50 line-through"
                      )}
                    >
                      {t.nombre}
                    </div>
                  ))}
                  {cell.tareas.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{cell.tareas.length - 3} más
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
