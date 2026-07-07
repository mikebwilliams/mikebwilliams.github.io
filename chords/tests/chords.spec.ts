import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Chord type controls fit the desktop control rail without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator("#tableChordSelections thead th")).toHaveText([
    "Group",
    "Mode",
    "Major",
    "Minor",
  ]);
  await expect(
    page.locator("#tableChordSelections tbody th").first(),
  ).toHaveText("All");

  const stateCellAlignment = await page
    .locator("#tableChordSelections")
    .evaluate((table) => {
      const modeHeader = table.querySelector("thead th:nth-child(2)");
      const stateCell = table.querySelector("tbody .chordTypeStateCell");
      if (!modeHeader || !stateCell) return null;
      return {
        header: getComputedStyle(modeHeader).textAlign,
        stateCell: getComputedStyle(stateCell).textAlign,
      };
    });
  expect(stateCellAlignment).toEqual({
    header: "left",
    stateCell: "left",
  });

  const metrics = await page.locator("#panelModeChords").evaluate((panel) => ({
    clientWidth: panel.clientWidth,
    scrollWidth: panel.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
});

test("Chord type group controls cycle and reflect partial selections", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const triadButton = page.locator("#btnChordsTriads");
  const triads = [
    "#chkChordMajor",
    "#chkChordMinor",
    "#chkChordAugmented",
    "#chkChordDiminished",
    "#chkChordSuspendedFourth",
    "#chkChordSuspendedSecond",
  ];

  await expect(triadButton).toHaveAttribute("data-state", "allOn");
  await expect(triadButton).toHaveAttribute("aria-pressed", "true");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: All on");
  await expect(triadButton).toHaveText("✓");

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).not.toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOff");
  await expect(triadButton).toHaveAttribute("aria-pressed", "false");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: All off");
  await expect(triadButton).toHaveText("×");
  await expect(page.locator("#chkChordSixth")).toBeChecked();

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOn");
  await expect(triadButton).toHaveText("✓");

  await page.locator("#chkChordMajor").uncheck();
  await expect(triadButton).toHaveAttribute("data-state", "partial");
  await expect(triadButton).toHaveAttribute("aria-pressed", "mixed");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: Partial");
  await expect(triadButton).toHaveText("−");

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOn");

  await page.click("#btnChordsMajor");
  await expect(page.locator("#chkChordMajor")).not.toBeChecked();
  await expect(page.locator("#chkChordAugmented")).not.toBeChecked();
  await expect(page.locator("#chkChordSixth")).not.toBeChecked();
  await expect(page.locator("#chkChordSeventh")).not.toBeChecked();
  await expect(page.locator("#chkChordMinor")).toBeChecked();
  await expect(page.locator("#chkChordMinorSeventh")).toBeChecked();
  await expect(page.locator("#btnChordsMajor")).toHaveAttribute(
    "data-state",
    "allOff",
  );
  await expect(page.locator("#btnChordsMajor")).toHaveAttribute(
    "aria-label",
    "Major: All off",
  );
  await expect(page.locator("#btnChordsMajor")).toHaveText("×");
  await expect(page.locator("#btnChordsAll")).toHaveAttribute(
    "data-state",
    "partial",
  );
  await expect(page.locator("#btnChordsAll")).toHaveAttribute(
    "aria-label",
    "All: Partial",
  );
  await expect(page.locator("#btnChordsAll")).toHaveText("−");
});
