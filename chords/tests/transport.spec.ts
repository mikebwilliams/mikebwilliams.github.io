import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("measureless clicks persist and switching back restores accents", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page
    .locator("#panelMetronome")
    .evaluate((panel) => (panel.open = true));
  await page.fill("#inputMetronomeBeatsPerMeasure", "0");
  await page.locator("#inputMetronomeBeatsPerMeasure").blur();
  await page.reload();
  await expect(page.locator("#inputMetronomeBeatsPerMeasure")).toHaveValue("0");
  await expect(page.locator("#txtMetronomeSummary")).toContainText(
    "Measureless",
  );
  await expect(page.locator("#inputMetronomeXMeasures")).toBeDisabled();
  await expect(page.locator("#inputMetronomeYMeasures")).toBeDisabled();
  await expect(page.locator(".metronomePulse")).toHaveCount(1);
  const ticks = await page.evaluate(async () => {
    const sounds = [];
    const original = playMetronomeTick;
    playMetronomeTick = (time, type) => sounds.push({ time, type });
    metronomeState.audioContext = { currentTime: 0 };
    metronomeState.isRunning = true;
    metronomeState.nextNoteTime = 0;
    for (let i = 0; i < 9; i++) {
      metronomeState.audioContext.currentTime = metronomeState.nextNoteTime;
      scheduleMetronomeNote();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    metronomeState.isRunning = false;
    metronomeState.audioContext = null;
    playMetronomeTick = original;
    return sounds;
  });
  expect(ticks.map((tick) => tick.type)).toEqual(Array(9).fill("normal"));
  expect(ticks[8].time - ticks[0].time).toBeCloseTo(4);
  expect(await page.evaluate(() => metronomeState.beatsPerMeasure)).toBe(0);
  await expect(page.locator("#txtMetronomeMeasure")).toHaveText("—");
  await page
    .locator("#panelMetronome")
    .evaluate((panel) => (panel.open = true));
  await page.fill("#inputMetronomeBeatsPerMeasure", "4");
  await page.locator("#inputMetronomeBeatsPerMeasure").blur();
  await expect(page.locator("#inputMetronomeXMeasures")).toBeEnabled();
  await expect(page.locator(".metronomePulse")).toHaveCount(4);
  expect(
    await page.evaluate(() =>
      [0, 1].map((beat) => getMetronomeTickTypeForBeat(beat, 1)),
    ),
  ).toEqual(["measure", "normal"]);
});

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
