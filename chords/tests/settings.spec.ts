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

test("Metronome panel persists its open state and settings", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("#panelMetronome > summary");
  await expect(page.locator("#panelMetronome")).toHaveAttribute("open", "");

  await page.fill("#inputMetronomeTempoNumber", "144");
  await page.locator("#inputMetronomeTempoNumber").blur();
  await page.fill("#inputMetronomeBeatsPerMeasure", "7");
  await page.locator("#inputMetronomeBeatsPerMeasure").blur();
  await page.fill("#inputMetronomeXMeasures", "3");
  await page.locator("#inputMetronomeXMeasures").blur();
  await page.fill("#inputMetronomeYMeasures", "5");
  await page.locator("#inputMetronomeYMeasures").blur();
  await page.fill("#inputMetronomeCountInMeasures", "2");
  await page.locator("#inputMetronomeCountInMeasures").blur();
  await page.check("#chkMetronomeSyncSongs");

  await expect(page.locator("#txtMetronomeTempo")).toHaveText("144");
  await expect(page.locator(".metronomePulse")).toHaveCount(7);
  await expect(page.locator("#chkMetronomeSyncSongs")).toBeChecked();

  await page.reload();

  await expect(page.locator("#panelMetronome")).toHaveAttribute("open", "");
  await expect(page.locator("#inputMetronomeTempoNumber")).toHaveValue("144");
  await expect(page.locator("#inputMetronomeBeatsPerMeasure")).toHaveValue("7");
  await expect(page.locator("#inputMetronomeXMeasures")).toHaveValue("3");
  await expect(page.locator("#inputMetronomeYMeasures")).toHaveValue("5");
  await expect(page.locator("#inputMetronomeCountInMeasures")).toHaveValue("2");
  await expect(page.locator("#chkMetronomeSyncSongs")).toBeChecked();
  await expect(page.locator(".metronomePulse")).toHaveCount(7);
});

test("Collapsed metronome and stats summaries reflect current state", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const metronomeSummary = page.locator("#txtMetronomeSummary");
  const statsSummary = page.locator("#txtDailyStatsSummary");

  await expect(metronomeSummary).toBeVisible();
  await expect(metronomeSummary).toHaveText("4/4 at 120 BPM");
  await expect(statsSummary).toBeHidden();

  await page.click("#panelDailyStats > summary");
  await expect(statsSummary).toBeVisible();
  await expect(statsSummary).toHaveText("Chords: 0 / 0");

  await page.click("#panelMetronome > summary");
  await expect(metronomeSummary).toBeHidden();
  await page.fill("#inputMetronomeTempoNumber", "144");
  await page.locator("#inputMetronomeTempoNumber").blur();
  await page.fill("#inputMetronomeBeatsPerMeasure", "7");
  await page.locator("#inputMetronomeBeatsPerMeasure").blur();
  await page.click("#panelMetronome > summary");

  await expect(metronomeSummary).toBeVisible();
  await expect(metronomeSummary).toHaveText("7/4 at 144 BPM");

  await page.evaluate(() => {
    document.querySelector("#txtProgressionsCorrect").textContent = "2";
    document.querySelector("#txtProgressionsIncorrect").textContent = "1";
    updateStatTotals();
    updateDailyStatsSummary();
  });
  await page.click("label[for='tabModeProgressions']");

  await expect(statsSummary).toHaveText("Progressions: 2 / 3");
});

test("Collapsed daily stats summary reflects loaded workout goals", async ({
  page,
}) => {
  const presetName = `Goal Preset ${Date.now()}`;

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const statsSummary = page.locator("#txtDailyStatsSummary");
  await page.click("#panelDailyStats > summary");
  await expect(statsSummary).toBeVisible();
  await expect(statsSummary).toHaveText("Chords: 0 / 0");

  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsSave");

  await page.click("label[for='tabOptionsWorkouts']");
  await page.fill("#inputWorkoutName", "Goal Summary Workout");
  await page.selectOption("#selectWorkoutPreset", presetName);
  await page.fill("#inputWorkoutGoalCorrect", "3");
  await page.fill("#inputWorkoutGoalTotal", "5");
  await page.click("#btnWorkoutAddEntry");
  await page
    .locator(".workoutEntry")
    .filter({ hasText: presetName })
    .getByRole("button", { name: "Load" })
    .click();

  await expect(statsSummary).toHaveText(
    "Chords: 0 / 0, Goals: 3 correct / 5 total",
  );
});

test("Random flow resumes from the last practiced key after reload", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.selectOption("#selectFlow", "random");
  await page.selectOption("#selectFlowStart", "C");
  await expect(page.locator("#txtCurrentKey")).toHaveText("C");

  await page.evaluate(() => {
    const originalRandom = Math.random;
    Math.random = () => 0.75;
    nextProgression();
    Math.random = originalRandom;
  });

  const advancedKeyDisplay = (
    (await page.locator("#txtCurrentKey").textContent()) || ""
  ).trim();
  const advancedKeyValue = await page.locator("#selectFlowStart").inputValue();

  expect(advancedKeyDisplay).toBeTruthy();
  expect(advancedKeyDisplay).not.toBe("C");
  expect(advancedKeyValue).toBeTruthy();
  expect(advancedKeyValue).not.toBe("C");

  await page.reload();

  await expect(page.locator("#selectFlow")).toHaveValue("random");
  await expect(page.locator("#selectFlowStart")).toHaveValue(advancedKeyValue);
  await expect(page.locator("#txtCurrentKey")).toHaveText(advancedKeyDisplay);
});

test("Changing voicing mode updates chord answer and visible keyboard hints", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.evaluate(() => {
    keys = ["C"];
    keyIndex = 0;
    currentChordName = "C7";
    currentChordInternalName = "C7";
    currentChordNotes = voicingUtils.applyVoicingMode("C7", "default").notes;
    activeKeys = [];
    isIncorrect = false;
    awaitingKeyRelease = false;
    document
      .querySelector("#txtChord")
      .classList.remove("correct", "incorrect");
    updateDisplay();
  });

  const highlightedNotes = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".key.highlight"))
        .map((key) => Number(key.getAttribute("data-note")))
        .sort((a, b) => a - b),
    );

  await page.check("#chkDisplayHighlightKeys");
  await page.fill("#inputDisplayHighlightDelay", "0");
  await page.evaluate(() => highlightCorrectKeys());
  await expect.poll(highlightedNotes).toEqual([48, 52, 55, 58]);

  await page.evaluate(() => {
    document.querySelector("#inputDisplayHighlightDelay").value = "3";
  });
  await page.click("label[for='tabOptionsVoicings']");
  await page.check("#radVoicingRoot");

  await expect
    .poll(() =>
      page.evaluate(() =>
        [
          ...new Set(currentChordNotes.map(voicingUtils.normalizePitchClass)),
        ].sort((a, b) => a - b),
      ),
    )
    .toEqual([0]);
  await expect.poll(highlightedNotes, { timeout: 500 }).toEqual([48]);

  const acceptedRootOnly = await page.evaluate(() => {
    handleKeyPressed(48);
    checkChord();
    return document.querySelector("#txtChord").classList.contains("correct");
  });
  expect(acceptedRootOnly).toBe(true);
});
