import { createContext, Script } from "node:vm";

/**
 * Smoke test del JavaScript generado por el modelo para una simulación.
 *
 * El validador estático (validateSimulationHtml) solo mira que el HTML
 * "parezca" correcto; este módulo ejecuta el <script> inline en un
 * entorno simulado (DOM/canvas mínimos) y detecta lo que de verdad rompe
 * la simulación en el iframe: errores de sintaxis, ids que no existen
 * (null.getContext -> TypeError) y variables indefinidas.
 *
 * Si el script falla aquí, fallaría igual en el navegador del estudiante,
 * así que la ruta /api/visualize lo rechaza (con reembolso de cuota)
 * antes de mostrarle algo roto.
 */

export type SmokeResult = { ok: true } | { ok: false; detail: string };

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

function makeCtx2d(): unknown {
  const gradient = { addColorStop() {} };
  const target: Record<string | symbol, unknown> = {};
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return (t as Record<string | symbol, unknown>)[p];
      if (p === "createLinearGradient" || p === "createRadialGradient" || p === "createPattern")
        return () => gradient;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return (..._args: unknown[]) => undefined;
    },
    set(t, p, v) {
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    },
  });
}

function makeElement(tagName = "div"): unknown {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
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
      add() {},
      remove() {},
      toggle() {},
      contains: () => false,
    },
    addEventListener: (type: string, fn: (...args: unknown[]) => void) => {
      const arr = listeners.get(type) ?? [];
      arr.push(fn);
      listeners.set(type, arr);
    },
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    appendChild: (c: unknown) => c,
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
    getContext: () => makeCtx2d(),
    click() {},
  };
  return new Proxy(el, {
    get(t, p) {
      if (p in t) return (t as Record<string | symbol, unknown>)[p];
      return undefined;
    },
    set(t, p, v) {
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    },
  });
}

/**
 * DOM mínimo. getElementById/querySelector("#id") devuelven null si el id
 * no existe, igual que en el navegador: así un id mal escrito revienta
 * aquí igual que allá (null.getContext -> TypeError).
 */
function makeDocument(ids: Set<string>): Record<string | symbol, unknown> {
  const elements = new Map<string, unknown>();
  for (const id of ids) {
    const el = makeElement() as Record<string | symbol, unknown>;
    el.id = id;
    elements.set(id, el);
  }
  const byId = (id: string) => elements.get(id) ?? null;
  return {
    getElementById: byId,
    querySelector: (sel: string) => {
      const m = /^\s*#([\w-]+)\s*$/.exec(sel);
      return m ? byId(m[1]) : makeElement();
    },
    querySelectorAll: () => [],
    createElement: (tag: string) => makeElement(tag),
    createElementNS: (_ns: string, tag: string) => makeElement(tag),
    addEventListener() {},
    body: makeElement("body"),
    documentElement: makeElement("html"),
    readyState: "complete",
  };
}

function runScripts(scripts: string[], ids: Set<string>): void {
  const document = makeDocument(ids);
  const windowStub: Record<string | symbol, unknown> = {
    document,
    addEventListener() {},
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
}

/**
 * Ejecuta el smoke test sobre el HTML de una simulación.
 * Sin <script> inline no hay nada que romper: se acepta.
 */
export function smokeTestSimulationHtml(html: string): SmokeResult {
  const scripts = extractInlineScripts(html);
  if (scripts.length === 0) return { ok: true };

  const ids = collectHtmlIds(html);
  const refs = collectReferencedIds(scripts);
  const missing = [...refs].filter((id) => !ids.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      detail: `el código usa ids que no existen en el HTML: ${missing.slice(0, 5).join(", ")}`,
    };
  }

  try {
    runScripts(scripts, ids);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: `el JavaScript falló al cargar: ${message.slice(0, 160)}` };
  }
  return { ok: true };
}
