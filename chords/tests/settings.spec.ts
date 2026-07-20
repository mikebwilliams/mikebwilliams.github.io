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

test("key preset selections persist after reload", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsKeys']");

  await page.click("#btnKeysWhite");
  await expect(page.locator("#C")).toBeChecked();
  await expect(page.locator("#Db")).not.toBeChecked();
  const storedKeyToggles = await page.evaluate(() => {
    const stored = localStorage.getItem("chordChallenge.settings");
    return stored ? JSON.parse(stored).keyToggles : null;
  });
  expect(storedKeyToggles.C).toBe(true);
  expect(storedKeyToggles.Db).toBe(false);

  await page.reload();
  await expect(page.locator("#C")).toBeChecked();
  await expect(page.locator("#Db")).not.toBeChecked();
});

test("malformed radio and flow settings fall back consistently", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const settings = await page.evaluate(() => {
    const store = (window as any).appGlobals.settingsStore;
    store.applyPresetSettings(
      {
        mode: "not-a-mode",
        flow: { mode: "not-a-flow", startKey: "H" },
        voicing: { mode: "not-a-voicing" },
      },
      { preservePreferences: false },
    );
    return {
      current: store.getCurrentSnapshot(),
      persisted: JSON.parse(localStorage.getItem(store.storageKey)),
    };
  });

  await expect(page.locator("#tabModeChords")).toBeChecked();
  await expect(page.locator("#selectFlow")).toHaveValue("random");
  await expect(page.locator("#selectFlowStart")).toHaveValue("C");
  await expect(page.locator("#radVoicingDefault")).toBeChecked();
  expect(settings.current.mode).toBe("tabChords");
  expect(settings.current.flow).toEqual({ mode: "random", startKey: "C" });
  expect(settings.current.voicing.mode).toBe("default");
  expect(settings.persisted.mode).toBe("tabChords");
  expect(settings.persisted.flow).toEqual({ mode: "random", startKey: "C" });
  expect(settings.persisted.voicing.mode).toBe("default");
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

test("Collapsed presets and workouts summary elides long names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 900 });
  const longSummary =
    "Preset: Long Preset with a very long descriptive practice configuration name · Workout: Long Workout with multiple descriptive stages and targets";

  await page.goto(TEST_URL);
  await page.evaluate((summaryText) => {
    const panel = document.querySelector("#panelTrainingSetup");
    const summary = document.querySelector("#txtTrainingSetupSummary");
    if (panel instanceof HTMLDetailsElement) panel.open = false;
    if (summary) summary.textContent = summaryText;
  }, longSummary);
  await expect(page.locator("#panelTrainingSetup")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    longSummary,
  );

  const metrics = await page
    .locator("#txtTrainingSetupSummary")
    .evaluate((el) => {
      const style = window.getComputedStyle(el);
      const summary = el.closest("summary");
      const steppers = summary?.querySelector(".collapsibleSteppers");
      const statusRect = el.getBoundingClientRect();
      const summaryRect = summary?.getBoundingClientRect();
      const steppersRect = steppers?.getBoundingClientRect();
      return {
        clientWidth: el.clientWidth,
        overflowX: style.overflowX,
        scrollWidth: el.scrollWidth,
        statusRight: statusRect.right,
        steppersLeft: steppersRect?.left || 0,
        steppersRight: steppersRect?.right || 0,
        summaryRight: summaryRect?.right || 0,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });

  expect(metrics.textOverflow).toBe("ellipsis");
  expect(metrics.whiteSpace).toBe("nowrap");
  expect(metrics.overflowX).toBe("hidden");
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.statusRight).toBeLessThanOrEqual(metrics.steppersLeft + 1);
  expect(metrics.steppersRight).toBeLessThanOrEqual(metrics.summaryRight + 1);
  await expect(page.locator("#btnSettingsPresetPrev")).toBeVisible();
  await expect(page.locator("#btnSettingsPresetNext")).toBeVisible();
  await expect(page.locator("#btnWorkoutPrev")).toBeVisible();
  await expect(page.locator("#btnWorkoutNext")).toBeVisible();
});

test("training setup steppers stay accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const panel = page.locator("#panelTrainingSetup");
  const summary = panel.locator(":scope > summary");
  await expect(panel).not.toHaveAttribute("open", "");

  const bounds = await summary.evaluate((element) => {
    const summaryRect = element.getBoundingClientRect();
    const buttonIds = [
      "btnSettingsPresetPrev",
      "btnSettingsPresetNext",
      "btnWorkoutPrev",
      "btnWorkoutNext",
    ];
    return {
      summary: {
        left: summaryRect.left,
        right: summaryRect.right,
        top: summaryRect.top,
        bottom: summaryRect.bottom,
      },
      buttons: buttonIds.map((id) => {
        const rect = document.getElementById(id)!.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
        };
      }),
    };
  });

  bounds.buttons.forEach((button) => {
    expect(button.width).toBeGreaterThan(0);
    expect(button.left).toBeGreaterThanOrEqual(bounds.summary.left - 1);
    expect(button.right).toBeLessThanOrEqual(bounds.summary.right + 1);
    expect(button.top).toBeGreaterThanOrEqual(bounds.summary.top - 1);
    expect(button.bottom).toBeLessThanOrEqual(bounds.summary.bottom + 1);
  });

  const presetSelect = page.locator("#selectSettingsPreset");
  const initialPreset = await presetSelect.inputValue();
  await page.click("#btnSettingsPresetNext");
  await expect(presetSelect).not.toHaveValue(initialPreset);
  const nextPreset = await presetSelect.inputValue();
  await page.click("#btnSettingsPresetPrev");
  await expect(presetSelect).not.toHaveValue(nextPreset);

  const workoutSelect = page.locator("#selectWorkout");
  const initialWorkout = await workoutSelect.inputValue();
  await page.click("#btnWorkoutNext");
  await expect(workoutSelect).not.toHaveValue(initialWorkout);
  const nextWorkout = await workoutSelect.inputValue();
  await page.click("#btnWorkoutPrev");
  await expect(workoutSelect).not.toHaveValue(nextWorkout);
  await expect(panel).not.toHaveAttribute("open", "");
});

test("Save updates the selected preset and Apply loads it", async ({
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
  await page.click("#btnSettingsSave");

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "random");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("DarkBook", { exact: true }).check();
  await page.click("#panelKeyboard > summary");
  await page.click("#panelDailyStats > summary");

  await selectTab("tabOptionsPresets");
  await page.selectOption("#selectSettingsPreset", presetName);
  await page.click("#btnSettingsLoad");

  await selectTab("tabOptionsKeys");
  await expect(page.locator("#selectFlow")).toHaveValue(
    "descendingMinorThirds",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkBook");
  await expect(page.locator("#radThemeDarkBook")).toBeChecked();
  await expect(page.locator("#panelKeyboard")).toHaveAttribute("open", "");
  await expect(page.locator("#panelDailyStats")).toHaveAttribute("open", "");
  await expect(page.locator("#panelTrainingSetup")).toHaveAttribute("open", "");

  if (errors.length) {
    console.error("=== JavaScript Errors Detected ===");
    for (const e of errors) console.error(e);
    throw new Error(`${errors.length} console error(s) found`);
  }
});

test("Starter presets and workouts are available after first load", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await openTrainingSetup(page);
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    "Preset: None · Workout: None",
  );

  const presetOptionText =
    (await page.locator("#selectSettingsPreset").textContent()) || "";
  expect(presetOptionText).toContain("Major & Minor Chords");
  expect(presetOptionText).toContain("I-IV-V Progressions");
  expect(presetOptionText).toContain("Scale Degrees");
  expect(presetOptionText).toContain("Major & Minor Scales");
  expect(presetOptionText).toContain("Jazz ii-V-I");
  expect(presetOptionText).not.toContain("Beginner:");

  await page.click("label[for='tabOptionsWorkouts']");
  const workoutOptionText =
    (await page.locator("#selectWorkout").textContent()) || "";
  expect(workoutOptionText).toContain("Beginner Jazz Start");
  expect(workoutOptionText).toContain("Beginner Warmup");
});

test("Presets and workouts can import and export files", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openTrainingSetup(page);

  await expect(page.locator("#btnSettingsDownload")).toHaveText("Export");
  await expect(page.locator("#btnSettingsUpload")).toHaveText("Import");

  await page.setInputFiles("#inputSettingsUpload", {
    name: "test.presets",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        presets: {
          "Imported Test Preset": await page.evaluate(() =>
            (window as any).appGlobals.settingsStore.getCurrentSnapshot(),
          ),
        },
      }),
    ),
  });
  await expect(page.locator("#txtSettingsFileStatus")).toHaveText(
    "Imported 1 preset.",
  );
  await expect(page.locator("#selectSettingsPreset")).toContainText(
    "Imported Test Preset",
  );

  const presetDownload = page.waitForEvent("download");
  await page.click("#btnSettingsDownload");
  await expect(page.locator("#txtSettingsFileStatus")).toHaveText(
    "Exported presets.",
  );
  expect((await presetDownload).suggestedFilename()).toBe("chord.presets");

  await page.click("label[for='tabOptionsWorkouts']");
  await expect(page.locator("#btnWorkoutDownload")).toHaveText("Export");
  await expect(page.locator("#btnWorkoutUpload")).toHaveText("Import");

  await page.setInputFiles("#inputWorkoutUpload", {
    name: "test.workouts",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        workouts: {
          "Imported Test Workout": {
            entries: [
              {
                preset: "Imported Test Preset",
                goals: { correct: 2, total: 3 },
                category: "chords",
              },
            ],
          },
        },
      }),
    ),
  });
  await expect(page.locator("#txtWorkoutFileStatus")).toHaveText(
    "Imported 1 workout.",
  );
  await expect(page.locator("#selectWorkout")).toContainText(
    "Imported Test Workout",
  );

  const workoutDownload = page.waitForEvent("download");
  await page.click("#btnWorkoutDownload");
  await expect(page.locator("#txtWorkoutFileStatus")).toHaveText(
    "Exported workouts.",
  );
  expect((await workoutDownload).suggestedFilename()).toBe("chord.workouts");
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
    .getByRole("button", { name: "Apply" })
    .click();

  await expect(statsSummary).toHaveText(
    "Chords: 0 / 0, Goals: 3 correct / 5 total",
  );
});

test("Workout entries apply embedded settings after preset deletion", async ({
  page,
}) => {
  const presetName = `Embedded Preset ${Date.now()}`;
  const workoutName = `Embedded Workout ${Date.now()}`;

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsKeys']");
  await page.selectOption("#selectFlow", "descendingMinorThirds");

  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsSave");

  await page.click("label[for='tabOptionsWorkouts']");
  await page.fill("#inputWorkoutName", workoutName);
  await page.selectOption("#selectWorkoutPreset", presetName);
  await page.click("#btnWorkoutAddEntry");
  await page.click("#btnWorkoutSave");

  await page.click("label[for='tabOptionsPresets']");
  await page.selectOption("#selectSettingsPreset", presetName);
  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#btnSettingsDelete");
  await expect(page.locator("#selectSettingsPreset")).not.toContainText(
    presetName,
  );

  await page.reload();
  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsWorkouts']");
  await page.selectOption("#selectWorkout", workoutName);
  await expect(
    page.locator(".workoutEntry").filter({ hasText: presetName }),
  ).not.toContainText("missing preset");

  await page.click("label[for='tabOptionsKeys']");
  await page.selectOption("#selectFlow", "random");

  await page.click("label[for='tabOptionsWorkouts']");
  await page
    .locator(".workoutEntry")
    .filter({ hasText: presetName })
    .getByRole("button", { name: "Apply" })
    .click();

  await page.click("label[for='tabOptionsKeys']");
  await expect(page.locator("#selectFlow")).toHaveValue(
    "descendingMinorThirds",
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
