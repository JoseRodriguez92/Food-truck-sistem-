"use client";

import { useState, useEffect } from "react";
import { LayoutList, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function TareasToggle() {
  const [vista, setVista] = useState<"tabla" | "calendario">("tabla");

  useEffect(() => {
    const tabla = document.querySelector("[data-view='tabla']") as HTMLElement;
    const cal   = document.querySelector("[data-view='calendario']") as HTMLElement;
    if (tabla) tabla.style.display = vista === "tabla" ? "block" : "none";
    if (cal)   cal.style.display   = vista === "calendario" ? "block" : "none";
  }, [vista]);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
      <button
        onClick={() => setVista("tabla")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          vista === "tabla"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutList className="w-3.5 h-3.5" />
        Tabla
      </button>
      <button
        onClick={() => setVista("calendario")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          vista === "calendario"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Calendario
      </button>
    </div>
  );
}
