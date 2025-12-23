import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Presets tab renders (and no console errors)", async ({ page }) => {
  const errors: string[] = [];

  // Capture browser console messages
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") errors.push(`[console.${type}] ${text}`);
    else console.log(`[console.${type}] ${text}`);
  });

  // Capture uncaught page exceptions
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  await page.goto(TEST_URL);

  // After test actions, check if there were errors
  if (errors.length) {
    console.error("=== JavaScript Errors Detected ===");
    for (const e of errors) console.error(e);
    throw new Error(`${errors.length} console error(s) found`);
  }
});

test("Overwrite button saves current settings to the selected preset", async ({
  page,
}) => {
  const errors: string[] = [];
  const selectTab = async (tabId: string) => {
    await page.click(`label[for='${tabId}']`);
  };

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") errors.push(`[console.${type}] ${text}`);
  });

  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "ascendingWholeSteps");

  const presetName = `Preset-${Date.now()}`;

  await selectTab("tabOptionsPresets");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsSave");

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "descendingMinorThirds");

  await selectTab("tabOptionsPresets");
  await page.selectOption("#selectSettingsPreset", presetName);
  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#btnSettingsOverwrite");

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "random");

  await selectTab("tabOptionsPresets");
  await page.selectOption("#selectSettingsPreset", presetName);
  await page.click("#btnSettingsLoad");

  await selectTab("tabOptionsKeys");
  await expect(page.locator("#selectFlow")).toHaveValue(
    "descendingMinorThirds",
  );

  if (errors.length) {
    console.error("=== JavaScript Errors Detected ===");
    for (const e of errors) console.error(e);
    throw new Error(`${errors.length} console error(s) found`);
  }
});
