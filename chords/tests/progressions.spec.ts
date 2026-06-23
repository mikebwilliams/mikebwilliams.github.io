import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Progression display preserves roman numeral capitalization", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");
  await page.selectOption("#selectProgression", "ii7-V7-IM7");

  const cadence = page.locator("#txtCadence");
  await expect(cadence).toContainText("ii7-V7-IM7");
  await expect(cadence).toHaveCSS("text-transform", "none");

  const progression = page.locator("#txtProgression");
  await expect(progression).toContainText("ii7 - V7 - IM7");
  await expect(progression).toHaveCSS("text-transform", "none");
});
