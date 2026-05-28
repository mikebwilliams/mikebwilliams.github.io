import { test, expect } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

test("MIDI tab can manually refresh the device list", async ({ page }) => {
  await page.addInitScript(() => {
    function createMidiAccess(stage: number) {
      const inputName = stage === 1 ? "Initial Piano" : "Refreshed Piano";
      const outputName = stage === 1 ? "Initial Synth" : "Refreshed Synth";
      return {
        inputs: new Map([
          [
            `in-${stage}`,
            {
              id: `in-${stage}`,
              name: inputName,
              onmidimessage: null,
            },
          ],
        ]),
        outputs: new Map([
          [
            `out-${stage}`,
            {
              id: `out-${stage}`,
              name: outputName,
              send() {},
            },
          ],
        ]),
      };
    }

    let requestCount = 0;
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value() {
        requestCount += 1;
        return Promise.resolve(createMidiAccess(requestCount));
      },
    });
  });

  await page.goto(TEST_URL);
  await page.click("label[for='tabOptionsMidi']");

  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#tableMidiInputs")).toContainText("Initial Piano");
  await expect(page.locator("#tableMidiOutputs")).toContainText(
    "Initial Synth",
  );

  await page.click("#btnMidiRefresh");

  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#tableMidiInputs")).toContainText(
    "Refreshed Piano",
  );
  await expect(page.locator("#tableMidiOutputs")).toContainText(
    "Refreshed Synth",
  );
  await expect(page.locator("#tableMidiInputs")).not.toContainText(
    "Initial Piano",
  );
});
