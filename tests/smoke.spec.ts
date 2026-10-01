import { expect, test, type Page } from "@playwright/test";
import { services } from "../src/data/services";

/** Collects uncaught errors and console errors for the life of the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // A 404 page legitimately logs its own failed document request.
    if (m.text().includes("status of 404")) return;
    errors.push(m.text());
  });
  return errors;
}

const ROUTES = ["/core", "/privacy", "/terms", ...services.map((s) => `/services/${s.slug}`)];

for (const path of ROUTES) {
  test(`${path} renders cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/Verve/);
    expect(errors).toEqual([]);
  });
}

test("unknown routes get the themed 404", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ["/does-not-exist", "/services/nope"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page).toHaveTitle("Signal lost — Verve");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Off the map.");
  }
  expect(errors).toEqual([]);
});

test("home boots the 3D scene and pages through the journey", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.locator(".scene-root canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loader")).toBeHidden({ timeout: 30_000 });

  const progress = () =>
    page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--p")));
  expect(await progress()).toBe(0);

  await page.keyboard.press("PageDown");
  await expect.poll(progress, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("Space on a focused button presses it without flying the camera", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".loader")).toBeHidden({ timeout: 30_000 });
  const progress = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--p").trim());

  // Enter the journey and wait until the camera has settled on the first
  // stop (hero, overview, the planets, then the core).
  const firstStop = (1 / (services.length + 2)).toFixed(4);
  await page.keyboard.press("PageDown");
  await expect.poll(progress, { timeout: 30_000 }).toBe(firstStop);

  await page.getByRole("button", { name: "Contact" }).focus();
  await page.keyboard.press(" ");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await progress()).toBe(firstStop);
});

test("logo goes home without a full reload, and EVA opens from another page", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/services/${services[0].slug}`);
  // Survives client-side navigation, but not a document reload.
  await page.evaluate(() => ((window as unknown as { __spa: boolean }).__spa = true));

  await page.getByRole("link", { name: "Verve, home" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa)).toBe(true);

  // From a service page, EVA has to wait for the home scene, however slow.
  await page.goto(`/services/${services[0].slug}`);
  await page.getByRole("button", { name: /EVA/ }).click();
  await expect(page.locator("html")).toHaveClass(/free-mode/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Exit EVA" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a service page opened from the journey still scrolls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".loader")).toBeHidden({ timeout: 30_000 });
  const progress = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--p").trim());
  const stop = (n: number) => (n / (services.length + 2)).toFixed(4);

  // Fly to the first planet and take its terminal's "Explore planet" option.
  for (const n of [1, 2]) {
    await page.keyboard.press("PageDown");
    await expect.poll(progress, { timeout: 30_000 }).toBe(stop(n));
  }
  await page.getByText("Explore planet").first().click({ timeout: 30_000 });
  await page.waitForURL(/\/services\//);
  await expect(page.locator("h1")).toBeVisible();

  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeGreaterThan(100);
});

test("sound toggle is remembered and the © year is current", async ({ page }) => {
  await page.goto("/privacy");
  const toggle = page.getByRole("button", { name: "Interface sounds" });
  // New visitors start muted.
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("verve:sound"))).toBe("on");

  await page.goto("/terms");
  await expect(page.getByRole("article").getByText(`© ${new Date().getFullYear()} Verve. All rights reserved.`)).toBeVisible();
});

test("consent banner remembers the choice", async ({ page }) => {
  await page.goto("/privacy");
  const banner = page.getByRole("region", { name: "Cookie consent" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: /Decline/ }).click();
  await expect(banner).toBeHidden();

  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  await expect(banner).toBeHidden();

  // "Cookie settings" in the footer brings it back.
  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(banner).toBeVisible();
});
