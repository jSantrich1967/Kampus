import { expect, test, type Page } from "@playwright/test";

async function waitUntilReactIsReady(page: Page, selector: string) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    if (!element) return false;
    return Object.getOwnPropertyNames(element).some((key) => key.startsWith("__react"));
  }, selector);
}

test("the Pro price links to registration, not to a payment page", async ({ page }) => {
  await page.goto("/");
  const pro = page.locator("article").filter({ hasText: "$5" });
  await expect(pro).toBeVisible();
  await expect(pro).toContainText("Bs.");
  await expect(pro).toContainText("Pago Móvil");
  const start = pro.getByRole("link", { name: "Empezar ahora" });
  await expect(start).toHaveAttribute("href", "/register");
  await expect(start).not.toHaveAttribute("href", /checkout|stripe|pay/i);
});

test("the privacy policy names processors, WhatsApp consent and contact", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { name: "Política de Privacidad" })).toBeVisible();
  await expect(page.getByText("Supabase")).toBeVisible();
  await expect(page.getByText("OpenAI").first()).toBeVisible();
  await expect(page.getByText(/avisos por WhatsApp son opcionales/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "ventas@kampus.app" })).toBeVisible();
});

test("the guided demo opens Modo examen without a login wall", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Recorrido guiado de la demo")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: /Modo examen/i }).click();
  await expect(page).toHaveURL(/\/modo-examen/);
  await expect(page.getByText("Crea tu cuenta gratis para seguir usando el modo examen")).toHaveCount(0);
});

test("the Pro page sends guests to login", async ({ page }) => {
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await waitUntilReactIsReady(page, "form");
  await page.getByPlaceholder("ejemplo@email.com").fill("playwright-no-account@example.com");
  await page.getByPlaceholder("••••••••").fill("not-a-real-password");
  await page.locator("form").getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();
});

test("an empty login form does not leave the page", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Correo")).toBeVisible();
});

test("a hostile next parameter does not leave the app", async ({ page }) => {
  await page.goto("/login?next=https://evil.example/phish");
  await expect(page).toHaveURL(/127\.0\.0\.1:3002\/login/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("the mobile menu opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await waitUntilReactIsReady(page, "header button");
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await expect(page.getByRole("link", { name: "Hoy" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar navegación" }).click();
  await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
