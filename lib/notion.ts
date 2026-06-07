import { Client } from "@notionhq/client";

export type NotionTarea = {
  id: string;
  nombre: string;
  asignado: string[];
  dia: string;
  estado: string;
  fase: string;
  fecha: string | null;
  fechaFin: string | null;
  prioridad: string;
  tipo: string;
  checkpoints: string[]; // fechas ISO "YYYY-MM-DD" separadas por coma en Notion
};

export async function getTareas(): Promise<NotionTarea[]> {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const response = await notion.databases.query({
    database_id: process.env.NOTION_TAREAS_DB_ID!,
    sorts: [{ property: "Fecha", direction: "ascending" }],
  });

  return response.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      nombre: p["Tarea"]?.title?.[0]?.plain_text ?? "",
      asignado: p["Asignado"]?.multi_select?.map((u: any) => u.name) ?? [],
      dia: p["Día"]?.rich_text?.[0]?.plain_text ?? "",
      estado: p["Estado"]?.select?.name ?? "",
      fase: p["Fase"]?.select?.name ?? "",
      fecha: p["Fecha"]?.date?.start ?? null,
      fechaFin: p["Fecha"]?.date?.end ?? null,
      prioridad: p["Prioridad"]?.select?.name ?? "",
      tipo: p["Tipo"]?.select?.name ?? "",
      checkpoints: (p["Checkpoints"]?.rich_text?.[0]?.plain_text ?? "")
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean),
    };
  });
}
