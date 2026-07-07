import { test, expect, type Page } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

async function openTrainingSetup(page: Page) {
  const panel = page.locator("#panelTrainingSetup");
  if ((await panel.getAttribute("open")) === null) {
    await page.click("#panelTrainingSetup > summary");
  }
}

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
  expect(theme.hand).toContain('"RealbookRegular"');
  expect(theme.hand).toContain('"Comic Neue"');
  await expect(page.locator("#radThemeLightBook")).toBeChecked();
  await expect(page.locator("#panelThemePicker summary")).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check("24px RealbookRegular");
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
  await expect(currentChord).toHaveCSS("font-family", /RealbookRegular/);
  await expect(page.locator(".songMeasure").first()).toHaveCSS(
    "border-radius",
    "2px",
  );
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
      font: "RealbookRegular",
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
  await expect(page.locator("#txtChord")).toHaveText("BьØ");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("Classical", { exact: true }).check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "classical");
  await expect(page.locator("#txtChord")).toHaveText("B♭m7♭5");

  await page.locator("#panelThemePicker summary").click();
  await page.getByLabel("DarkBook", { exact: true }).check();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkBook");
  await expect(page.locator("#txtChord")).toHaveText("BьØ");
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
  await page.click("#btnSettingsSave");

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
