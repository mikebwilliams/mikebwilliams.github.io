import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

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
      bg: styles.getPropertyValue("--bg-900").trim(),
      ink: styles.getPropertyValue("--text-primary").trim(),
      accent: styles.getPropertyValue("--accent").trim(),
      hand: styles.getPropertyValue("--font-hand").trim(),
    };
  });

  expect(theme.bg).toBe("#d7c8a7");
  expect(theme.ink).toBe("#211b12");
  expect(theme.accent).toBe("#2b6683");
  expect(theme.hand).toContain('"RealbookRegular"');
  expect(theme.hand).toContain('"Comic Neue"');

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
