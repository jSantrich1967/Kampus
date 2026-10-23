import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/kampus/kampus-provider", () => ({
  useKampus: () => ({ authUserId: null, profile: { role: "student" } }),
}));

import { PresentonGenerator } from "@/components/collaborate/presenton-generator";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PresentonGenerator", () => {
  it("renders nothing when the pilot flag is off (default)", () => {
    vi.stubEnv("NEXT_PUBLIC_PRESENTON_PILOT_ENABLED", "false");
    const { container } = render(createElement(PresentonGenerator));
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Generar presentación desde mi cuaderno")).toBeNull();
  });

  it("renders the generator card when the flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRESENTON_PILOT_ENABLED", "true");
    render(createElement(PresentonGenerator));
    expect(await screen.findByText("Generar presentación desde mi cuaderno")).toBeTruthy();
    expect(screen.getByText(/Inicia sesión para generar una presentación/)).toBeTruthy();
  });
});
