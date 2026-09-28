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
  const pro = page.locator("article").filter({ hasText: "$10,30" });
  await expect(pro).toBeVisible();
  await expect(pro).toContainText("Bs.");
  const start = pro.getByRole("link", { name: "Empezar ahora" });
  await expect(start).toHaveAttribute("href", "/register");
  await expect(start).not.toHaveAttribute("href", /checkout|stripe|pay/i);
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
