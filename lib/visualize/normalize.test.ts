import { describe, expect, it } from "vitest";

import {
  VISUALIZE_MAX_HTML_BYTES,
  extractHtml,
  htmlByteSize,
  isValidSimulationHtml,
  normalizeTopicKey,
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
