import { expect, test, type Page } from "@playwright/test";

// Phone and tablet layout checks. Viewports are set here, so run them once (mobile project only).
const viewports = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
];
const routes = ["/", "/cabinet", "/map", "/digest", "/pharmacist", "/how-it-works", "/privacy", "/disclaimer"];

async function noSidewaysScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra).toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test.describe(`mobile ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true });
    test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile"));

    test("no route scrolls sideways, light and dark", async ({ page }) => {
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const route of routes) {
          await page.goto(route);
          await noSidewaysScroll(page);
        }
      }
    });

    test("top bar controls are thumb-sized", async ({ page }) => {
      await page.goto("/");
      for (const control of [
        page.getByRole("button", { name: "Change light or dark mode" }),
        page.locator(".topbar .lang button").first(),
        page.getByRole("button", { name: "Check medicine" }),
      ]) {
        const box = await control.boundingBox();
        expect(box, "control is visible").not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test.describe("phone flows", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile"));

  test("form fields use 16px text so iOS does not zoom", async ({ page }) => {
    for (const route of ["/", "/pharmacist", "/map"]) {
      await page.goto(route);
      const fields = page.locator("input:visible:not([type=checkbox]):not([type=file]), textarea:visible, select:visible");
      const sizes = await fields.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    }
  });

  test("a check gives an answer without sideways scroll", async ({ page }) => {
    await page.goto("/");
    await page.locator("button:visible").filter({ hasText: "Eye drops" }).first().click();
    await page.getByRole("button", { name: "Check medicine" }).click();
    await expect(page.getByText("Registered, no alerts")).toBeVisible();
    await noSidewaysScroll(page);
  });

  test("the licensed-pharmacy table stacks into cards", async ({ page }) => {
    await page.goto("/map");
    const table = page.locator("table.tbl-stack").first();
    if ((await table.count()) === 0) test.skip(true, "no table on this build");
    // Header stays for screen readers but is visually clipped; rows become blocks with labels.
    const head = await table.locator("thead").boundingBox();
    expect(head!.height).toBeLessThanOrEqual(1);
    await expect(table.locator("tbody tr").first()).toHaveCSS("display", "block");
    await noSidewaysScroll(page);
  });

  test("the disclaimer appears once per page", async ({ page }) => {
    for (const route of ["/cabinet", "/map", "/pharmacist", "/digest"]) {
      await page.goto(route);
      await expect(page.locator("footer")).toHaveCount(1);
    }
  });
});
