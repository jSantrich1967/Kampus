import { expect, test, type Page } from "@playwright/test";

import { assertSeparateSupabaseUrl } from "./e2e-guard";

const LIVE_HOST = "emetxjdeqnrxvjyaxfmk.supabase.co";
const baseURL = "http://127.0.0.1:3010";
const email = process.env.E2E_STUDENT_EMAIL?.trim();
const password = process.env.E2E_STUDENT_PASSWORD?.trim();
const configured = Boolean(email && password && process.env.E2E_SUPABASE_URL?.trim());

if (configured) {
  assertSeparateSupabaseUrl(process.env.E2E_SUPABASE_URL, "E2E_SUPABASE_URL");
}

async function blockLiveProject(page: Page) {
  await page.route("**/*", async (route) => {
    if (route.request().url().includes(LIVE_HOST)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function waitUntilReactIsReady(page: Page, selector: string) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    if (!element) return false;
    return Object.getOwnPropertyNames(element).some((key) => key.startsWith("__react"));
  }, selector);
}

test.describe("signed-in flows on the test project", () => {
  test.skip(!configured, "Fill .env.e2e and run npm run dev:e2e. These tests do not use the live database.");

  test("a test student can sign in and reach today", async ({ page }) => {
    await blockLiveProject(page);
    await page.goto(`${baseURL}/login`);
    await waitUntilReactIsReady(page, "form");
    await page.getByPlaceholder("ejemplo@email.com").fill(email!);
    await page.getByPlaceholder("••••••••").fill(password!);
    await page.locator("form").getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByText("Cargando…")).toHaveCount(0);
  });

  test("signing out leaves the account screens", async ({ page }) => {
    await blockLiveProject(page);
    await page.goto(`${baseURL}/login`);
    await waitUntilReactIsReady(page, "form");
    await page.getByPlaceholder("ejemplo@email.com").fill(email!);
    await page.getByPlaceholder("••••••••").fill(password!);
    await page.locator("form").getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/today$/);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
