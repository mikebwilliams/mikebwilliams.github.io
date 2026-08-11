import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("header Start/Stop controls the shared metronome", async ({ page }) => {
  await page.goto(TEST_URL);

  const transportToggle = page.locator("#btnMetronomeTransport");
  const metronomeToggle = page.locator("#btnMetronomeToggle");

  await expect(transportToggle).toHaveText("Start");
  await expect(transportToggle).toHaveAttribute("aria-pressed", "false");
  await expect(metronomeToggle).toHaveText("Start");

  await transportToggle.click();

  await expect(transportToggle).toHaveText("Stop");
  await expect(transportToggle).toHaveAttribute("aria-pressed", "true");
  await expect(transportToggle).toHaveAttribute("title", "Stop the metronome");
  await expect(metronomeToggle).toHaveText("Stop");
  expect(await page.evaluate(() => metronomeState.isRunning)).toBe(true);

  await transportToggle.click();

  await expect(transportToggle).toHaveText("Start");
  await expect(transportToggle).toHaveAttribute("aria-pressed", "false");
  await expect(metronomeToggle).toHaveText("Start");
  expect(await page.evaluate(() => metronomeState.isRunning)).toBe(false);

  await transportToggle.focus();
  await page.keyboard.press("Space");

  await expect(transportToggle).toHaveText("Stop");
  expect(await page.evaluate(() => metronomeState.isRunning)).toBe(true);

  await page.keyboard.press("Space");

  await expect(transportToggle).toHaveText("Start");
  expect(await page.evaluate(() => metronomeState.isRunning)).toBe(false);

  await metronomeToggle.click();
  await expect(transportToggle).toHaveText("Stop");
  await metronomeToggle.click();
  await expect(transportToggle).toHaveText("Start");
});
