import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NotebookCopilot } from "./notebook-copilot";

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED;
});

describe("NotebookCopilot (puerta del piloto)", () => {
  it("no renderiza nada con la bandera apagada por defecto", () => {
    delete process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED;
    const { container } = render(
      createElement(NotebookCopilot, {
        notebookTitle: "Biología",
        sheets: [{ title: "La célula" }],
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada con la bandera en \"false\"", () => {
    process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED = "false";
    const { container } = render(
      createElement(NotebookCopilot, {
        notebookTitle: "Biología",
        sheets: [{ title: "La célula" }],
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("con la bandera encendida tampoco se monta si el cuaderno no tiene hojas", () => {
    process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED = "true";
    const { container } = render(
      createElement(NotebookCopilot, { notebookTitle: "Vacío", sheets: [] }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
