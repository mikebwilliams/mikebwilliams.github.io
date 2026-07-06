import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Progression display preserves roman numeral capitalization", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");
  await page.selectOption("#selectProgression", "ii7-V7-IM7");

  const cadence = page.locator("#txtCadence");
  await expect(cadence).toContainText("ii7-V7-IM7");
  await expect(cadence).toHaveCSS("text-transform", "none");

  const progression = page.locator("#txtProgression");
  await expect(progression).toContainText("ii7 - V7 - IM7");
  await expect(progression).toHaveCSS("text-transform", "none");
});

test("Progression custom and random fields only enable for their modes", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");

  await expect(page.locator("#selectProgression")).toHaveValue("I-IV-V");
  await expect(page.locator("#inputProgressionCustom")).toBeDisabled();
  await expect(page.locator("#inputProgressionCustom")).toHaveCSS(
    "opacity",
    "0.58",
  );
  await expect(page.locator("#inputProgressionRandomCount")).toBeDisabled();
  await expect(page.locator("#inputProgressionRandomCount")).toHaveCSS(
    "opacity",
    "0.58",
  );

  await page.selectOption("#selectProgression", "custom");
  await expect(page.locator("#inputProgressionCustom")).toBeEnabled();
  await expect(page.locator("#inputProgressionCustom")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator("#inputProgressionRandomCount")).toBeDisabled();
  await expect(page.locator("#inputProgressionRandomCount")).toHaveCSS(
    "opacity",
    "0.58",
  );

  await page.selectOption("#selectProgression", "random");
  await expect(page.locator("#inputProgressionCustom")).toBeDisabled();
  await expect(page.locator("#inputProgressionCustom")).toHaveCSS(
    "opacity",
    "0.58",
  );
  await expect(page.locator("#inputProgressionRandomCount")).toBeEnabled();
  await expect(page.locator("#inputProgressionRandomCount")).toHaveCSS(
    "opacity",
    "1",
  );

  await page.selectOption("#selectProgression", "ii-V-I");
  await expect(page.locator("#inputProgressionCustom")).toBeDisabled();
  await expect(page.locator("#inputProgressionRandomCount")).toBeDisabled();
});

test("Progression Type B accepts the Ab ii7 upper voicing", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");
  await page.selectOption("#selectProgression", "ii7-V7-IM7");
  await page.selectOption("#selectFlow", "random");
  await page.selectOption("#selectFlowStart", "Ab");

  await page.click("label[for='tabOptionsVoicings']");
  await page.click("label:has(#radVoicingUpperTypeB)");
  await page.click("label[for='tabModeProgressions']");

  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        notes: currentChordNotes,
      })),
    )
    .toEqual({
      key: "Ab",
      chord: "Bbm7",
      notes: [8, 13, 17, 24],
    });

  await page.evaluate(() => {
    [56, 61, 65, 72].forEach((note) =>
      handleMidiMessage({ data: [144, note, 100] }),
    );
  });

  await expect(page.locator("#txtChord")).toHaveClass(/correct/);
});

test("Progression Type A/B accepts the highlighted Ab ii7 voicing", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");
  await page.selectOption("#selectProgression", "ii7-V7-IM7");
  await page.selectOption("#selectFlow", "random");
  await page.selectOption("#selectFlowStart", "Ab");

  await page.click("label[for='tabOptionsVoicings']");
  await page.click("label:has(#radVoicingUpperEither)");
  await page.click("label[for='tabModeProgressions']");
  await page.check("#chkDisplayHighlightKeys");
  await page.fill("#inputDisplayHighlightDelay", "0");
  await page.evaluate(() => highlightCorrectKeys());

  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll(".key.highlight"))
          .map((key) => Number(key.getAttribute("data-note")))
          .sort((a, b) => a - b),
      ),
    )
    .toEqual([49, 56, 60, 65]);

  await page.evaluate(() => {
    [49, 49, 56, 60, 65].forEach((note) => {
      handleKeyPressed(note);
      checkChord();
    });
  });

  await expect(page.locator("#txtChord")).toHaveClass(/correct/);
});

test("Progression Type A/B accepts Ab ii7 after advancing from Eb", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("label[for='tabModeProgressions']");
  await page.selectOption("#selectProgression", "ii7-V7-IM7");
  await page.selectOption("#selectFlow", "circleOfFourths");
  await page.selectOption("#selectFlowStart", "Eb");
  await page.check("#chkEarSendMidi");

  await page.click("label[for='tabOptionsVoicings']");
  await page.click("label:has(#radVoicingUpperEither)");
  await page.click("label[for='tabModeProgressions']");
  await page.check("#chkDisplayHighlightKeys");
  await page.fill("#inputDisplayHighlightDelay", "0");
  await page.evaluate(() => highlightCorrectKeys());

  const playHighlightedChord = async () => {
    const notes = await page.evaluate(() =>
      currentChordNotes.map((note) => note + 48),
    );
    await page.evaluate((notes) => {
      notes.forEach((note) => {
        handleKeyPressed(note);
        checkChord();
      });
      notes.forEach((note) => {
        handleKeyReleased(note);
        checkChord();
      });
    }, notes);
  };

  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        index: currentIndex,
      })),
    )
    .toEqual({ key: "Eb", chord: "Fm7", index: 0 });

  await playHighlightedChord();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        index: currentIndex,
      })),
    )
    .toEqual({ key: "Eb", chord: "Bb7", index: 1 });

  await playHighlightedChord();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        index: currentIndex,
      })),
    )
    .toEqual({ key: "Eb", chord: "EbM7", index: 2 });

  await playHighlightedChord();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        index: currentIndex,
        notes: currentChordNotes,
      })),
    )
    .toEqual({ key: "Ab", chord: "Bbm7", index: 0, notes: [1, 8, 12, 17] });

  await page.waitForTimeout(250);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        key: keys[keyIndex],
        chord: currentChordInternalName,
        index: currentIndex,
        notes: currentChordNotes,
      })),
    )
    .toEqual({ key: "Ab", chord: "Bbm7", index: 0, notes: [1, 8, 12, 17] });

  await page.evaluate(() => highlightCorrectKeys());
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll(".key.highlight"))
          .map((key) => Number(key.getAttribute("data-note")))
          .sort((a, b) => a - b),
      ),
    )
    .toEqual([49, 56, 60, 65]);

  await page.evaluate(() => {
    [49, 56, 60, 65].forEach((note) => {
      handleKeyPressed(note);
      checkChord();
    });
  });

  await expect(page.locator("#txtChord")).toHaveClass(/correct/);
});
