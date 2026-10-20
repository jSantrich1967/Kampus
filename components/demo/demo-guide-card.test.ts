import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoGuideCard } from "@/components/demo/demo-guide-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("DemoGuideCard", () => {
  it("starts collapsed so the mission stays ahead of the five steps", async () => {
    window.localStorage.setItem("kampus.demoMode", "1");
    render(createElement(DemoGuideCard));

    expect(await screen.findByRole("button", { name: "Ver recorrido" })).toBeTruthy();
    expect(screen.queryByText("Mira tu misión de hoy")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver recorrido" }));
    expect(screen.getByText("1. Mira tu misión de hoy")).toBeTruthy();
  });
});
