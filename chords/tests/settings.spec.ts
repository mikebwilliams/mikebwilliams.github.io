import { test, expect, type Page } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

async function openTrainingSetup(page: Page) {
  const panel = page.locator("#panelTrainingSetup");
  if ((await panel.getAttribute("open")) === null) {
    await page.click("#panelTrainingSetup > summary");
  }
}

async function openKeyboard(page: Page) {
  const panel = page.locator("#panelKeyboard");
  if ((await panel.getAttribute("open")) === null) {
    await page.click("#panelKeyboard > summary");
  }
}

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

test("settings controls are split into independent sections", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  await expect(page.locator("#panelTrainingSetup")).toBeVisible();
  await expect(page.locator("#panelTrainingSetup")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Keys / Voicings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Preferences" }),
  ).toBeVisible();

  await expect(page.locator("#panelOptionsPresets")).toBeHidden();
  await openTrainingSetup(page);

  await expect(page.locator("#panelOptionsPresets")).toBeVisible();
  await expect(page.locator("#panelOptionsKeys")).toBeVisible();
  await expect(page.locator("#panelOptionsDisplay")).toBeVisible();

  await page.click("label[for='tabOptionsWorkouts']");
  await expect(page.locator("#panelOptionsWorkouts")).toBeVisible();
  await expect(page.locator("#panelOptionsKeys")).toBeVisible();
  await expect(page.locator("#panelOptionsDisplay")).toBeVisible();

  await page.click("label[for='tabOptionsVoicings']");
  await expect(page.locator("#panelOptionsVoicings")).toBeVisible();
  await expect(page.locator("#panelOptionsWorkouts")).toBeVisible();
  await expect(page.locator("#panelOptionsDisplay")).toBeVisible();

  await expect(page.locator("label[for='tabOptionsMidi']")).toHaveCount(0);
  await expect(page.locator("#panelOptionsMidi")).toBeHidden();
  await openKeyboard(page);
  await expect(page.locator("#panelOptionsMidi")).toBeHidden();
  await page.click("#panelKeyboardMidi > summary");
  await expect(page.locator("#panelOptionsMidi")).toBeVisible();
  await expect(page.locator("#panelOptionsVoicings")).toBeVisible();
  await expect(page.locator("#panelOptionsWorkouts")).toBeVisible();
});

test("Presets and workouts summary and arrows track current selections", async ({
  page,
}) => {
  const presetA = `Preset A ${Date.now()}`;
  const presetB = `Preset B ${Date.now()}`;
  const workoutA = `Workout A ${Date.now()}`;
  const workoutB = `Workout B ${Date.now()}`;
  const panel = page.locator("#panelTrainingSetup");
  const summary = page.locator("#txtTrainingSetupSummary");

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openTrainingSetup(page);

  await expect(summary).toHaveText("Preset: None · Workout: None");

  await page.fill("#inputSettingsPresetName", presetA);
  await page.click("#btnSettingsSave");
  await page.fill("#inputSettingsPresetName", presetB);
  await page.click("#btnSettingsSave");

  await expect(summary).toHaveText(`Preset: ${presetB} · Workout: None`);
  await page.click("#panelTrainingSetup > summary .collapsibleTitle");
  await expect(panel).not.toHaveAttribute("open", "");

  await page.click("#btnSettingsPresetPrev");
  await expect(page.locator("#selectSettingsPreset")).toHaveValue(presetA);
  await expect(summary).toHaveText(`Preset: ${presetA} · Workout: None`);
  await expect(panel).not.toHaveAttribute("open", "");
  await page.click("#btnSettingsPresetNext");
  await expect(page.locator("#selectSettingsPreset")).toHaveValue(presetB);
  await expect(panel).not.toHaveAttribute("open", "");

  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsWorkouts']");
  await page.fill("#inputWorkoutName", workoutA);
  await page.selectOption("#selectWorkoutPreset", presetA);
  await page.click("#btnWorkoutAddEntry");
  await page.click("#btnWorkoutSave");

  await page.click("#btnWorkoutNew");
  await page.fill("#inputWorkoutName", workoutB);
  await page.selectOption("#selectWorkoutPreset", presetB);
  await page.click("#btnWorkoutAddEntry");
  await page.click("#btnWorkoutSave");

  await expect(summary).toHaveText(`Preset: ${presetB} · Workout: ${workoutB}`);
  await page.click("#panelTrainingSetup > summary .collapsibleTitle");
  await expect(panel).not.toHaveAttribute("open", "");

  await page.click("#btnWorkoutPrev");
  await expect(page.locator("#selectWorkout")).toHaveValue(workoutA);
  await expect(summary).toHaveText(`Preset: ${presetB} · Workout: ${workoutA}`);
  await expect(panel).not.toHaveAttribute("open", "");
  await page.click("#btnWorkoutNext");
  await expect(page.locator("#selectWorkout")).toHaveValue(workoutB);
  await expect(summary).toHaveText(`Preset: ${presetB} · Workout: ${workoutB}`);
  await expect(panel).not.toHaveAttribute("open", "");
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

  await openTrainingSetup(page);
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

  await expect(page.locator("#panelKeyboard")).not.toHaveAttribute("open", "");
  await expect(page.locator("#panelDailyStats")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#panelTrainingSetup")).not.toHaveAttribute(
    "open",
    "",
  );

  await page.click("#panelMetronome > summary");
  await expect(page.locator("#panelMetronome")).toHaveAttribute("open", "");
  await page.click("#panelDailyStats > summary");
  await page.click("#panelTrainingSetup > summary");

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
  await expect(page.locator("#panelDailyStats")).toHaveAttribute("open", "");
  await expect(page.locator("#panelTrainingSetup")).toHaveAttribute("open", "");
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
  await expect(statsSummary).toBeVisible();
  await expect(statsSummary).toHaveText("Chords: 0 / 0");

  await page.click("#panelDailyStats > summary");
  await expect(statsSummary).toBeVisible();
  await expect(statsSummary).toHaveText("Chords: 0 / 0");

  await page.click("#panelMetronome > summary");
  await expect(metronomeSummary).toBeVisible();
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
  await expect(statsSummary).toBeVisible();
  await expect(statsSummary).toHaveText("Chords: 0 / 0");

  await openTrainingSetup(page);
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

  await openKeyboard(page);
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
