const assert = require("assert");

const storageMock = (() => {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
})();

global.localStorage = storageMock;

const {
  sanitizeMetronomeSettings,
  getMetronomeTickType,
  getSongSyncMetronomeTickType,
  getMetronomeCompletedMeasures,
  getMetronomeDisplayedMeasure,
  getMetronomeCycleDisplay,
} = require("../data.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  tests.forEach(({ name, fn }) => {
    fn();
    console.log(`✓ ${name}`);
  });
  console.log(`${tests.length} tests passed.`);
}

test("sanitizeMetronomeSettings clamps values and falls back to defaults", () => {
  assert.deepStrictEqual(
    sanitizeMetronomeSettings({
      tempo: "999",
      beatsPerMeasure: "0",
      xMeasures: "-5",
      yMeasures: "abc",
    }),
    {
      tempo: 240,
      beatsPerMeasure: 1,
      xMeasures: 0,
      yMeasures: 8,
      countInMeasures: 1,
      syncToSongs: false,
    },
  );
});

test("getMetronomeTickType prioritizes y then x then measure", () => {
  const settings = { xMeasures: 4, yMeasures: 8 };
  assert.strictEqual(getMetronomeTickType(1, 8, settings), "normal");
  assert.strictEqual(getMetronomeTickType(0, 8, settings), "y");
  assert.strictEqual(getMetronomeTickType(0, 4, settings), "x");
  assert.strictEqual(getMetronomeTickType(0, 3, settings), "measure");
});

test("song sync metronome tick type ignores count-in for phrase accents", () => {
  const firstBar = { sectionMeasure: 1 };
  const fourthBar = { sectionMeasure: 4 };
  const fifthBar = { sectionMeasure: 5 };
  const ninthBar = { sectionMeasure: 9 };

  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 1, firstBar, {
      hasStarted: false,
      countInMeasures: 1,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "y",
  );
  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 2, firstBar, {
      hasStarted: true,
      countInMeasures: 1,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "y",
  );
  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 5, fourthBar, {
      hasStarted: true,
      countInMeasures: 1,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "measure",
  );
  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 6, fifthBar, {
      hasStarted: true,
      countInMeasures: 1,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "x",
  );
  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 10, ninthBar, {
      hasStarted: true,
      countInMeasures: 1,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "y",
  );
  assert.strictEqual(
    getSongSyncMetronomeTickType(0, 1, firstBar, {
      hasStarted: false,
      countInMeasures: 2,
      xMeasures: 4,
      yMeasures: 8,
    }),
    "y",
  );
});

test("metronome measure displays reset at x and y marker boundaries", () => {
  assert.strictEqual(getMetronomeCompletedMeasures(false, 1), 0);
  assert.strictEqual(getMetronomeCompletedMeasures(true, 6), 5);
  assert.strictEqual(getMetronomeDisplayedMeasure(5, 4, 8), 1);
  assert.strictEqual(getMetronomeDisplayedMeasure(9, 4, 8), 1);
  assert.strictEqual(getMetronomeDisplayedMeasure(10, 4, 8), 2);
  assert.strictEqual(getMetronomeCycleDisplay(6, 4), "2 / 4");
  assert.strictEqual(getMetronomeCycleDisplay(6, 0), "Off");
});

run();
