/**
 * La operación es en Colombia (America/Bogota, UTC-5 fijo, sin horario de
 * verano). El servidor (contenedor Docker) corre en UTC — sin esto, cualquier
 * cálculo de fecha basado en `new Date()` del lado servidor queda desfasado
 * ~5 horas respecto al día real del negocio (ej. un pedido de las 8pm
 * Bogotá aparecía contado como "de mañana", o "hoy" arrancaba a las 7pm de
 * ayer). Bogotá no tiene DST, así que un offset fijo "-05:00" es correcto
 * todo el año — no hace falta una librería de timezones.
 */

const BOGOTA_OFFSET = "-05:00";
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** ISO (UTC) del inicio del día (00:00:00.000) en Bogotá para "YYYY-MM-DD". */
export function bogotaStartOfDayISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00${BOGOTA_OFFSET}`).toISOString();
}

/** ISO (UTC) del fin del día (23:59:59.999) en Bogotá para "YYYY-MM-DD". */
export function bogotaEndOfDayISO(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999${BOGOTA_OFFSET}`).toISOString();
}

/** Fecha de HOY en Bogotá como "YYYY-MM-DD" — NO la fecha UTC del servidor. */
export function bogotaTodayDateString(): string {
  const shifted = new Date(Date.now() - BOGOTA_OFFSET_MS);
  return shifted.toISOString().split("T")[0];
}

/** ISO (UTC) de la medianoche de HOY en Bogotá — para filtros "desde hoy". */
export function bogotaTodayStartISO(): string {
  return bogotaStartOfDayISO(bogotaTodayDateString());
}
