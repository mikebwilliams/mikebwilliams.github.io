import { test, expect, type Page } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

async function openTrainingSetup(page: Page) {
  const panel = page.locator("#panelTrainingSetup");
  if ((await panel.getAttribute("open")) === null) {
    await page.click("#panelTrainingSetup > summary");
  }
}

test("practice transport and utilities share a responsive header toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(TEST_URL);

  const shortcutButton = page.getByRole("button", {
    name: "Keyboard shortcuts",
  });
  const themeButton = page.locator("#panelThemePicker > summary");
  const previousButton = page.locator("#btnPracticePrevious");
  const playButton = page.locator("#btnMetronomeTransport");
  const nextButton = page.locator("#btnSkip");

  await expect(shortcutButton).toBeVisible();
  await expect(shortcutButton).toHaveText("?");
  await expect(previousButton).toBeVisible();
  await expect(playButton).toHaveText("Start");
  await expect(nextButton).toBeVisible();
  await expect(page.locator("#panelKeyboard > summary #btnSkip")).toHaveCount(
    0,
  );
  const previousBox = await previousButton.boundingBox();
  const playBox = await playButton.boundingBox();
  const nextBox = await nextButton.boundingBox();
  const shortcutBox = await shortcutButton.boundingBox();
  const themeBox = await themeButton.boundingBox();
  expect(previousBox).not.toBeNull();
  expect(playBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(shortcutBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  expect(previousBox!.x).toBeLessThan(playBox!.x);
  expect(playBox!.x).toBeLessThan(nextBox!.x);
  expect(nextBox!.x + nextBox!.width).toBeLessThan(shortcutBox!.x);
  expect(shortcutBox!.x + shortcutBox!.width).toBeLessThanOrEqual(themeBox!.x);

  const mobileToolbarBox = await page.locator(".heroToolbar").boundingBox();
  const mobileHeaderBox = await page.locator("#panelHeader").boundingBox();
  expect(mobileToolbarBox).not.toBeNull();
  expect(mobileHeaderBox).not.toBeNull();
  expect(mobileToolbarBox!.y + mobileToolbarBox!.height).toBeLessThanOrEqual(
    mobileHeaderBox!.y,
  );

  await shortcutButton.focus();
  await page.keyboard.press("Space");

  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog).toContainText("Start or stop the metronome.");
  await expect(dialog).toContainText("Apply the typed tempo.");
  await expect(dialog).toContainText(
    "Choose the previous or next saved song in Songs mode.",
  );

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(320);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(shortcutButton).toBeFocused();

  await page.keyboard.press("1");
  expect(await page.evaluate(() => metronomeState.tempoEntryBuffer)).toBe("1");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 900, height: 720 });
  const headerBox = await page.locator("#panelHeader").boundingBox();
  const toolbarBox = await page.locator(".heroToolbar").boundingBox();
  expect(headerBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(toolbarBox!.x);
});

test("Real Book theme uses paper colors and handwritten chart typography", async ({
  page,
}) => {
  const songUrl =
    "irealbook://Theme Check=Doe John=Medium Swing=Bb=n=[*AT44Bb^7 |E-7b5 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const theme = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      selected: document.documentElement.dataset.theme,
      bg: styles.getPropertyValue("--bg-900").trim(),
      ink: styles.getPropertyValue("--text-primary").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
      hand: styles.getPropertyValue("--font-hand").trim(),
    };
  });

  expect(theme.selected).toBe("lightBook");
  expect(theme.bg).toBe("#d7c8a7");
  expect(theme.ink).toBe("#211b12");
  expect(theme.accent).toBe("#2b6683");
  expect(theme.hand).toBe('"MuseJazz Text", cursive');
  await expect(page.locator("#radThemeLightBook")).toBeChecked();
  await expect(page.locator("#panelThemePicker summary")).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('24px "MuseJazz Text"');
      }),
    )
    .toBe(true);

  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(215, 200, 167)",
  );
  await expect(page.locator(".surfaceCard").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(page.locator("#btnSkip")).toHaveCSS(
    "background-color",
    "rgb(33, 27, 18)",
  );
  await expect(page.locator("label[for='tabOptionsKeys']")).toHaveCSS(
    "background-color",
    "rgb(21, 63, 85)",
  );

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  const currentChord = page.locator(".songMeasureChord--current").first();
  await expect(currentChord).toHaveCSS("color", "rgb(43, 102, 131)");
  await expect(currentChord).toHaveCSS("text-decoration-line", "underline");
  await expect(currentChord).toHaveCSS("font-family", /MuseJazz Text/);
  await expect(page.locator(".songMeasure").first()).toHaveCSS(
    "border-radius",
    "2px",
  );
});

test("MuseJazz Text gives lowercase roman numerals a separate dotted i", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  const inkBands = await page.evaluate(async () => {
    const family = "MuseJazz Text";
    await document.fonts.load(`120px "${family}"`);

    const countHorizontalInkBands = (character: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const context = canvas.getContext("2d");
      if (!context) return 0;

      context.font = `120px "${family}"`;
      context.fillText(character, 20, 130);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let bands = 0;
      let previousRowHasInk = false;

      for (let y = 0; y < canvas.height; y += 1) {
        let rowHasInk = false;
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
            rowHasInk = true;
            break;
          }
        }
        if (rowHasInk && !previousRowHasInk) bands += 1;
        previousRowHasInk = rowHasInk;
      }

      return bands;
    };

    return {
      uppercase: countHorizontalInkBands("I"),
      lowercase: countHorizontalInkBands("i"),
    };
  });

  expect(inkBands.uppercase).toBe(1);
  expect(inkBands.lowercase).toBe(2);
});

test("theme picker switches and persists alternate book themes", async ({
  page,
}) => {
  const themes = [
    {
      label: "DarkBook",
      value: "darkBook",
      bg: "#17120c",
      ink: "#f7edcf",
      accent: "#82b7cf",
      font: "MuseJazz Text",
      weight: "400",
      smooth: false,
    },
    {
      label: "Classical",
      value: "classical",
      bg: "#050505",
      ink: "#080808",
      accent: "#b78c35",
      font: "Henle",
      weight: "700",
      smooth: true,
    },
    {
      label: "Dark Classical",
      value: "darkClassical",
      bg: "#030303",
      ink: "#fffaf0",
      accent: "#d1ab5c",
      font: "Henle",
      weight: "700",
      smooth: true,
    },
  ];

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  for (const expected of themes) {
    await page.locator("#panelThemePicker summary").click();
    await page.getByLabel(expected.label, { exact: true }).check();

    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      expected.value,
    );
    await expect(page.locator("#panelThemePicker")).not.toHaveAttribute(
      "open",
      "",
    );

    const applied = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const headerStyles = getComputedStyle(
        document.querySelector("#panelHeader")!,
      );
      const bodyStyles = getComputedStyle(document.body);
      const bodyOverlayStyles = getComputedStyle(document.body, "::before");
      const surfaceStyles = getComputedStyle(
        document.querySelector(".surfaceCard")!,
      );
      return {
        bg: rootStyles.getPropertyValue("--bg-900").trim(),
        ink: rootStyles.getPropertyValue("--text-primary").trim(),
        accent: rootStyles.getPropertyValue("--accent").trim(),
        headerFont: headerStyles.fontFamily,
        headerWeight: headerStyles.fontWeight,
        bodyBackgroundImage: bodyStyles.backgroundImage,
        bodyOverlayOpacity: bodyOverlayStyles.opacity,
        surfaceBackgroundImage: surfaceStyles.backgroundImage,
      };
    });

    expect(applied.bg).toBe(expected.bg);
    expect(applied.ink).toBe(expected.ink);
    expect(applied.accent).toBe(expected.accent);
    expect(applied.headerFont).toContain(expected.font);
    expect(applied.headerWeight).toBe(expected.weight);
    if (expected.smooth) {
      expect(applied.bodyOverlayOpacity).toBe("0");
      expect(applied.bodyBackgroundImage).not.toContain("repeating");
      expect(applied.surfaceBackgroundImage).not.toContain("repeating");
    }

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      expected.value,
    );
    await expect(
      page.locator(`input[name='theme'][value='${expected.value}']`),
    ).toBeChecked();
  }
});

test("theme picker re-renders visible chord symbols for the selected font", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.evaluate(() => {
    currentChordName = "Bbm7b5";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("B♭ø");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("Classical", { exact: true }).check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "classical");
  await expect(page.locator("#txtChord")).toHaveText("B♭m7♭5");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("DarkBook", { exact: true }).check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkBook");
  await expect(page.locator("#txtChord")).toHaveText("B♭ø");
});

test("loading a workout entry preserves the current theme", async ({
  page,
}) => {
  const presetName = `Light Preset ${Date.now()}`;

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await openTrainingSetup(page);
  await page.click("label[for='tabOptionsPresets']");
  await page.fill("#inputSettingsPresetName", presetName);
  await page.click("#btnSettingsCreate");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("DarkBook", { exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkBook");

  await page.click("label[for='tabOptionsWorkouts']");
  await page.fill("#inputWorkoutName", "Theme Safe Workout");
  await page.selectOption("#selectWorkoutPreset", presetName);
  await page.click("#btnWorkoutAddEntry");
  await page
    .locator(".workoutEntry")
    .filter({ hasText: presetName })
    .getByRole("button", { name: "Apply" })
    .click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkBook");
  await expect(page.locator("#radThemeDarkBook")).toBeChecked();
});
