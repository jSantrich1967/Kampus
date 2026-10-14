import { createContext, Script } from "node:vm";

/**
 * Smoke test del JavaScript generado por el modelo para una simulación.
 *
 * El validador estático (validateSimulationHtml) solo mira que el HTML
 * "parezca" correcto; este módulo ejecuta el <script> inline en un
 * entorno simulado (DOM/canvas mínimos) y detecta lo que de verdad rompe
 * la simulación en el iframe:
 * - errores de sintaxis;
 * - ids que no existen (null.getContext -> TypeError);
 * - variables indefinidas al cargar;
 * - handlers que lanzan al dispararse o que no mutan nada (controles
 *   decorativos: el texto "addEventListener" está pero no hace nada).
 *
 * Si el script falla aquí, fallaría igual en el navegador del estudiante,
 * así que la ruta /api/visualize lo rechaza (con reembolso de cuota)
 * antes de mostrarle algo roto.
 */

export type SmokeResult = { ok: true } | { ok: false; detail: string };

/** Contador de mutaciones observables (sets en elementos, llamadas a canvas). */
type Mutations = { count: number };

function inlineScriptPattern(): RegExp {
  return /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script\s*>/gi;
}

/** Extrae el contenido de los <script> inline (ignora los que tienen src). */
export function extractInlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = inlineScriptPattern();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1].trim()) out.push(m[1]);
  }
  return out;
}

function collectHtmlIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /\sid\s*=\s*["']([\w-]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return ids;
}

/** Mapa id -> tag en mayúsculas, para saber qué controles disparar. */
function collectIdTags(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<([a-zA-Z][\w-]*)[^>]*\sid\s*=\s*["']([\w-]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) map.set(m[2], m[1].toUpperCase());
  return map;
}

/**
 * Ids referenciados con literales en el JS (getElementById("x"),
 * querySelector("#x")). Solo literales: lo dinámico no se puede verificar
 * y no se penaliza.
 */
function collectReferencedIds(scripts: string[]): Set<string> {
  const refs = new Set<string>();
  const patterns = [
    /getElementById\s*\(\s*["']([\w-]+)["']\s*\)/g,
    /querySelector(?:All)?\s*\(\s*["']#([\w-]+)["']/g,
  ];
  for (const code of scripts) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(code)) !== null) refs.add(m[1]);
    }
  }
  return refs;
}

function makeCtx2d(m: Mutations): unknown {
  const gradient = { addColorStop() {} };
  const target: Record<string | symbol, unknown> = {};
  const counted =
    <T extends (...args: never[]) => unknown>(fn: T): T =>
    ((...args: never[]) => {
      m.count++;
      return fn(...args);
    }) as T;
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return (t as Record<string | symbol, unknown>)[p];
      if (p === "createLinearGradient" || p === "createRadialGradient" || p === "createPattern")
        return counted(() => gradient);
      if (p === "measureText") return counted(() => ({ width: 10 }));
      if (p === "getImageData") return counted(() => ({ data: new Uint8ClampedArray(4) }));
      return counted((..._args: unknown[]) => undefined);
    },
    set(t, p, v) {
      m.count++;
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    },
  });
}

type StubElement = Record<string | symbol, unknown> & {
  __listeners: Map<string, Array<(this: unknown, ...args: unknown[]) => void>>;
};

function makeElement(tagName: string, m: Mutations): unknown {
  const listeners = new Map<string, Array<(this: unknown, ...args: unknown[]) => void>>();
  const el: Record<string | symbol, unknown> = {
    tagName: tagName.toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    textContent: "",
    innerHTML: "",
    value: "",
    width: 800,
    height: 600,
    classList: {
      add: () => {
        m.count++;
      },
      remove: () => {
        m.count++;
      },
      toggle: () => {
        m.count++;
      },
      contains: () => false,
    },
    addEventListener: (type: string, fn: (...args: unknown[]) => void) => {
      const arr = listeners.get(type) ?? [];
      arr.push(fn as (this: unknown, ...args: unknown[]) => void);
      listeners.set(type, arr);
    },
    removeEventListener() {},
    setAttribute: () => {
      m.count++;
    },
    getAttribute: () => null,
    appendChild: (c: unknown) => {
      m.count++;
      return c;
    },
    querySelector: () => makeElement("div", m),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
    getContext: () => makeCtx2d(m),
    click() {},
    __listeners: listeners,
  };
  return new Proxy(el, {
    get(t, p) {
      if (p in t) return (t as Record<string | symbol, unknown>)[p];
      return undefined;
    },
    set(t, p, v) {
      // oninput = ..., onclick = ... también cablean el control.
      if (typeof p === "string" && p.startsWith("on") && typeof v === "function") {
        const type = p.slice(2).toLowerCase();
        const arr = listeners.get(type) ?? [];
        arr.push(v as (this: unknown, ...args: unknown[]) => void);
        listeners.set(type, arr);
      } else {
        m.count++;
      }
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    },
  }) as StubElement;
}

/**
 * DOM mínimo. getElementById/querySelector("#id") devuelven null si el id
 * no existe, igual que en el navegador: así un id mal escrito revienta
 * aquí igual que allá (null.getContext -> TypeError).
 */
function makeDocument(
  ids: Set<string>,
  idTags: Map<string, string>,
  m: Mutations,
  deferred: Array<() => void>,
): Record<string | symbol, unknown> {
  const elements = new Map<string, StubElement>();
  for (const id of ids) {
    const el = makeElement(idTags.get(id) ?? "div", m) as StubElement;
    (el as Record<string | symbol, unknown>).id = id;
    elements.set(id, el);
  }
  const byId = (id: string) => elements.get(id) ?? null;
  const capture = (type: string, fn: unknown) => {
    if ((type === "DOMContentLoaded" || type === "load") && typeof fn === "function") {
      deferred.push(() => (fn as () => void)());
    }
  };
  const doc: Record<string | symbol, unknown> = {
    getElementById: byId,
    querySelector: (sel: string) => {
      const selMatch = /^\s*#([\w-]+)\s*$/.exec(sel);
      return selMatch ? byId(selMatch[1]) : makeElement("div", m);
    },
    querySelectorAll: () => [],
    createElement: (tag: string) => makeElement(tag, m),
    createElementNS: (_ns: string, tag: string) => makeElement(tag, m),
    addEventListener: capture,
    body: makeElement("body", m),
    documentElement: makeElement("html", m),
    readyState: "complete",
    __elements: elements,
  };
  return doc;
}

function runScripts(
  scripts: string[],
  ids: Set<string>,
  idTags: Map<string, string>,
  m: Mutations,
): Map<string, StubElement> {
  const deferred: Array<() => void> = [];
  const document = makeDocument(ids, idTags, m, deferred);
  const windowStub: Record<string | symbol, unknown> = {
    document,
    addEventListener: (type: string, fn: unknown) => {
      if ((type === "DOMContentLoaded" || type === "load") && typeof fn === "function") {
        deferred.push(() => (fn as () => void)());
      }
    },
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
  };
  const sandbox: Record<string | symbol, unknown> = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    document,
    window: windowStub,
    self: windowStub,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    performance: { now: () => 0 },
    navigator: { userAgent: "smoke" },
    alert() {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 800,
  };
  const context = createContext(sandbox);
  for (const code of scripts) {
    new Script(code, { filename: "simulation.js" }).runInContext(context, { timeout: 2000 });
  }
  // Dispara inits diferidos (DOMContentLoaded / window.onload).
  for (const fn of deferred) fn();
  return (document as Record<string | symbol, unknown>).__elements as Map<string, StubElement>;
}

/**
 * Dispara los handlers de cada control (input en sliders, click en
 * botones) y exige que produzcan al menos una mutación observable.
 * Un handler vacío o que no toca nada = control decorativo.
 */
function fireControlHandlers(elements: Map<string, StubElement>, m: Mutations): SmokeResult {
  const mockEvent = (target: unknown) => ({
    target,
    preventDefault() {},
    stopPropagation() {},
  });
  for (const [id, el] of elements) {
    const tag = el.tagName as string;
    const listeners = el.__listeners;
    if (tag === "INPUT") {
      const fns = [...(listeners.get("input") ?? []), ...(listeners.get("change") ?? [])];
      if (fns.length === 0) continue;
      try {
        (el as Record<string | symbol, unknown>).value = String(
          Number((el as Record<string | symbol, unknown>).value || 0) + 1,
        );
        const before = m.count;
        for (const fn of fns) fn.call(el, mockEvent(el));
        if (m.count === before) {
          return { ok: false, detail: `el control #${id} no actualiza nada al moverlo` };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, detail: `el control #${id} falla al usarlo: ${message.slice(0, 120)}` };
      }
    } else if (tag === "BUTTON") {
      const fns = listeners.get("click") ?? [];
      if (fns.length === 0) continue;
      try {
        const before = m.count;
        for (const fn of fns) fn.call(el, mockEvent(el));
        if (m.count === before) {
          return { ok: false, detail: `el botón #${id} no hace nada al pulsarlo` };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, detail: `el botón #${id} falla al pulsarlo: ${message.slice(0, 120)}` };
      }
    }
  }
  return { ok: true };
}

/**
 * Ejecuta el smoke test sobre el HTML de una simulación.
 * Sin <script> inline no hay nada que romper: se acepta.
 */
export function smokeTestSimulationHtml(html: string): SmokeResult {
  // Un <script> sin cerrar (salida truncada del modelo) mataría el script
  // en el navegador; y sin este cheque el test pasaría en vacío.
  const openScripts = html.match(/<script(?![^>]*\bsrc\b)[^>]*>/gi)?.length ?? 0;
  const closeScripts = html.match(/<\/script\s*>/gi)?.length ?? 0;
  if (openScripts > closeScripts) {
    return { ok: false, detail: "el <script> quedó sin cerrar (código truncado)" };
  }

  const scripts = extractInlineScripts(html);
  if (scripts.length === 0) return { ok: true };

  const ids = collectHtmlIds(html);
  const idTags = collectIdTags(html);
  const refs = collectReferencedIds(scripts);
  const missing = [...refs].filter((id) => !ids.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      detail: `el código usa ids que no existen en el HTML: ${missing.slice(0, 5).join(", ")}`,
    };
  }

  const m: Mutations = { count: 0 };
  let elements: Map<string, StubElement>;
  try {
    elements = runScripts(scripts, ids, idTags, m);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: `el JavaScript falló al cargar: ${message.slice(0, 160)}` };
  }

  m.count = 0;
  return fireControlHandlers(elements, m);
}
