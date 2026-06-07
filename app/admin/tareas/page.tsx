import { getTareas } from "@/lib/notion";
import type { NotionTarea } from "@/lib/notion";
import { ClipboardList } from "lucide-react";
import { TareasViews } from "./tareas-views";
import { CheckpointButton } from "./checkpoint-button";

export default async function TareasPage() {
  let tareas: NotionTarea[] = [];
  let error: string | null = null;

  try {
    tareas = await getTareas();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Tareas
            </h1>
            <p className="text-sm text-muted-foreground">
              {tareas.length > 0 ? `${tareas.length} tareas desde Notion` : "Sincronizado con Notion"}
            </p>
          </div>
        </div>
        <CheckpointButton />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al conectar con Notion: {error}
        </div>
      )}

      {tareas.length > 0 && <TareasViews tareas={tareas} />}

      {tareas.length === 0 && !error && (
        <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
          No hay tareas en la base de datos.
        </div>
      )}
    </div>
  );
}
