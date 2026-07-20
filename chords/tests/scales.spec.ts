import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Scale mode falls back to Ionian when every scale is disabled", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.evaluate(() => {
    Object.keys(scales).forEach((key) => {
      scales[key].enabled = false;
      if (dom.scaleCheckboxes[key]) {
        dom.scaleCheckboxes[key].checked = false;
      }
    });
  });
  await page.click("label[for='tabModeScales']");

  await expect
    .poll(() =>
      page.evaluate(() => ({
        selectedScale,
        name: currentProgressionName,
        progressionLength: currentProgression.length,
      })),
    )
    .toEqual({
      selectedScale: "scaleIonian",
      name: "Ionian",
      progressionLength: 8,
    });
});
