/**
 * Parser del "Pedido Rápido" — texto libre → líneas de pedido.
 *
 * Lógica PURA, sin Supabase ni React: recibe el catálogo ya cargado y devuelve
 * el preview. Vive separada del server action (`app/dashboard/orders-actions.ts`)
 * para poder testearla sin levantar la DB.
 *
 * Todo el matching es determinístico y local (sin LLM): en pleno servicio con
 * fila, la latencia de red y el costo por request no son aceptables, y el staff
 * necesita que el resultado sea el mismo siempre.
 *
 * Pipeline:
 *   1. Se extrae el alias del cliente ("... para Mariana" / "pa Mariana")
 *   2. Se parte el resto por comas / " y " / " + " / saltos de línea
 *   3. De cada segmento se saca la cantidad ("2 coca", "dos coca", "coca x2")
 *   4. El resto se puntúa contra nombre real + search_aliases
 *   5. Si el ganador es claro → `matched`; si hay empate o puntaje bajo, se
 *      devuelven candidatos para que el staff elija
 *
 * @module lib/quick-order-parser
 */

export type QuickOrderCandidate = {
  id: number;
  name: string;
  price: number;
  type: "product" | "combo";
};

/** Un item del catálogo junto a todos los textos por los que se lo puede nombrar. */
export type QuickOrderEntry = {
  candidate: QuickOrderCandidate;
  /** Nombre real + search_aliases. */
  labels: string[];
};

export type QuickOrderParsedItem = {
  /** Texto original del segmento, para mostrarle al staff de dónde salió. */
  raw: string;
  quantity: number;
  matched: QuickOrderCandidate | null;
  /** Sugerencias cuando no hubo un ganador claro. */
  candidates: QuickOrderCandidate[];
};

/**
 * Un pedido dentro del texto. Un mismo texto puede tener varios:
 * cada "para <nombre>" cierra un grupo.
 */
export type QuickOrderGroup = {
  /** Referencia del cliente mostrador. `null` = pedido sin nombre. */
  alias: string | null;
  items: QuickOrderParsedItem[];
  /**
   * Ítems que quedaron sueltos después del último "para <nombre>". No se
   * asignan solos: el staff decide a qué pedido van.
   */
  orphan: boolean;
};

/** Lo que devuelve el server action `parseQuickOrderText` al diálogo. */
export type QuickOrderParseResult = {
  groups: QuickOrderGroup[];
  /** Catálogo completo, para el buscador manual de las líneas sin resolver. */
  catalog: QuickOrderCandidate[];
};

// ── Umbrales de decisión ─────────────────────────────────────────────────────
/** Puntaje a partir del cual un match se considera exacto e indiscutible. */
const EXACT_SCORE = 96;
/** Puntaje mínimo para aceptar un match automático. */
const CONFIDENT_SCORE = 72;
/** Ventaja mínima sobre el segundo lugar para no preguntar. */
const MIN_LEAD = 8;
/** Puntaje mínimo para siquiera sugerir un candidato. */
const SUGGEST_SCORE = 45;

/** Minúsculas, sin tildes ni signos. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

/** Relleno que no aporta al match ("con dos coca porfa"). */
const FILLER_WORDS = new Set([
  "porfa", "porfavor", "favor", "por", "con", "de", "del",
  "la", "el", "los", "las", "y", "mas", "otro", "otra",
]);

/** Distancia de Levenshtein — tolera typos ("dorilcos" → "dorilocos"). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 0;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Puntúa 0-100 qué tan bien `query` (ya normalizado) describe a `label`.
 * Las reglas van de más a menos confiable.
 */
export function scoreLabel(query: string, label: string): number {
  const target = normalizeText(label);
  if (!target || !query) return 0;

  if (target === query) return 100;

  // "cocacola" vs "coca cola"
  const squashedTarget = target.replace(/\s/g, "");
  const squashedQuery = query.replace(/\s/g, "");
  if (squashedTarget === squashedQuery) return EXACT_SCORE;

  if (target.startsWith(query) || query.startsWith(target)) return 86;
  if (target.includes(query) || query.includes(target)) return 76;

  // Solapamiento de palabras — "papas locas" vs "papa loca"
  const targetTokens = target.split(" ");
  const queryTokens = query.split(" ");
  const shared = queryTokens.filter((t) =>
    targetTokens.some((tt) => tt === t || (t.length > 3 && tt.startsWith(t))),
  ).length;
  if (shared > 0) {
    const ratio = shared / Math.max(targetTokens.length, queryTokens.length);
    if (ratio >= 0.5) return 55 + Math.round(ratio * 20);
  }

  // Typos — "dorilcos" (1 letra menos sobre 9) da sim ≈ 0.89 y debe alcanzar
  // para un match automático; por debajo de ~0.85 se queda en sugerencia.
  const sim = similarity(squashedQuery, squashedTarget);
  if (sim >= 0.78) return 55 + Math.round((sim - 0.78) * 200);

  return 0;
}

function scoreEntry(query: string, labels: string[]): number {
  let best = 0;
  for (const label of labels) {
    const score = scoreLabel(query, label);
    if (score > best) best = score;
  }
  return best;
}

/** Saca la cantidad del principio ("2 coca", "dos coca") o del final ("coca x2"). */
export function extractQuantity(segment: string): { quantity: number; rest: string } {
  const trimmed = segment.trim();

  // "coca x2" / "coca x 2"
  const trailing = trimmed.match(/\s+x\s*(\d{1,2})\s*$/i);
  if (trailing && trailing.index !== undefined) {
    return {
      quantity: Math.max(1, Number(trailing[1])),
      rest: trimmed.slice(0, trailing.index).trim(),
    };
  }

  const tokens = trimmed.split(/\s+/);
  const first = normalizeText(tokens[0] ?? "");
  let quantity = 1;

  if (/^\d{1,2}$/.test(first)) {
    quantity = Number(first);
    tokens.shift();
  } else if (NUMBER_WORDS[first] !== undefined) {
    quantity = NUMBER_WORDS[first];
    tokens.shift();
  }

  return { quantity: Math.max(1, quantity), rest: tokens.join(" ").trim() };
}

/** Quita relleno; si queda vacío, se vuelve al texto original normalizado. */
function buildQuery(rest: string): string {
  const normalized = normalizeText(rest);
  const cleaned = normalized
    .split(" ")
    .filter((t) => t && !FILLER_WORDS.has(t))
    .join(" ");
  return cleaned || normalized;
}

/**
 * Separa el alias del cliente de UN segmento.
 * "quatro para Javier" → { alias: "Javier", itemText: "quatro" }
 * "para Mariana"       → { alias: "Mariana", itemText: "" }
 * "coca"               → { alias: null, itemText: "coca" }
 */
export function splitSegmentAlias(
  segment: string,
  entries: QuickOrderEntry[],
): { alias: string | null; itemText: string } {
  const working = segment.trim();
  const match = working.match(/\b(?:para|pa)\b\s+([^,;\n]+)\s*$/i);
  if (!match || match.index === undefined) return { alias: null, itemText: working };

  const captured = match[1].trim();
  const normalized = normalizeText(captured);

  // "dos empanadas para llevar" no es un nombre de persona.
  const isTakeaway = /^(llevar|aca|aqui|comer aqui|mesa|ya|ahora|compartir)\b/.test(normalized);
  // "papas para acompañar la soberana" tampoco, si lo que sigue es del catálogo.
  const looksLikeItem = entries.some((e) => scoreEntry(normalized, e.labels) >= 86);

  if (isTakeaway || looksLikeItem || captured.length > 40) {
    return { alias: null, itemText: working };
  }

  return { alias: captured, itemText: working.slice(0, match.index).trim() };
}

/** Matchea UN segmento (ya sin el "para <nombre>") contra el catálogo. */
export function matchSegment(segment: string, entries: QuickOrderEntry[]): QuickOrderParsedItem {
  const { quantity, rest } = extractQuantity(segment);
  const query = buildQuery(rest);

  if (query.length < 2) {
    return { raw: segment, quantity, matched: null, candidates: [] };
  }

  const scored = entries
    .map((entry) => ({ candidate: entry.candidate, score: scoreEntry(query, entry.labels) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return { raw: segment, quantity, matched: null, candidates: [] };

  const second = scored[1];

  // Match automático solo si es exacto, o si es bueno Y despega del segundo.
  // Ante un empate cerrado preferimos preguntar antes que cobrar mal.
  const isConfident =
    best.score >= EXACT_SCORE ||
    (best.score >= CONFIDENT_SCORE && (!second || best.score - second.score >= MIN_LEAD));

  if (isConfident) {
    return { raw: segment, quantity, matched: best.candidate, candidates: [] };
  }

  return {
    raw: segment,
    quantity,
    matched: null,
    candidates: scored.filter((s) => s.score >= SUGGEST_SCORE).slice(0, 4).map((s) => s.candidate),
  };
}

/**
 * Interpreta el texto completo contra el catálogo.
 *
 * Un mismo texto puede contener VARIOS pedidos: cada `para <nombre>` cierra un
 * grupo y todo lo acumulado antes le pertenece a esa persona.
 *
 *   "Parcerita, quatro para Javier, soberana, agua para Laura"
 *     → Javier: parcerita + quatro
 *     → Laura:  soberana + agua
 *
 * Lo que queda suelto DESPUÉS del último nombre se devuelve como grupo huérfano
 * (`orphan: true`) para que el staff decida a quién asignarlo — no se lo
 * regalamos al último cliente por nuestra cuenta.
 *
 * No decide nada irreversible: el resultado es un preview para confirmar.
 */
export function parseQuickOrder(
  text: string,
  entries: QuickOrderEntry[],
): { groups: QuickOrderGroup[] } {
  const segments = text
    .split(/[,;\n]+|\s+\+\s+|\s+y\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const groups: QuickOrderGroup[] = [];
  let pending: QuickOrderParsedItem[] = [];

  for (const segment of segments) {
    const { alias, itemText } = splitSegmentAlias(segment, entries);

    if (itemText) pending.push(matchSegment(itemText, entries));

    if (alias) {
      groups.push({ alias, items: pending, orphan: false });
      pending = [];
    }
  }

  if (pending.length > 0) {
    // Si nunca hubo un "para <nombre>", esto es simplemente un pedido mostrador
    // sin nombre — no hay nada ambiguo que preguntar.
    groups.push({ alias: null, items: pending, orphan: groups.length > 0 });
  }

  return { groups };
}
