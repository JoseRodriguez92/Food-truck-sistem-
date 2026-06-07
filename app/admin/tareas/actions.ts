"use server";

import { Client } from "@notionhq/client";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/app/actions/send-email";
import { getTareas } from "@/lib/notion";

// Mapa de emails por usuario — completar con los correos reales
const USUARIO_EMAIL: Record<string, string> = {
  Jose:    process.env.EMAIL_JOSE    ?? "jose.rodriguez920929@gmail.com",
  Ivan:    process.env.EMAIL_IVAN    ?? "",
  Esteban: process.env.EMAIL_ESTEBAN ?? "",
};

export async function updateTareaFecha(
  pageId: string,
  fechaStart: string,
  fechaEnd: string | null
) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Fecha: { date: { start: fechaStart, end: fechaEnd ?? null } },
    },
  });
  revalidatePath("/admin/tareas");
}

export interface TareaUpdate {
  nombre:      string;
  estado:      string;
  prioridad:   string;
  tipo:        string;
  asignado:    string[];
  fecha:       string;
  fechaFin:    string;
  checkpoints: string[]; // array de fechas ISO "YYYY-MM-DD"
}

export async function updateTarea(pageId: string, data: TareaUpdate) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  await notion.pages.update({
    page_id: pageId,
    properties: {
      Tarea:       { title:        [{ text: { content: data.nombre } }] },
      Estado:      { select:       { name: data.estado } },
      Prioridad:   { select:       { name: data.prioridad } },
      Tipo:        { select:       { name: data.tipo } },
      Asignado:    { multi_select: data.asignado.map(name => ({ name })) },
      Fecha:       { date: { start: data.fecha, end: data.fechaFin || null } },
      Checkpoints: {
        rich_text: data.checkpoints.length
          ? [{ text: { content: data.checkpoints.join(",") } }]
          : [],
      },
    },
  });

  revalidatePath("/admin/tareas");
}

export type CheckpointReminderResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

export async function sendCheckpointReminders(): Promise<CheckpointReminderResult> {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const tareas = await getTareas();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  const tareasConCheckpointHoy = tareas.filter(
    t => t.checkpoints.includes(today)
  );

  for (const tarea of tareasConCheckpointHoy) {
    const destinatarios = tarea.asignado
      .map(u => USUARIO_EMAIL[u])
      .filter(Boolean);

    if (destinatarios.length === 0) {
      skipped++;
      continue;
    }

    const estadoBadge =
      tarea.estado === "Completado"   ? "✅ Completado"   :
      tarea.estado === "En progreso"  ? "🔄 En progreso"  :
                                        "⏳ Pendiente";

    const prioridadBadge =
      tarea.prioridad === "Alta"  ? "🔴 Alta"  :
      tarea.prioridad === "Media" ? "🟡 Media" :
                                    "🟢 Baja";

    const otrosCheckpoints = tarea.checkpoints
      .filter(d => d !== today)
      .map(d => {
        const [y, m, dia] = d.split("-");
        return `${dia}/${m}/${y}`;
      });

    const html = `
      <p style="margin:0 0 20px; color:#A8A8A8; font-size:15px; line-height:1.7;">
        Hoy es un <strong style="color:#E8C547;">checkpoint</strong> para la siguiente tarea.
        Es un buen momento para revisar el avance.
      </p>

      <!-- Card de tarea -->
      <div style="background-color:#242424; border-radius:12px;
                  border:1px solid #3A3A3A; border-left:3px solid #E8C547;
                  padding:20px 24px; margin-bottom:24px;">
        <p style="margin:0 0 12px; color:#FAFAFA; font-size:16px; font-weight:700;
                  line-height:1.4;">
          ${tarea.nombre}
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="padding:4px 0; color:#555555; font-size:13px; width:90px;">Estado</td>
            <td style="padding:4px 0; color:#A8A8A8; font-size:13px;">${estadoBadge}</td>
          </tr>
          <tr>
            <td style="padding:4px 0; color:#555555; font-size:13px;">Prioridad</td>
            <td style="padding:4px 0; color:#A8A8A8; font-size:13px;">${prioridadBadge}</td>
          </tr>
          ${tarea.tipo ? `
          <tr>
            <td style="padding:4px 0; color:#555555; font-size:13px;">Tipo</td>
            <td style="padding:4px 0; color:#A8A8A8; font-size:13px;">${tarea.tipo}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:4px 0; color:#555555; font-size:13px;">Asignado a</td>
            <td style="padding:4px 0; color:#A8A8A8; font-size:13px;">${tarea.asignado.join(", ")}</td>
          </tr>
          ${tarea.fechaFin ? `
          <tr>
            <td style="padding:4px 0; color:#555555; font-size:13px;">Fecha límite</td>
            <td style="padding:4px 0; color:#A8A8A8; font-size:13px;">${formatDate(tarea.fechaFin)}</td>
          </tr>` : ""}
        </table>
      </div>

      ${otrosCheckpoints.length > 0 ? `
      <p style="margin:0 0 8px; color:#555555; font-size:12px;
                text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">
        Próximos checkpoints
      </p>
      <p style="margin:0 0 24px; color:#A8A8A8; font-size:14px;">
        ${otrosCheckpoints.join(" · ")}
      </p>` : ""}

      <p style="margin:0; font-size:13px; color:#555555; line-height:1.6;">
        Accede al panel de administración para actualizar el estado de la tarea.
      </p>
    `;

    const result = await sendEmail({
      to: destinatarios,
      subject: `Checkpoint hoy: ${tarea.nombre}`,
      title: "Recordatorio de checkpoint",
      subtitle: "Gestión de tareas",
      html,
    });

    if (result.success) {
      sent++;
    } else {
      errors.push(`"${tarea.nombre}": ${result.error}`);
    }
  }

  return { sent, skipped, errors };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
