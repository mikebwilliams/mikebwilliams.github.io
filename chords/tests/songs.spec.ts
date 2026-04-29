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

test("Songs tab shows slash cells instead of raw p markers", async ({
  page,
}) => {
  const songUrl =
    "irealbook://Slash Study=Doe John=Medium Swing=C=n=[*AT44C7,p,p,Gb7b9 |p,A-7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  const firstMeasureChords = page
    .locator("#txtProgression .songMeasure")
    .nth(0)
    .locator(".songMeasureChord");
  const secondMeasureChords = page
    .locator("#txtProgression .songMeasure")
    .nth(1)
    .locator(".songMeasureChord");

  await expect(firstMeasureChords).toHaveCount(4);
  await expect(firstMeasureChords.nth(0)).toHaveText("C7");
  await expect(firstMeasureChords.nth(1)).toHaveText("/");
  await expect(firstMeasureChords.nth(2)).toHaveText("/");
  await expect(firstMeasureChords.nth(3)).toHaveText("G♭7♭9");
  await expect(secondMeasureChords.nth(0)).toHaveText("/");
  await expect(secondMeasureChords.nth(1)).toHaveText("A-7");
});

test("Songs tab advances immediately for legato chord changes", async ({
  page,
}) => {
  const songUrl =
    "irealbook://Legato Study=Doe John=Medium Swing=C=n=[*AT44C7 |F7 |Bb^7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  const firstChord = page.locator("#txtProgression .songMeasureChord").nth(0);
  const secondChord = page.locator("#txtProgression .songMeasureChord").nth(1);
  const thirdChord = page.locator("#txtProgression .songMeasureChord").nth(2);

  await expect(firstChord).toHaveClass(/songMeasureChord--current/);

  await page.evaluate(() => {
    [48, 52, 55, 58].forEach((note) =>
      handleMidiMessage({ data: [144, note, 100] }),
    );
  });

  await expect(firstChord).toHaveClass(/songMeasureChord--complete/);
  await expect(secondChord).toHaveClass(/songMeasureChord--current/);

  await page.evaluate(() => {
    [53, 57, 60, 63].forEach((note) =>
      handleMidiMessage({ data: [144, note, 100] }),
    );
  });

  await expect(secondChord).toHaveClass(/songMeasureChord--complete/);
  await expect(thirdChord).toHaveClass(/songMeasureChord--current/);
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

test("Songs tab keyboard shortcuts move through the saved song list", async ({
  page,
}) => {
  const alphaSongUrl =
    "irealbook://Alpha Study=Doe Jane=Medium Swing=C=n=[*AT44C7 Z";
  const betaSongUrl =
    "irealbook://Beta Study=Doe Jane=Medium Swing=F=n=[*AT44F7 Z";
  const gammaSongUrl =
    "irealbook://Gamma Study=Doe Jane=Medium Swing=Bb=n=[*AT44Bb^7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", alphaSongUrl);
  await page.click("#btnSongsImport");
  await page.fill("#inputSongsUrl", betaSongUrl);
  await page.click("#btnSongsImport");
  await page.fill("#inputSongsUrl", gammaSongUrl);
  await page.click("#btnSongsImport");

  await page.selectOption("#selectSong", { label: "Alpha Study - Jane Doe" });
  await page.locator("#txtCadence").click();

  await page.keyboard.press("BracketRight");
  await expect(page.locator("#selectSong")).toHaveValue(/beta-study--jane-doe/);
  await expect(page.locator("#txtCadence")).toContainText("Beta Study");

  await page.keyboard.press("BracketLeft");
  await expect(page.locator("#selectSong")).toHaveValue(
    /alpha-study--jane-doe/,
  );

  await page.keyboard.press("BracketLeft");
  await expect(page.locator("#selectSong")).toHaveValue(
    /gamma-study--jane-doe/,
  );
  await expect(page.locator("#txtCadence")).toContainText("Gamma Study");
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

test("Songs tab can sync measure timing to the metronome", async ({ page }) => {
  test.setTimeout(7000);
  const songUrl =
    "irealbook://Meter Study=Doe Jane=Medium Swing=C=n=[*AT44C7,G7 |F7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  await page.click("#panelMetronome > summary");
  await page.fill("#inputMetronomeTempoNumber", "240");
  await page.locator("#inputMetronomeTempoNumber").blur();
  await page.fill("#inputMetronomeCountInMeasures", "1");
  await page.locator("#inputMetronomeCountInMeasures").blur();
  await page.check("#chkMetronomeSyncSongs");

  await expect(page.locator("#inputMetronomeBeatsPerMeasure")).toBeDisabled();
  await expect(page.locator("#txtMetronomeStatus")).toContainText(
    "Song sync active",
  );
  await expect(page.locator("#txtMetronomeStatus")).toContainText(
    "Count-in: 1 measure.",
  );
  await expect(page.locator(".metronomePulse")).toHaveCount(4);

  const firstChord = page.locator("#txtProgression .songMeasureChord").nth(0);
  const secondChord = page.locator("#txtProgression .songMeasureChord").nth(1);
  const thirdChord = page.locator("#txtProgression .songMeasureChord").nth(2);

  await page.click("#btnMetronomeToggle");
  await page.waitForTimeout(250);
  await expect(page.locator("#txtMetronomeMeasure")).toHaveText("In 1 / 1");
  await expect(firstChord).not.toHaveClass(/songMeasureChord--current/);

  await page.waitForTimeout(900);
  await expect(firstChord).toHaveClass(/songMeasureChord--current/);

  await page.evaluate(() => {
    [48, 52, 55, 58].forEach((note) => handleKeyPressed(note));
    checkChord();
    [48, 52, 55, 58].forEach((note) => handleKeyReleased(note));
    checkChord();
  });

  await expect(firstChord).toHaveClass(/songMeasureChord--complete/);
  await expect(secondChord).toHaveClass(/songMeasureChord--current/);

  await page.waitForTimeout(1100);

  await expect(firstChord).toHaveClass(/songMeasureChord--complete/);
  await expect(secondChord).toHaveClass(/songMeasureChord--missed/);
  await expect(thirdChord).toHaveClass(/songMeasureChord--current/);

  await page.click("#btnMetronomeToggle");
});

test("Songs tab accepts anticipated chords at the barline in metronome sync mode", async ({
  page,
}) => {
  test.setTimeout(7000);
  const songUrl =
    "irealbook://Anticipation Study=Doe Jane=Medium Swing=C=n=[*AT44C7,G7 |F7 Z";

  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeSongs']");
  await page.fill("#inputSongsUrl", songUrl);
  await page.click("#btnSongsImport");

  await page.click("#panelMetronome > summary");
  await page.fill("#inputMetronomeTempoNumber", "240");
  await page.locator("#inputMetronomeTempoNumber").blur();
  await page.fill("#inputMetronomeCountInMeasures", "1");
  await page.locator("#inputMetronomeCountInMeasures").blur();
  await page.check("#chkMetronomeSyncSongs");

  const firstChord = page.locator("#txtProgression .songMeasureChord").nth(0);
  const secondChord = page.locator("#txtProgression .songMeasureChord").nth(1);

  await page.click("#btnMetronomeToggle");
  await page.waitForTimeout(250);

  await page.evaluate(() => {
    [48, 52, 55, 58].forEach((note) =>
      handleMidiMessage({ data: [144, note, 100] }),
    );
  });

  await page.waitForTimeout(800);
  await expect(firstChord).toHaveClass(/songMeasureChord--complete/);
  await expect(secondChord).toHaveClass(/songMeasureChord--current/);

  await page.click("#btnMetronomeToggle");
});
