import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Songs tab imports an iReal URL and loads it for practice", async ({
  page,
}) => {
  const errors: string[] = [];
  const songUrl =
    "irealbook://Practice Song=Doe John=Medium Swing=Bb=n=[*AT44Bb^7 |E-7b5 |A7b9 |D-7 |G7 |C-7 |F7 |Bb^7 Z";

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

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  await expect(page.locator("#selectSong")).toContainText("Practice Song");
  await expect(page.locator("#txtSongsStatus")).toHaveText("Imported 1 song.");
  await expect(page.locator("#txtCadence")).toContainText("Practice Song");
  await expect(page.locator("#txtProgression .songChartRow")).toHaveCount(2);
  await expect(page.locator("#txtProgression .songMeasure")).toHaveCount(8);
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("B♭Δ7");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(1),
  ).toContainText("E-7♭5");
  await expect(
    page.locator("#txtProgression .songMeasureSection").nth(0),
  ).toHaveText("A");
  await expect(
    page.locator("#txtProgression .songMeasureTimeSignature").nth(0),
  ).toContainText("4");
  await expect(
    page.locator("#txtProgression .songMeasureBar--double").nth(0),
  ).toBeVisible();
  await expect(page.locator("#txtProgression .songMeasureBars")).toHaveCount(0);
  await expect(page.locator("#txtProgression .songMeasureNumber")).toHaveCount(
    0,
  );
  await expect(page.locator("#txtCurrentKey")).toHaveText("Bb");

  if (errors.length) {
    console.error("=== JavaScript Errors Detected ===");
    for (const e of errors) console.error(e);
    throw new Error(`${errors.length} console error(s) found`);
  }
});

test("Songs tab marks repeat symbols after the original chord is completed", async ({
  page,
}) => {
  const songUrl =
    "irealbook://Repeat Song=Doe John=Medium Swing=C=n=[*AT44C7 |x |G7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  const firstChord = page
    .locator("#txtProgression .songMeasure")
    .nth(0)
    .locator(".songMeasureChord");
  const repeatChord = page
    .locator("#txtProgression .songMeasure")
    .nth(1)
    .locator(".songMeasureChord");

  await expect(firstChord).toHaveClass(/songMeasureChord--current/);
  await expect(repeatChord).not.toHaveClass(/songMeasureChord--current/);
  await expect(repeatChord).not.toHaveClass(/songMeasureChord--complete/);

  await page.evaluate(() => {
    nextChord(false);
  });

  await expect(firstChord).toHaveClass(/songMeasureChord--complete/);
  await expect(firstChord).not.toHaveClass(/songMeasureChord--current/);
  await expect(repeatChord).toHaveClass(/songMeasureChord--current/);
});

test("Songs tab restores the last selected song after reload", async ({
  page,
}) => {
  const firstSongUrl =
    "irealbook://Alpha Study=Doe Jane=Medium Swing=C=n=[*AT44C7 |F7 Z";
  const secondSongUrl =
    "irealbook://Beta Study=Doe Jane=Medium Swing=F=n=[*AT44F-7 |Bb7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");

  await page.fill("#inputSongsUrl", firstSongUrl);
  await page.click("#btnSongsImport");

  await page.fill("#inputSongsUrl", secondSongUrl);
  await page.click("#btnSongsImport");

  await page.selectOption("#selectSong", { label: "Alpha Study - Jane Doe" });
  await page.check("#chkSongFavorite");
  await page.selectOption("#selectSongFinishAction", "nextFavorite");
  await page.fill("#inputSongRepeatCount", "5");
  await page.uncheck("#chkSongCountsTowardGoals");
  await expect(page.locator("#selectSong")).toHaveValue(
    /alpha-study--jane-doe/,
  );

  await page.reload();
  await page.click("label[for='tabModeSongs']");

  await expect(page.locator("#selectSong")).toHaveValue(
    /alpha-study--jane-doe/,
  );
  await expect(page.locator("#chkSongFavorite")).toBeChecked();
  await expect(page.locator("#selectSongFinishAction")).toHaveValue(
    "nextFavorite",
  );
  await expect(page.locator("#inputSongRepeatCount")).toHaveValue("5");
  await expect(page.locator("#chkSongCountsTowardGoals")).not.toBeChecked();
  await expect(page.locator("#txtCadence")).toContainText("Alpha Study");
});

test("Songs tab can practice a song in the current key instead of the original key", async ({
  page,
}) => {
  const songUrl =
    "irealbook://Transpose Study=Doe Jane=Medium Swing=Bb=n=[*AT44Bb^7 |G-7 |C7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  await expect(page.locator("#txtCurrentKey")).toHaveText("Bb");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("B♭Δ7");

  await page.uncheck("#chkSongUseOriginalKey");

  await expect(page.locator("#txtCurrentKey")).toHaveText("C");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("CΔ7");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(1),
  ).toContainText("A-7");
});

test("Songs tab advances to the next favorite after the configured repeat count", async ({
  page,
}) => {
  const firstSongUrl =
    "irealbook://Alpha Study=Doe Jane=Medium Swing=C=n=[*AT44C7 Z";
  const secondSongUrl =
    "irealbook://Beta Study=Doe Jane=Medium Swing=F=n=[*AT44F7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");

  await page.fill("#inputSongsUrl", firstSongUrl);
  await page.click("#btnSongsImport");
  await page.fill("#inputSongsUrl", secondSongUrl);
  await page.click("#btnSongsImport");

  await page.selectOption("#selectSong", { label: "Beta Study - Jane Doe" });
  await page.check("#chkSongFavorite");
  await page.selectOption("#selectSong", { label: "Alpha Study - Jane Doe" });
  await page.selectOption("#selectSongFinishAction", "nextFavorite");
  await page.fill("#inputSongRepeatCount", "1");

  await page.evaluate(() => {
    nextChord(false);
  });

  await expect(page.locator("#selectSong")).toHaveValue(/beta-study--jane-doe/);
  await expect(page.locator("#txtCadence")).toContainText("Beta Study");
});

test("Songs tab can advance key on repeat and on song change", async ({
  page,
}) => {
  const firstSongUrl =
    "irealbook://Alpha Study=Doe Jane=Medium Swing=Bb=n=[*AT44Bb^7 Z";
  const secondSongUrl =
    "irealbook://Beta Study=Doe Jane=Medium Swing=Bb=n=[*AT44Bb^7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.selectOption("#selectFlow", "ascendingHalfSteps");
  await page.selectOption("#selectFlowStart", "C");

  await page.fill("#inputSongsUrl", firstSongUrl);
  await page.click("#btnSongsImport");
  await page.fill("#inputSongsUrl", secondSongUrl);
  await page.click("#btnSongsImport");

  await page.selectOption("#selectSong", { label: "Alpha Study - Jane Doe" });
  await page.uncheck("#chkSongUseOriginalKey");
  await page.check("#chkSongAdvanceKeyOnRepeat");
  await page.check("#chkSongAdvanceKeyOnSongChange");
  await page.selectOption("#selectSongFinishAction", "nextSong");
  await page.fill("#inputSongRepeatCount", "2");

  await expect(page.locator("#txtCurrentKey")).toHaveText("C");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("CΔ7");

  await page.evaluate(() => {
    nextChord(false);
  });

  await expect(page.locator("#txtCurrentKey")).toHaveText("C#");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("C♯Δ7");
  await expect(page.locator("#selectSong")).toHaveValue(
    /alpha-study--jane-doe/,
  );

  await page.evaluate(() => {
    nextChord(false);
  });

  await expect(page.locator("#selectSong")).toHaveValue(/beta-study--jane-doe/);
  await expect(page.locator("#txtCurrentKey")).toHaveText("D");
  await expect(
    page.locator("#txtProgression .songMeasure").nth(0),
  ).toContainText("DΔ7");
});
