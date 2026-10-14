import { describe, expect, it } from "vitest";

import { validateSimulationHtml } from "@/lib/visualize/normalize";

import {
  VISUALIZE_MAX_HTML_BYTES,
  extractHtml,
  htmlByteSize,
  isValidSimulationHtml,
  normalizeTopicKey,
  sanitizeSimulationHtml,
  topicHash,
} from "./normalize";

describe("normalizeTopicKey", () => {
  it("ignora mayúsculas, tildes y espacios extra", () => {
    expect(normalizeTopicKey("Biología", "La Célula")).toBe("biologia|la celula");
    expect(normalizeTopicKey("  BIOLOGÍA ", "la   célula ")).toBe("biologia|la celula");
  });

  it("separa materia y tema", () => {
    expect(normalizeTopicKey("Física", "Caída libre")).not.toBe(normalizeTopicKey("Física", "Tiro parabólico"));
  });
});

describe("topicHash", () => {
  it("es determinista y estable ante variantes de escritura", () => {
    const a = topicHash("Biología", "La Célula");
    const b = topicHash("biologia", "la celula");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cambia con otro tema", () => {
    expect(topicHash("Biología", "La Célula")).not.toBe(topicHash("Biología", "Fotosíntesis"));
  });
});

describe("extractHtml", () => {
  it("quita cercas de markdown html", () => {
    const raw = "```html\n<html><body>Hola</body></html>\n```";
    expect(extractHtml(raw)).toBe("<html><body>Hola</body></html>");
  });

  it("quita cercas sin lenguaje", () => {
    expect(extractHtml("```\n<svg></svg>\n```")).toBe("<svg></svg>");
  });

  it("deja pasar HTML plano", () => {
    const html = "<!DOCTYPE html><html><body>x</body></html>";
    expect(extractHtml(html)).toBe(html);
  });
});

describe("isValidSimulationHtml", () => {
  const good =
    "<!DOCTYPE html><html><head><style>body{color:#fff}</style></head>" +
    "<body><svg></svg><script>var x=1;</script></body></html>";

  it("acepta un documento HTML con SVG y JS inline", () => {
    expect(isValidSimulationHtml(good)).toBe(true);
  });

  it("acepta un fragmento con canvas", () => {
    expect(isValidSimulationHtml("<canvas id='c'></canvas><script>draw();</script>")).toBe(true);
  });

  it("rechaza texto sin HTML visual", () => {
    expect(isValidSimulationHtml("La fotosíntesis es un proceso...")).toBe(false);
    expect(isValidSimulationHtml("<p>Solo texto</p>")).toBe(false);
  });

  it("rechaza scripts externos", () => {
    expect(isValidSimulationHtml("<html><svg></svg><script src=\"https://x.com/a.js\"></script></html>")).toBe(false);
  });

  it("rechaza recursos externos en src/href", () => {
    expect(isValidSimulationHtml("<html><svg></svg><img src=\"https://x.com/a.png\"></html>")).toBe(false);
  });

  it("rechaza @import", () => {
    expect(
      isValidSimulationHtml("<html><head><style>@import url('https://x.com/a.css');</style></head><svg></svg></html>"),
    ).toBe(false);
  });

  it("rechaza sliders sin cablear (controles decorativos)", () => {
    expect(
      isValidSimulationHtml("<html><body><svg></svg><input type='range' id='luz'><script>var x=1;</script></body></html>"),
    ).toBe(false);
  });

  it("rechaza botones sin cablear", () => {
    expect(
      isValidSimulationHtml("<html><body><svg></svg><button>Iniciar</button><script>var x=1;</script></body></html>"),
    ).toBe(false);
  });

  it("acepta controles con addEventListener", () => {
    expect(
      isValidSimulationHtml(
        "<html><body><svg></svg><input type='range' id='luz'><button>Iniciar</button>" +
          "<script>document.getElementById('luz').addEventListener('input', function(){});</script></body></html>",
      ),
    ).toBe(true);
  });

  it("acepta controles con atributos on*", () => {
    expect(
      isValidSimulationHtml(
        "<html><body><svg></svg><input type='range' oninput='cambia(this.value)'><script>function cambia(){}</script></body></html>",
      ),
    ).toBe(true);
  });
});

describe("htmlByteSize", () => {
  it("mide en bytes UTF-8", () => {
    expect(htmlByteSize("abc")).toBe(3);
    expect(htmlByteSize("ñ")).toBe(2);
  });

  it("el límite es 20 KB", () => {
    expect(VISUALIZE_MAX_HTML_BYTES).toBe(20 * 1024);
  });
});

describe("validateSimulationHtml", () => {
  it("explica vacío", () => {
    expect(validateSimulationHtml("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("explica sin visual", () => {
    expect(validateSimulationHtml("<p>hola</p>")).toEqual({ ok: false, reason: "no-visual" });
  });

  it("explica recurso externo", () => {
    expect(validateSimulationHtml("<html><svg></svg><script src=\"https://x.com/a.js\"></script></html>")).toEqual({
      ok: false,
      reason: "external-resource",
    });
  });

  it("explica controles sin cablear", () => {
    expect(validateSimulationHtml("<html><svg></svg><button>Ir</button></html>")).toEqual({
      ok: false,
      reason: "controls-not-wired",
    });
  });

  it("ok cuando todo pasa", () => {
    expect(
      validateSimulationHtml("<html><svg></svg><button onclick=\"go()\">Ir</button><script>function go(){}</script></html>"),
    ).toEqual({ ok: true });
  });
});

describe("sanitizeSimulationHtml", () => {
  it("elimina scripts externos pero conserva el inline", () => {
    const out = sanitizeSimulationHtml(
      "<html><head><script src=\"https://x.com/a.js\"></script></head><body><script>var x=1;</script></body></html>",
    );
    expect(out).not.toContain("https://x.com/a.js");
    expect(out).toContain("var x=1;");
  });

  it("elimina @import (p. ej. Google Fonts)", () => {
    const out = sanitizeSimulationHtml(
      "<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Roboto');body{color:#fff}</style></head></html>",
    );
    expect(out).not.toContain("fonts.googleapis.com");
    expect(out).toContain("body{color:#fff}");
  });

  it("elimina src/href externos", () => {
    const out = sanitizeSimulationHtml("<html><body><img src=\"https://x.com/a.png\"><a href=\"https://x.com\">x</a></body></html>");
    expect(out).not.toContain("https://");
  });

  it("lo saneado pasa la validación", () => {
    const out = sanitizeSimulationHtml(
      "<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Roboto');</style></head>" +
        "<body><svg></svg><button onclick=\"go()\">Ir</button></body></html>",
    );
    expect(validateSimulationHtml(out)).toEqual({ ok: true });
  });
});
