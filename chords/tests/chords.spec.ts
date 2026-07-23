import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("Chord type controls fit the desktop control rail without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator("#tableChordSelections thead th")).toHaveText([
    "Group",
    "Mode",
    "Major",
    "Minor",
  ]);
  await expect(
    page.locator("#tableChordSelections tbody th").first(),
  ).toHaveText("All");

  const stateCellAlignment = await page
    .locator("#tableChordSelections")
    .evaluate((table) => {
      const modeHeader = table.querySelector("thead th:nth-child(2)");
      const stateCell = table.querySelector("tbody .chordTypeStateCell");
      if (!modeHeader || !stateCell) return null;
      return {
        header: getComputedStyle(modeHeader).textAlign,
        stateCell: getComputedStyle(stateCell).textAlign,
      };
    });
  expect(stateCellAlignment).toEqual({
    header: "left",
    stateCell: "left",
  });

  const metrics = await page.locator("#panelModeChords").evaluate((panel) => ({
    clientWidth: panel.clientWidth,
    scrollWidth: panel.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
});

test("Non-book themes display triangle major symbols instead of Greek delta", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "classical";
    currentChordName = "C#-Δ7";
    updateDisplay();
  });

  await expect(page.locator("#txtChord")).toHaveText("C♯-△7");
});

test("Book themes display chord symbols with Realbook glyph codepoints", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "lightBook";
    currentChordName = "Cm7";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("CΜί");
  await expect
    .poll(() =>
      page
        .locator("#txtChord")
        .evaluate((el) =>
          Array.from(el.textContent || "").map((char) =>
            char.codePointAt(0)?.toString(16),
          ),
        ),
    )
    .toEqual(["43", "39c", "3af"]);

  await page.evaluate(() => {
    currentChordName = "Cdim7";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("C°ί");

  await page.evaluate(() => {
    currentChordName = "Cmaj7";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("Cª");

  await page.evaluate(() => {
    currentChordName = "Bbm7b5";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("BьØ");

  await page.evaluate(() => {
    currentChordName = "C#-Δ7";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("C#Μª");

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "classical";
    currentChordName = "Cm7";
    updateDisplay();
  });
  await expect(page.locator("#txtChord")).toHaveText("Cm7");
});

test("Chord title visibly reports incorrect and correct answers", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.evaluate(() => {
    keys = ["C"];
    keyIndex = 0;
    currentChordName = "C";
    currentChordInternalName = "C";
    currentChordNotes = [0, 4, 7];
    activeKeys = [];
    isIncorrect = false;
    awaitingKeyRelease = false;
    clearChordFeedbackState();
    updateDisplay();
    handleKeyPressed(49);
  });

  const chord = page.locator("#txtChord");
  await expect(chord).toHaveClass(/incorrect/);
  await expect(chord).toHaveCSS("color", "rgb(168, 50, 39)");

  await page.evaluate(() => {
    handleKeyReleased(49);
    isIncorrect = false;
    clearChordFeedbackState();
    [48, 52, 55].forEach((note) =>
      handleMidiMessage({ data: [144, note, 100] }),
    );
  });

  await expect(chord).toHaveClass(/correct/);
  await expect(chord).toHaveCSS("color", "rgb(56, 114, 53)");
});

test("Chord selection returns when only one chord type can repeat", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => {
    keys = ["C", "D"];
    keyIndex = 0;
    currentChordInternalName = "C";
    Object.values(dom.chordCheckboxes).forEach((checkbox) => {
      checkbox.checked = checkbox.id === "chkChordMajor";
    });

    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      setRandomChord();
    } finally {
      Math.random = originalRandom;
    }
  });

  await expect
    .poll(() => page.evaluate(() => currentChordInternalName))
    .toBe("C");
});

test("Failed chord repeats wait for their current practice root", async ({
  page,
}) => {
  await page.goto(TEST_URL);

  const result = await page.evaluate(() => {
    spacedRepClearAll();
    dom.enableSpacedRepetition.checked = true;
    Object.values(dom.chordCheckboxes).forEach((checkbox) => {
      checkbox.checked = checkbox.id === "chkChordMajor";
    });

    spacedRepHandleResult("chord", "Csus2", true);
    spacedQueueAll[0].counter = 0;
    keys = ["C", "F"];

    keyIndex = 1;
    setRandomChord();
    const chordInF = currentChordInternalName;

    keyIndex = 0;
    setRandomChord();

    return {
      chordInF,
      chordInC: currentChordInternalName,
      scheduledRepeat,
    };
  });

  expect(result).toEqual({
    chordInF: "F",
    chordInC: "Csus2",
    scheduledRepeat: { kind: "chord", index: 0 },
  });
});

test("Chord type group controls cycle and reflect partial selections", async ({
  page,
}) => {
  await page.goto(TEST_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const triadButton = page.locator("#btnChordsTriads");
  const triads = [
    "#chkChordMajor",
    "#chkChordMinor",
    "#chkChordAugmented",
    "#chkChordDiminished",
    "#chkChordSuspendedFourth",
    "#chkChordSuspendedSecond",
  ];

  await expect(triadButton).toHaveAttribute("data-state", "allOn");
  await expect(triadButton).toHaveAttribute("aria-pressed", "true");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: All on");
  await expect(triadButton).toHaveText("✓");

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).not.toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOff");
  await expect(triadButton).toHaveAttribute("aria-pressed", "false");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: All off");
  await expect(triadButton).toHaveText("×");
  await expect(page.locator("#chkChordSixth")).toBeChecked();

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOn");
  await expect(triadButton).toHaveText("✓");

  await page.locator("#chkChordMajor").uncheck();
  await expect(triadButton).toHaveAttribute("data-state", "partial");
  await expect(triadButton).toHaveAttribute("aria-pressed", "mixed");
  await expect(triadButton).toHaveAttribute("aria-label", "Triads: Partial");
  await expect(triadButton).toHaveText("−");

  await triadButton.click();
  for (const selector of triads) {
    await expect(page.locator(selector)).toBeChecked();
  }
  await expect(triadButton).toHaveAttribute("data-state", "allOn");

  await page.click("#btnChordsMajor");
  await expect(page.locator("#chkChordMajor")).not.toBeChecked();
  await expect(page.locator("#chkChordAugmented")).not.toBeChecked();
  await expect(page.locator("#chkChordSixth")).not.toBeChecked();
  await expect(page.locator("#chkChordSeventh")).not.toBeChecked();
  await expect(page.locator("#chkChordMinor")).toBeChecked();
  await expect(page.locator("#chkChordMinorSeventh")).toBeChecked();
  await expect(page.locator("#btnChordsMajor")).toHaveAttribute(
    "data-state",
    "allOff",
  );
  await expect(page.locator("#btnChordsMajor")).toHaveAttribute(
    "aria-label",
    "Major: All off",
  );
  await expect(page.locator("#btnChordsMajor")).toHaveText("×");
  await expect(page.locator("#btnChordsAll")).toHaveAttribute(
    "data-state",
    "partial",
  );
  await expect(page.locator("#btnChordsAll")).toHaveAttribute(
    "aria-label",
    "All: Partial",
  );
  await expect(page.locator("#btnChordsAll")).toHaveText("−");
});
