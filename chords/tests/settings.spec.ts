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

async function openDataPreferences(page: Page) {
  await page.click("label[for='tabOptionsData']");
  await expect(page.locator("#panelOptionsData")).toBeVisible();
}

async function seedResettableData(page: Page) {
  return page.evaluate(() => {
    const globals = (window as any).appGlobals;
    const settingsStore = globals.settingsStore;
    const workoutStore = globals.workoutStore;
    const songsStore = globals.songsStore;
    const presetName = "Data Reset Test Preset";
    const workoutName = "Data Reset Test Workout";
    const current = settingsStore.getCurrentSnapshot();

    settingsStore.applyPresetSettings(
      {
        ...current,
        flow: { mode: "descendingMinorThirds", startKey: "F" },
      },
      { preservePreferences: false },
    );
    settingsStore.savePreset(presetName);
    settingsStore.loadPreset(presetName, { preservePreferences: false });

    workoutStore.saveWorkout(workoutName, [
      {
        preset: presetName,
        goals: { correct: 3, total: 5 },
        category: "chords",
      },
    ]);
    workoutStore.setLastSelection(workoutName, 0);

    songsStore.importSource(
      "irealbook://Data Reset Song=Doe Jane=Medium Swing=C=n=[*AT44C7 |F7 Z",
    );

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem(
      "chordChallenge.dailyStats",
      JSON.stringify({
        date,
        counts: {
          chords: { correct: 4, incorrect: 2 },
        },
      }),
    );
    localStorage.setItem("unrelated.dataResetSentinel", "keep me");

    return { presetName, workoutName };
  });
}

async function readResetStorage(page: Page) {
  return page.evaluate(() => {
    const keys = [
      "chordChallenge.settings",
      "chordChallenge.settings.presets",
      "chordChallenge.settings.activePreset",
      "chordChallenge.settings.presets.seedVersion",
      "chordChallenge.workouts",
      "chordChallenge.workouts.selected",
      "chordChallenge.workouts.seedVersion",
      "chordChallenge.songs",
      "chordChallenge.songs.selected",
      "chordChallenge.dailyStats",
      "unrelated.dataResetSentinel",
    ];
    return Object.fromEntries(
      keys.map((key) => [key, localStorage.getItem(key)]),
    );
  });
}

async function openDataResetDialog(page: Page, trigger: string) {
  await page.click(trigger);
  const dialog = page.locator("#dialogDataReset");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#btnDataResetCancel")).toBeFocused();
  return dialog;
}

async function confirmDataReset(page: Page, trigger: string) {
  const dialog = await openDataResetDialog(page, trigger);
  await page.click("#btnDataResetConfirm");
  await expect(dialog).not.toBeVisible();
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
  await expect(
    page.locator("#panelOptionsPresets .presetUtilityDivider"),
  ).toBeVisible();
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

test("Data preference actions use aligned columns and clear hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(TEST_URL);
  await openDataPreferences(page);

  const layout = await page.evaluate(() => {
    const bounds = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).map((element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, left: rect.left, width: rect.width };
      });
    const groupTitle = document.querySelector(".dataResetGroupTitle");
    const rowTitle = document.querySelector(".dataResetCopy h5");
    const allDataGroup = document
      .querySelector("#dataResetAllTitle")
      ?.closest(".dataResetGroup");
    const allDataStyle = allDataGroup ? getComputedStyle(allDataGroup) : null;
    const statusStyle = getComputedStyle(
      document.querySelector("#txtDataResetStatus")!,
    );

    return {
      buttons: bounds(".dataResetRow > button"),
      copies: bounds(".dataResetCopy"),
      groupTitles: bounds(".dataResetGroupTitle"),
      groupTitleSize: groupTitle
        ? Number.parseFloat(getComputedStyle(groupTitle).fontSize)
        : 0,
      rowTitleSize: rowTitle
        ? Number.parseFloat(getComputedStyle(rowTitle).fontSize)
        : 0,
      allDataBorders: allDataStyle
        ? {
            bottom: allDataStyle.borderBottomWidth,
            left: allDataStyle.borderLeftWidth,
            right: allDataStyle.borderRightWidth,
          }
        : null,
      resetAllIsDanger:
        document
          .querySelector("#btnDataResetAll")
          ?.classList.contains("dataResetDangerButton") || false,
      statusBackground: statusStyle.backgroundColor,
      statusPosition: statusStyle.position,
    };
  });

  const expectAligned = (values: number[]) => {
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  };
  expectAligned(layout.buttons.map(({ left }) => left));
  expectAligned(layout.buttons.map(({ width }) => width));
  expectAligned(layout.buttons.map(({ height }) => height));
  expectAligned(layout.copies.map(({ left }) => left));
  expectAligned(layout.copies.map(({ width }) => width));
  expectAligned(layout.groupTitles.map(({ left }) => left));
  expect(layout.groupTitleSize - layout.rowTitleSize).toBeGreaterThanOrEqual(2);
  expect(layout.allDataBorders).toEqual({
    bottom: "0px",
    left: "0px",
    right: "0px",
  });
  expect(layout.resetAllIsDanger).toBe(true);
  expect(layout.statusPosition).toBe("static");
  expect(layout.statusBackground).toBe("rgba(0, 0, 0, 0)");

  const dialog = await openDataResetDialog(page, "#btnDataResetStats");
  await page.click("#btnDataResetCancel");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#txtDataResetStatus")).toContainText(/canceled/i);
  expect(
    await page
      .locator("#txtDataResetStatus")
      .evaluate((status) =>
        status
          .closest(".dataResetRow")
          ?.querySelector(":scope > button")
          ?.getAttribute("id"),
      ),
  ).toBe("btnDataResetStats");
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

test("Presets and workouts summary and arrows track active selections", async ({
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
  await page.click("#btnSettingsCreate");
  await page.fill("#inputSettingsPresetName", presetB);
  await page.click("#btnSettingsCreate");

  await expect(summary).toHaveText("Preset: None · Workout: None");
  await page.click("#btnSettingsActivate");
  await expect(summary).toHaveText(`Preset: ${presetB} · Workout: None`);
  await page.selectOption("#selectSettingsPreset", "Major & Minor Chords");
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

test("Preset management preserves drafts and requires explicit actions", async ({
  page,
}) => {
  const presetName = `Managed Preset ${Date.now()}`;
  const draftName = "Draft still in progress";
  const summary = page.locator("#txtTrainingSetupSummary");

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsPresets']");

  await expect(page.locator("#btnSettingsActivate")).toBeDisabled();
  await expect(page.locator("#btnSettingsUpdate")).toBeDisabled();
  await expect(page.locator("#btnSettingsDelete")).toBeDisabled();
  await expect(page.locator("#btnSettingsCreate")).toBeDisabled();
  await page.fill("#inputSettingsPresetName", "   ");
  await expect(page.locator("#btnSettingsCreate")).toBeDisabled();

  await page.click("label[for='tabOptionsKeys']");
  await page.selectOption("#selectFlow", "ascendingWholeSteps");
  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsCreate");

  await expect(page.locator("#inputSettingsPresetName")).toHaveValue("");
  await expect(page.locator("#selectSettingsPreset")).toHaveValue(presetName);
  await expect(page.locator("#btnSettingsActivate")).toBeEnabled();
  await expect(summary).toHaveText("Preset: Custom · Workout: None");

  await page.click("label[for='tabOptionsKeys']");
  await page.selectOption("#selectFlow", "descendingMinorThirds");
  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", draftName);
  await page.selectOption("#selectSettingsPreset", "Major & Minor Chords");
  await page.selectOption("#selectSettingsPreset", presetName);
  await expect(page.locator("#inputSettingsPresetName")).toHaveValue(draftName);

  await page.click("label[for='tabOptionsKeys']");
  await expect(page.locator("#selectFlow")).toHaveValue(
    "descendingMinorThirds",
  );
  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsCreate");
  await expect(page.locator("#inputSettingsPresetName")).toHaveValue(
    presetName,
  );
  await expect(page.locator("#txtSettingsFileStatus")).toContainText(
    "already exists",
  );

  await page.click("#btnSettingsActivate");
  await page.click("label[for='tabModeProgressions']");
  await expect(summary).toHaveText(
    `Preset: ${presetName} (modified) · Workout: None`,
  );
  await page.click("label[for='tabModeChords']");
  await expect(summary).toHaveText(`Preset: ${presetName} · Workout: None`);
  await page.click("label[for='tabOptionsKeys']");
  await expect(page.locator("#selectFlow")).toHaveValue("ascendingWholeSteps");
  await page.selectOption("#selectFlow", "random");
  await expect(summary).toHaveText(
    `Preset: ${presetName} (modified) · Workout: None`,
  );
  await page.selectOption("#selectFlow", "ascendingWholeSteps");
  await expect(summary).toHaveText(`Preset: ${presetName} · Workout: None`);
  await page.selectOption("#selectFlow", "random");
  await expect(summary).toHaveText(
    `Preset: ${presetName} (modified) · Workout: None`,
  );

  await page.reload();
  await expect(summary).toHaveText(
    `Preset: ${presetName} (modified) · Workout: None`,
  );
  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsPresets']");
  await page.selectOption("#selectSettingsPreset", presetName);
  await page.click("#btnSettingsActivate");
  await expect(summary).toHaveText(`Preset: ${presetName} · Workout: None`);

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.click("#btnSettingsDelete");
  await expect(page.locator("#selectSettingsPreset")).toContainText(presetName);

  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#btnSettingsDelete");
  await expect(page.locator("#selectSettingsPreset")).not.toContainText(
    presetName,
  );
  await expect(page.locator("#btnSettingsActivate")).toBeDisabled();
  await expect(summary).toHaveText("Preset: Custom · Workout: None");
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

test("Create, Update, and Activate have distinct preset behavior", async ({
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
  await page.click("#btnSettingsCreate");
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    "Preset: Custom · Workout: None",
  );
  await page.click("#btnSettingsActivate");
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    `Preset: ${presetName} · Workout: None`,
  );

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "descendingMinorThirds");
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    `Preset: ${presetName} (modified) · Workout: None`,
  );

  await selectTab("tabOptionsPresets");
  await page.selectOption("#selectSettingsPreset", presetName);
  page.once("dialog", (dialog) => dialog.accept());
  await page.click("#btnSettingsUpdate");
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    `Preset: ${presetName} · Workout: None`,
  );

  await selectTab("tabOptionsKeys");
  await page.selectOption("#selectFlow", "random");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("DarkBook", { exact: true }).check();
  await page.click("#panelKeyboard > summary");
  await page.click("#panelDailyStats > summary");

  await selectTab("tabOptionsPresets");
  await page.selectOption("#selectSettingsPreset", presetName);
  await page.click("#btnSettingsActivate");
  await expect(page.locator("#txtTrainingSetupSummary")).toHaveText(
    `Preset: ${presetName} · Workout: None`,
  );

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

test("Restoring app defaults preserves saved data and practice progress", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const { presetName, workoutName } = await seedResettableData(page);
  await page.reload();
  const before = await readResetStorage(page);

  await expect(page.locator("#selectFlow")).toHaveValue(
    "descendingMinorThirds",
  );
  await expect(page.locator("#txtTrainingSetupSummary")).toContainText(
    presetName,
  );
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");

  await openDataPreferences(page);
  await confirmDataReset(page, "#btnDataResetSettings");
  await expect(page.locator("#txtDataResetStatus")).toContainText(/default/i);

  const result = await page.evaluate(
    ({ presetName, workoutName }) => {
      const globals = (window as any).appGlobals;
      const settingsStore = globals.settingsStore;
      return {
        current: settingsStore.getCurrentSnapshot(),
        defaults: settingsStore.defaults,
        activePreset: settingsStore.getActivePresetState().name,
        hasPreset: settingsStore.listPresets().includes(presetName),
        hasWorkout: globals.workoutStore.listWorkouts().includes(workoutName),
        songTitles: globals.songsStore
          .listSongs()
          .map((song: any) => song.title),
      };
    },
    { presetName, workoutName },
  );

  expect(result.current).toEqual(result.defaults);
  expect(result.activePreset).toBe("");
  expect(result.hasPreset).toBe(true);
  expect(result.hasWorkout).toBe(true);
  expect(result.songTitles).toContain("Data Reset Song");
  await expect(page.locator("#selectFlow")).toHaveValue("random");
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");

  const after = await readResetStorage(page);
  expect(after["chordChallenge.settings"]).not.toBe(
    before["chordChallenge.settings"],
  );
  expect(after["chordChallenge.settings.activePreset"]).toBeNull();
  [
    "chordChallenge.settings.presets",
    "chordChallenge.settings.presets.seedVersion",
    "chordChallenge.workouts",
    "chordChallenge.workouts.selected",
    "chordChallenge.workouts.seedVersion",
    "chordChallenge.songs",
    "chordChallenge.songs.selected",
    "chordChallenge.dailyStats",
    "unrelated.dataResetSentinel",
  ].forEach((key) => expect(after[key]).toBe(before[key]));

  await page.reload();
  const persisted = await page.evaluate(
    ({ presetName, workoutName }) => {
      const globals = (window as any).appGlobals;
      const settingsStore = globals.settingsStore;
      return {
        current: settingsStore.getCurrentSnapshot(),
        defaults: settingsStore.defaults,
        activePreset: settingsStore.getActivePresetState().name,
        hasPreset: settingsStore.listPresets().includes(presetName),
        hasWorkout: globals.workoutStore.listWorkouts().includes(workoutName),
        hasSong: globals.songsStore
          .listSongs()
          .some((song: any) => song.title === "Data Reset Song"),
      };
    },
    { presetName, workoutName },
  );
  expect(persisted.current).toEqual(persisted.defaults);
  expect(persisted.activePreset).toBe("");
  expect(persisted.hasPreset).toBe(true);
  expect(persisted.hasWorkout).toBe(true);
  expect(persisted.hasSong).toBe(true);
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");
});

test("Failed daily-stat persistence leaves the visible and saved counts intact", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => {
    localStorage.clear();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem(
      "chordChallenge.dailyStats",
      JSON.stringify({
        date,
        counts: { chords: { correct: 4, incorrect: 2 } },
      }),
    );
  });
  await page.reload();
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");
  const storedBefore = await page.evaluate(() =>
    localStorage.getItem("chordChallenge.dailyStats"),
  );

  await openDataPreferences(page);
  await page.evaluate(() => {
    const storagePrototype = Storage.prototype as any;
    const originalSetItem = storagePrototype.setItem;
    storagePrototype.setItem = function (key: string, value: string) {
      if (key === "chordChallenge.dailyStats") {
        throw new Error("daily stats storage unavailable");
      }
      return originalSetItem.call(this, key, value);
    };
    (window as any).__restoreDataResetSetItem = () => {
      storagePrototype.setItem = originalSetItem;
      delete (window as any).__restoreDataResetSetItem;
    };
  });

  await confirmDataReset(page, "#btnDataResetStats");
  await expect(page.locator("#txtDataResetStatus")).toContainText(
    /could not be reset/i,
  );
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("chordChallenge.dailyStats"),
    ),
  ).toBe(storedBefore);
  await page.evaluate(() => (window as any).__restoreDataResetSetItem());
});

test("Partial data resets are confirmed and isolated by category", async ({
  page,
}) => {
  test.slow();
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const { presetName, workoutName } = await seedResettableData(page);
  await page.reload();
  await page.evaluate(() => {
    (window as any).spacedRepHandleResult(
      "chord",
      "Data Reset Failed Chord",
      true,
    );
  });
  await expect(page.locator("#panelSpacedRepList")).toContainText(
    "Data Reset Failed Chord",
  );

  await openDataPreferences(page);
  for (const selector of [
    "#btnDataResetSettings",
    "#btnDataResetStats",
    "#btnDataClearFailedItems",
    "#btnDataDeletePresets",
    "#btnDataDeleteWorkouts",
    "#btnDataDeleteSongs",
    "#btnDataResetAll",
  ]) {
    await expect(page.locator(selector)).toBeVisible();
  }

  const before = await readResetStorage(page);
  const dialog = await openDataResetDialog(page, "#btnDataDeletePresets");
  await expect(page.locator("#btnDataResetConfirm")).toContainText(
    /delete all presets/i,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#btnDataDeletePresets")).toBeFocused();
  expect(await readResetStorage(page)).toEqual(before);
  expect(
    await page.evaluate(
      (name) =>
        (window as any).appGlobals.settingsStore.listPresets().includes(name),
      presetName,
    ),
  ).toBe(true);

  await confirmDataReset(page, "#btnDataDeletePresets");
  await expect(page.locator("#txtDataResetStatus")).toContainText(/preset/i);
  let state = await page.evaluate(() => {
    const globals = (window as any).appGlobals;
    return {
      presets: globals.settingsStore.listPresets(),
      activePreset: globals.settingsStore.getActivePresetState().name,
      workouts: globals.workoutStore.listWorkouts(),
      songs: globals.songsStore.listSongs().length,
    };
  });
  expect(state.presets).toEqual([]);
  expect(state.activePreset).toBe("");
  expect(state.workouts).toContain(workoutName);
  expect(state.songs).toBeGreaterThan(0);
  let storage = await readResetStorage(page);
  for (const key of [
    "chordChallenge.settings",
    "chordChallenge.settings.presets.seedVersion",
    "chordChallenge.workouts",
    "chordChallenge.workouts.selected",
    "chordChallenge.workouts.seedVersion",
    "chordChallenge.songs",
    "chordChallenge.songs.selected",
    "chordChallenge.dailyStats",
    "unrelated.dataResetSentinel",
  ]) {
    expect(storage[key]).toBe(before[key]);
  }

  await confirmDataReset(page, "#btnDataDeleteWorkouts");
  await expect(page.locator("#txtDataResetStatus")).toContainText(/workout/i);
  state = await page.evaluate(() => {
    const globals = (window as any).appGlobals;
    return {
      presets: globals.settingsStore.listPresets(),
      workouts: globals.workoutStore.listWorkouts(),
      selection: globals.workoutStore.getLastSelection(),
      songs: globals.songsStore.listSongs().length,
    };
  });
  expect(state.presets).toEqual([]);
  expect(state.workouts).toEqual([]);
  expect(state.selection).toBeNull();
  expect(state.songs).toBeGreaterThan(0);

  await confirmDataReset(page, "#btnDataDeleteSongs");
  await expect(page.locator("#txtDataResetStatus")).toContainText(/song/i);
  expect(
    await page.evaluate(() =>
      (window as any).appGlobals.songsStore.listSongs(),
    ),
  ).toEqual([]);
  await expect(page.locator("#txtChordsCorrect")).toHaveText("4");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("2");

  await confirmDataReset(page, "#btnDataResetStats");
  await expect(page.locator("#txtDataResetStatus")).toContainText(/stat/i);
  await expect(page.locator("#txtChordsCorrect")).toHaveText("0");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("0");

  await confirmDataReset(page, "#btnDataClearFailedItems");
  await expect(page.locator("#txtDataResetStatus")).toContainText(
    /failed item/i,
  );
  await expect(page.locator("#panelSpacedRepList")).toContainText(
    "No failed items scheduled.",
  );

  storage = await readResetStorage(page);
  expect(storage["chordChallenge.settings"]).toBe(
    before["chordChallenge.settings"],
  );
  expect(storage["chordChallenge.settings.presets.seedVersion"]).toBe(
    before["chordChallenge.settings.presets.seedVersion"],
  );
  expect(storage["chordChallenge.workouts.seedVersion"]).toBe(
    before["chordChallenge.workouts.seedVersion"],
  );
  expect(storage["unrelated.dataResetSentinel"]).toBe("keep me");

  await page.reload();
  const afterReload = await page.evaluate(() => {
    const globals = (window as any).appGlobals;
    return {
      presets: globals.settingsStore.listPresets(),
      workouts: globals.workoutStore.listWorkouts(),
      songs: globals.songsStore.listSongs(),
      activePreset: globals.settingsStore.getActivePresetState().name,
      sentinel: localStorage.getItem("unrelated.dataResetSentinel"),
    };
  });
  expect(afterReload.presets).toEqual([]);
  expect(afterReload.workouts).toEqual([]);
  expect(afterReload.songs).toEqual([]);
  expect(afterReload.activePreset).toBe("");
  expect(afterReload.sentinel).toBe("keep me");
  await expect(page.locator("#txtChordsCorrect")).toHaveText("0");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("0");
});

test("Reset all data preserves unrelated storage and returns to starter content", async ({
  page,
}) => {
  test.slow();
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const { presetName, workoutName } = await seedResettableData(page);
  await page.reload();
  await page.evaluate(() => {
    (window as any).spacedRepHandleResult(
      "chord",
      "Full Reset Failed Chord",
      true,
    );
    (window as any).__dataResetReloadMarker = true;
  });
  const before = await readResetStorage(page);

  await openDataPreferences(page);
  const dialog = await openDataResetDialog(page, "#btnDataResetAll");
  await expect(page.locator("#btnDataResetConfirm")).toContainText(
    /reset all/i,
  );
  await page.click("#btnDataResetCancel");
  await expect(dialog).not.toBeVisible();
  expect(await readResetStorage(page)).toEqual(before);
  expect(
    await page.evaluate(
      ({ presetName, workoutName }) => {
        const globals = (window as any).appGlobals;
        return (
          globals.settingsStore.listPresets().includes(presetName) &&
          globals.workoutStore.listWorkouts().includes(workoutName) &&
          globals.songsStore.listSongs().length > 0 &&
          Boolean((window as any).__dataResetReloadMarker)
        );
      },
      { presetName, workoutName },
    ),
  ).toBe(true);

  await openDataResetDialog(page, "#btnDataResetAll");
  await page.click("#btnDataResetConfirm");
  await expect
    .poll(async () =>
      page.evaluate(() => Boolean((window as any).__dataResetReloadMarker)),
    )
    .toBe(false);

  const result = await page.evaluate(
    ({ presetName, workoutName }) => {
      const globals = (window as any).appGlobals;
      const settingsStore = globals.settingsStore;
      const presets = settingsStore.listPresets();
      const workouts = globals.workoutStore.listWorkouts();
      return {
        current: settingsStore.getCurrentSnapshot(),
        defaults: settingsStore.defaults,
        activePreset: settingsStore.getActivePresetState().name,
        presets,
        workouts,
        hasOldPreset: presets.includes(presetName),
        hasOldWorkout: workouts.includes(workoutName),
        workoutSelection: globals.workoutStore.getLastSelection(),
        songs: globals.songsStore.listSongs(),
        songSelection: globals.songsStore.getLastSelection(),
        sentinel: localStorage.getItem("unrelated.dataResetSentinel"),
      };
    },
    { presetName, workoutName },
  );

  expect(result.current).toEqual(result.defaults);
  expect(result.activePreset).toBe("");
  expect(result.hasOldPreset).toBe(false);
  expect(result.hasOldWorkout).toBe(false);
  expect(result.presets).toEqual(
    expect.arrayContaining([
      "Major & Minor Chords",
      "I-IV-V Progressions",
      "Scale Degrees",
      "Major & Minor Scales",
      "Jazz ii-V-I",
    ]),
  );
  expect(result.workouts).toEqual(
    expect.arrayContaining(["Beginner Jazz Start", "Beginner Warmup"]),
  );
  expect(result.workoutSelection).toBeNull();
  expect(result.songs).toEqual([]);
  expect(result.songSelection).toBe("");
  expect(result.sentinel).toBe("keep me");
  await expect(page.locator("#selectFlow")).toHaveValue("random");
  await expect(page.locator("#txtChordsCorrect")).toHaveText("0");
  await expect(page.locator("#txtChordsIncorrect")).toHaveText("0");
  await expect(page.locator("#panelSpacedRepList")).toContainText(
    "No failed items scheduled.",
  );
});

test("Presets and workouts can import and export files", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openTrainingSetup(page);

  await expect(page.locator("#btnSettingsDownload")).toHaveText("Export");
  await expect(page.locator("#btnSettingsUpload")).toHaveText("Import");
  await expect(
    page.locator("#dialogSettingsPresetImportConflict"),
  ).not.toBeVisible();

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
  await expect(
    page.locator("#dialogSettingsPresetImportConflict"),
  ).not.toBeVisible();

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

test("Preset import can overwrite and skip same-name presets", async ({
  page,
}) => {
  test.slow();
  const overwriteName = "Import Overwrite Conflict";
  const skipName = "Import Skip Conflict";
  const newName = "Import Fresh Preset";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const payload = await page.evaluate(
    ({ overwriteName, skipName, newName }) => {
      const store = (window as any).appGlobals.settingsStore;
      const snapshot = store.getCurrentSnapshot();
      store.importPresets({
        presets: {
          [overwriteName]: {
            ...snapshot,
            flow: { mode: "ascendingWholeSteps", startKey: "C" },
          },
          [skipName]: {
            ...snapshot,
            flow: { mode: "circleOfFourths", startKey: "D" },
          },
        },
      });
      return {
        presets: {
          [`  ${overwriteName}  `]: {
            ...snapshot,
            flow: { mode: "descendingWholeSteps", startKey: "F" },
          },
          [skipName]: {
            ...snapshot,
            flow: { mode: "ascendingHalfSteps", startKey: "E" },
          },
          [newName]: {
            ...snapshot,
            flow: { mode: "descendingMinorThirds", startKey: "A" },
          },
        },
      };
    },
    { overwriteName, skipName, newName },
  );

  await page.reload();
  await openTrainingSetup(page);
  await page.setInputFiles("#inputSettingsUpload", {
    name: "conflicts.presets",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });

  const dialog = page.locator("#dialogSettingsPresetImportConflict");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(overwriteName);
  await expect(page.locator("#btnSettingsPresetImportOverwrite")).toHaveText(
    "OK",
  );
  await expect(page.locator("#btnSettingsPresetImportSkip")).toBeFocused();
  await page.click("#btnSettingsPresetImportOverwrite");

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(skipName);
  await page.click("#btnSettingsPresetImportSkip");

  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#txtSettingsFileStatus")).toHaveText(
    "Imported 2 presets (1 overwritten, 1 skipped).",
  );
  await expect(page.locator("#inputSettingsUpload")).toHaveValue("");
  const result = await page.evaluate(
    ({ overwriteName, skipName, newName }) => {
      const store = (window as any).appGlobals.settingsStore;
      const presets = store.loadPresets();
      return {
        overwrite: presets[overwriteName].flow.mode,
        skipped: presets[skipName].flow.mode,
        fresh: presets[newName].flow.mode,
        current: store.getCurrentSnapshot().flow.mode,
      };
    },
    { overwriteName, skipName, newName },
  );
  expect(result).toEqual({
    overwrite: "descendingWholeSteps",
    skipped: "circleOfFourths",
    fresh: "descendingMinorThirds",
    current: "random",
  });
});

test("Canceling a preset conflict leaves the entire import unchanged", async ({
  page,
}) => {
  test.slow();
  const firstName = "Import Cancel First";
  const secondName = "Import Cancel Second";
  const newName = "Import Cancel Fresh";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const payload = await page.evaluate(
    ({ firstName, secondName, newName }) => {
      const store = (window as any).appGlobals.settingsStore;
      const snapshot = store.getCurrentSnapshot();
      store.importPresets({
        presets: {
          [firstName]: {
            ...snapshot,
            flow: { mode: "ascendingWholeSteps", startKey: "C" },
          },
          [secondName]: {
            ...snapshot,
            flow: { mode: "circleOfFifths", startKey: "D" },
          },
        },
      });
      return {
        presets: {
          [firstName]: {
            ...snapshot,
            flow: { mode: "descendingWholeSteps", startKey: "F" },
          },
          [secondName]: {
            ...snapshot,
            flow: { mode: "ascendingHalfSteps", startKey: "E" },
          },
          [newName]: {
            ...snapshot,
            flow: { mode: "descendingMinorThirds", startKey: "A" },
          },
        },
      };
    },
    { firstName, secondName, newName },
  );

  await page.reload();
  await openTrainingSetup(page);
  await page.setInputFiles("#inputSettingsUpload", {
    name: "cancel-conflicts.presets",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });

  const dialog = page.locator("#dialogSettingsPresetImportConflict");
  await expect(dialog).toContainText(firstName);
  await page.click("#btnSettingsPresetImportOverwrite");
  await expect(dialog).toContainText(secondName);
  await page.click("#btnSettingsPresetImportCancel");

  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#txtSettingsFileStatus")).toHaveText(
    "Import canceled. No presets were changed.",
  );
  await expect(page.locator("#inputSettingsUpload")).toHaveValue("");
  const result = await page.evaluate(
    ({ firstName, secondName, newName }) => {
      const presets = (window as any).appGlobals.settingsStore.loadPresets();
      return {
        first: presets[firstName].flow.mode,
        second: presets[secondName].flow.mode,
        hasFresh: Object.prototype.hasOwnProperty.call(presets, newName),
      };
    },
    { firstName, secondName, newName },
  );
  expect(result).toEqual({
    first: "ascendingWholeSteps",
    second: "circleOfFifths",
    hasFresh: false,
  });
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
  await page.click("#btnSettingsCreate");
  await page.selectOption("#selectSettingsPreset", "");
  await expect(page.locator("#btnSettingsActivate")).toBeDisabled();

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

  await page.click("label[for='tabOptionsPresets']");
  await expect(page.locator("#selectSettingsPreset")).toHaveValue(presetName);
  await expect(page.locator("#btnSettingsActivate")).toBeEnabled();
  await expect(page.locator("#btnSettingsUpdate")).toBeEnabled();
  await expect(page.locator("#btnSettingsDelete")).toBeEnabled();

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
  await page.click("#btnSettingsCreate");

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
