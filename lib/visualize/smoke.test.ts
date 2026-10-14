import { describe, expect, it } from "vitest";

import { extractInlineScripts, smokeTestSimulationHtml } from "./smoke";

const wrap = (body: string, script: string) =>
  `<!DOCTYPE html><html><body>${body}<script>${script}</script></body></html>`;

describe("extractInlineScripts", () => {
  it("ignora scripts con src y extrae los inline", () => {
    const html =
      `<script src="https://x.com/a.js"></script>` +
      `<script>var a = 1;</script>` +
      `<script type="text/javascript">var b = 2;</script>`;
    expect(extractInlineScripts(html)).toEqual(["var a = 1;", "var b = 2;"]);
  });

  it("devuelve vacío si no hay scripts", () => {
    expect(extractInlineScripts("<html><body><svg></svg></body></html>")).toEqual([]);
  });
});

describe("smokeTestSimulationHtml", () => {
  it("acepta un script válido que cablea controles", () => {
    const html = wrap(
      `<canvas id="cv"></canvas>` +
        `<input type="range" id="luz"><span id="luzVal"></span>` +
        `<button id="btn">Iniciar</button>`,
      `const cv = document.getElementById("cv");` +
        `const ctx = cv.getContext("2d");` +
        `const luz = document.getElementById("luz");` +
        `const luzVal = document.getElementById("luzVal");` +
        `luz.addEventListener("input", () => { luzVal.textContent = luz.value; ctx.clearRect(0, 0, 300, 300); });` +
        `const btn = document.getElementById("btn");` +
        `let on = false;` +
        `btn.addEventListener("click", () => { on = !on; btn.textContent = on ? "Pausar" : "Iniciar"; });`,
    );
    expect(smokeTestSimulationHtml(html)).toEqual({ ok: true });
  });

  it("rechaza ids usados que no existen en el HTML", () => {
    const html = wrap(
      `<canvas id="cv"></canvas>`,
      `document.getElementById("otro").getContext("2d");`,
    );
    const result = smokeTestSimulationHtml(html);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain("otro");
  });

  it("rechaza querySelector con id inexistente", () => {
    const html = wrap(`<div></div>`, `document.querySelector("#falta").addEventListener("click", () => {});`);
    expect(smokeTestSimulationHtml(html).ok).toBe(false);
  });

  it("rechaza scripts con error de sintaxis", () => {
    const html = wrap(`<canvas id="cv"></canvas>`, `const x = ;;;`);
    expect(smokeTestSimulationHtml(html).ok).toBe(false);
  });

  it("rechaza scripts que lanzan al cargar (variable indefinida)", () => {
    const html = wrap(`<canvas id="cv"></canvas>`, `nadaDefinido();`);
    expect(smokeTestSimulationHtml(html).ok).toBe(false);
  });

  it("acepta HTML sin scripts inline", () => {
    expect(smokeTestSimulationHtml("<html><body><svg></svg></body></html>")).toEqual({ ok: true });
  });

  it("acepta requestAnimationFrame y timers sin ejecutarlos", () => {
    const html = wrap(
      `<canvas id="cv"></canvas>`,
      `const ctx = document.getElementById("cv").getContext("2d");` +
        `requestAnimationFrame(function loop() { ctx.fillRect(0, 0, 10, 10); });`,
    );
    expect(smokeTestSimulationHtml(html)).toEqual({ ok: true });
  });

  it("rechaza un handler vacío que no muta nada", () => {
    const html = wrap(
      `<input type="range" id="s1"><span id="s1v"></span>`,
      `const s1 = document.getElementById("s1");` +
        `s1.addEventListener("input", () => {});`,
    );
    const result = smokeTestSimulationHtml(html);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain("s1");
  });

  it("rechaza un handler que lanza al dispararse", () => {
    const html = wrap(
      `<button id="btn">Iniciar</button>`,
      `const btn = document.getElementById("btn");` +
        `btn.addEventListener("click", () => { explota(); });`,
    );
    expect(smokeTestSimulationHtml(html).ok).toBe(false);
  });

  it("rechaza un botón cuyo click no hace nada", () => {
    const html = wrap(
      `<button id="btn">Iniciar</button>`,
      `const btn = document.getElementById("btn");` +
        `btn.addEventListener("click", () => { const x = 1 + 1; });`,
    );
    const result = smokeTestSimulationHtml(html);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain("btn");
  });

  it("acepta cableado dentro de DOMContentLoaded", () => {
    const html = wrap(
      `<input type="range" id="s1"><span id="s1v"></span>`,
      `document.addEventListener("DOMContentLoaded", () => {` +
        `const s1 = document.getElementById("s1");` +
        `const s1v = document.getElementById("s1v");` +
        `s1.addEventListener("input", () => { s1v.textContent = s1.value; });` +
        `});`,
    );
    expect(smokeTestSimulationHtml(html)).toEqual({ ok: true });
  });

  it("acepta el patrón del prompt (esqueleto con dibujar)", () => {
    const html = wrap(
      `<svg id="svg"></svg>` +
        `<input type="range" id="s1" value="1000"><span id="s1v">1000</span>` +
        `<input type="range" id="s2" value="400"><span id="s2v">400</span>` +
        `<button id="btn">Iniciar</button>`,
      `const $ = (id) => document.getElementById(id);` +
        `const s1 = $("s1"), s1v = $("s1v");` +
        `const s2 = $("s2"), s2v = $("s2v");` +
        `const btn = $("btn"); let corriendo = false;` +
        `function dibujar() { s1v.textContent = s1.value; }` +
        `s1.addEventListener("input", () => { s1v.textContent = s1.value; dibujar(); });` +
        `s2.addEventListener("input", () => { s2v.textContent = s2.value; dibujar(); });` +
        `btn.addEventListener("click", () => { corriendo = !corriendo; btn.textContent = corriendo ? "Pausar" : "Iniciar"; });`,
    );
    expect(smokeTestSimulationHtml(html)).toEqual({ ok: true });
  });
});
