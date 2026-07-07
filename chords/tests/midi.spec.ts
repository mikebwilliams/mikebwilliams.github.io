import { test, expect, type Page } from "@playwright/test";

const TEST_URL = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:8001/";

async function openMidiPanel(page: Page) {
  const keyboardPanel = page.locator("#panelKeyboard");
  if ((await keyboardPanel.getAttribute("open")) === null) {
    await page.click("#panelKeyboard > summary");
  }

  const midiPanel = page.locator("#panelKeyboardMidi");
  if ((await midiPanel.getAttribute("open")) === null) {
    await page.click("#panelKeyboardMidi > summary");
  }
}

async function installMidiStateChangeMock(page, inputId, inputName) {
  await page.addInitScript(
    ({ inputId, inputName }) => {
      function createInput(id: string, name: string) {
        return {
          id,
          name,
          state: "connected",
          onmidimessage: null,
        } as any;
      }

      const input = createInput(inputId, inputName);
      const inputs = new Map([[inputId, input]]);
      const access = {
        inputs,
        outputs: new Map(),
        onstatechange: null,
      } as any;

      (window as any).__midiStateChangeTest = {
        addInput(id: string, name: string) {
          const newInput = createInput(id, name);
          inputs.set(id, newInput);
          if (typeof access.onstatechange === "function") {
            access.onstatechange({ port: newInput });
          }
        },
        emitStateChange(state: string, id = inputId) {
          const targetInput = inputs.get(id);
          targetInput.state = state;
          if (typeof access.onstatechange === "function") {
            access.onstatechange({ port: targetInput });
          }
        },
        hasInputListener(id = inputId) {
          const targetInput = inputs.get(id);
          return typeof targetInput.onmidimessage === "function";
        },
      };

      Object.defineProperty(navigator, "requestMIDIAccess", {
        configurable: true,
        value() {
          return Promise.resolve(access);
        },
      });
    },
    { inputId, inputName },
  );
}

test("MIDI panel can manually refresh the device list", async ({ page }) => {
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
  await openMidiPanel(page);

  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 1 in / 1 out",
  );
  await expect(page.locator("#tableMidiInputs")).toContainText("Initial Piano");
  await expect(page.locator("#tableMidiOutputs")).toContainText(
    "Initial Synth",
  );

  await page.click("#btnMidiRefresh");

  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 1 in / 1 out",
  );
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

test("MIDI reconnects a previously enabled input when it reappears", async ({
  page,
}) => {
  await installMidiStateChangeMock(page, "keyboard-1", "Reconnect Piano");

  await page.goto(TEST_URL);
  await openMidiPanel(page);

  const inputCheckbox = page.locator("input[data-midi-in='keyboard-1']");
  await expect(inputCheckbox).toBeChecked();
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener(),
    ),
  ).toBe(true);

  await page.evaluate(() =>
    (window as any).__midiStateChangeTest.emitStateChange("disconnected"),
  );

  await expect(page.locator("#txtMidiStatus")).toHaveText(
    "No MIDI inputs detected. Please connect a MIDI device.",
  );
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: no inputs",
  );
  await expect(page.locator("#tableMidiInputs")).not.toContainText(
    "Reconnect Piano",
  );
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener(),
    ),
  ).toBe(false);

  await page.evaluate(() =>
    (window as any).__midiStateChangeTest.emitStateChange("connected"),
  );

  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 1 in / 0 out",
  );
  await expect(inputCheckbox).toBeChecked();
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener(),
    ),
  ).toBe(true);
});

test("MIDI reconnect preserves disabled input choices", async ({ page }) => {
  await installMidiStateChangeMock(page, "keyboard-2", "Disabled Piano");

  await page.goto(TEST_URL);
  await openMidiPanel(page);

  const inputCheckbox = page.locator("input[data-midi-in='keyboard-2']");
  await expect(inputCheckbox).toBeChecked();
  await inputCheckbox.uncheck();
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 0 in / 0 out",
  );
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener(),
    ),
  ).toBe(false);

  await page.evaluate(() =>
    (window as any).__midiStateChangeTest.emitStateChange("disconnected"),
  );
  await page.evaluate(() =>
    (window as any).__midiStateChangeTest.emitStateChange("connected"),
  );

  await expect(inputCheckbox).not.toBeChecked();
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener(),
    ),
  ).toBe(false);
});

test("MIDI auto-connects new inputs that were not disabled", async ({
  page,
}) => {
  await installMidiStateChangeMock(page, "keyboard-1", "First Piano");

  await page.goto(TEST_URL);
  await openMidiPanel(page);

  await expect(page.locator("input[data-midi-in='keyboard-1']")).toBeChecked();
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 1 in / 0 out",
  );

  await page.evaluate(() =>
    (window as any).__midiStateChangeTest.addInput("keyboard-2", "Late Piano"),
  );

  const newInputCheckbox = page.locator("input[data-midi-in='keyboard-2']");
  await expect(page.locator("#txtMidiStatus")).toHaveText("MIDI connected.");
  await expect(page.locator("#txtKeyboardSummary")).toHaveText(
    "MIDI: 2 in / 0 out",
  );
  await expect(page.locator("#tableMidiInputs")).toContainText("Late Piano");
  await expect(newInputCheckbox).toBeChecked();
  expect(
    await page.evaluate(() =>
      (window as any).__midiStateChangeTest.hasInputListener("keyboard-2"),
    ),
  ).toBe(true);
});
