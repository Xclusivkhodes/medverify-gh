import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

function watchNetwork(page: Page) {
  const blocked: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("tokenfactory.nebius.com") || url.includes("api.tavily.com")) blocked.push(url);
  });
  return blocked;
}

async function visibleEyeDrops(page: Page) {
  return page.locator("button:visible").filter({ hasText: "Eye drops" }).first();
}

test("home, eye drops, cabinet warning, no live calls", async ({ page }, info) => {
  const blocked = watchNetwork(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Check the batch/ }).first()).toBeVisible();
  if (info.project.name === "mobile") {
    await mkdir("docs/screenshots", { recursive: true });
    await page.screenshot({ path: "docs/screenshots/home-mobile-light.png", fullPage: true });
  }
  await (await visibleEyeDrops(page)).click();
  await page.getByRole("button", { name: "Check medicine" }).click();
  await expect(page.getByText("Registered, no alerts")).toBeVisible();
  await expect(page.getByText("The barcode matches the printed batch and expiry.")).toBeVisible();
  await expect(page.getByText("A photo cannot prove a medicine is genuine.")).toBeVisible();
  if (info.project.name === "mobile") {
    await page.screenshot({ path: "docs/screenshots/result-no-alerts-mobile.png", fullPage: true });
  }
  await page.getByRole("button", { name: "Save to the cabinet" }).click();
  await expect(page.getByRole("heading", { name: "Your medicine cabinet" })).toBeVisible();
  await page.getByRole("button", { name: "Simulate a new FDA alert" }).click();
  await expect(page.getByRole("heading", { name: "Stop using batch CV-44012" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report to FDA" })).toHaveAttribute("href", /adr\.fdaghana\.gov\.gh/);
  await expect(page.getByRole("link", { name: "Open the FDA notice" })).toHaveAttribute("href", /fdaghana\.gov\.gh/);
  if (info.project.name === "mobile") {
    await page.screenshot({ path: "docs/screenshots/cabinet-alert-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Change light or dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
    await page.screenshot({ path: "docs/screenshots/cabinet-alert-mobile-toggled.png", fullPage: true });
  }
  expect(blocked).toEqual([]);
});

test("Para Clear is do not use, with the fixed contacts", async ({ page }) => {
  const blocked = watchNetwork(page);
  await page.goto("/");
  await page.locator("button:visible").filter({ hasText: "Child’s fever syrup" }).first().click();
  await page.getByRole("button", { name: "Check medicine" }).click();
  await expect(page.getByRole("heading", { name: "Do not use" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Call 112/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /adr\.fdaghana\.gov\.gh|Med Safety/ }).first()).toBeVisible();
  expect(blocked).toEqual([]);
});

test("pharmacist log, digest, regions, and static pages", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "once is enough");
  await page.goto("/pharmacist");
  await page.getByLabel("Product name").fill("Para Clear Suspension 125");
  await page.getByLabel("Batch").fill("L220008");
  await page.getByRole("button", { name: "Check and log" }).click();
  await expect(page.getByText("Do not use")).toBeVisible();
  await expect(page.getByText(/Verified on/)).toBeVisible();

  await page.goto("/digest");
  await expect(page.getByRole("heading", { name: "Procold Suspension" })).toBeVisible();

  await page.goto("/map");
  await page.getByLabel("What looked wrong").fill("Spelling on the carton looked wrong");
  await page.getByRole("button", { name: "Save report on this phone" }).click();
  await expect(page.getByText("1 report")).toBeVisible();

  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { name: "Check the batch, not the box." })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "What stays on your phone" })).toBeVisible();
  await page.goto("/disclaimer");
  await expect(page.getByText("A photo cannot prove a medicine is genuine.")).toBeVisible();
  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
