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

require("../data.js");

const workoutStore = global.appGlobals.workoutStore;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("workout store saves and loads sanitized entries", () => {
  storageMock.clear();
  workoutStore.replaceAll({});

  const saved = workoutStore.saveWorkout("Daily", [
    {
      preset: "All Chords",
      goals: { correct: 100, total: 120 },
      category: "chords",
      settings: {
        mode: "tabChords",
        flow: { mode: "circleOfFourths", startKey: "C" },
      },
    },
    { preset: " Evening Drill ", goal: "-3", total: "7", category: "invalid" },
  ]);
  assert.strictEqual(saved, true, "workout should save successfully");

  const listed = workoutStore.listWorkouts();
  assert.deepStrictEqual(
    listed,
    ["Daily"],
    "workout list should contain saved workout",
  );

  const loaded = workoutStore.getWorkout("Daily");
  assert(loaded, "saved workout should load");
  assert.strictEqual(loaded.name, "Daily");
  assert.deepStrictEqual(
    loaded.entries,
    [
      {
        preset: "All Chords",
        goals: { correct: 100, total: 120 },
        category: "chords",
        settings: {
          mode: "tabChords",
          flow: { mode: "circleOfFourths", startKey: "C" },
        },
      },
      {
        preset: "Evening Drill",
        goals: { correct: 0, total: 7 },
        category: null,
      },
    ],
    "entries should be sanitized on save/load",
  );
});

test("workout store rename and delete operate safely", () => {
  storageMock.clear();
  workoutStore.replaceAll({});
  workoutStore.saveWorkout("Morning", [{ preset: "Warmup", goal: 10 }]);

  const renamed = workoutStore.renameWorkout("Morning", "Evening");
  assert.strictEqual(renamed, true, "rename should succeed");
  assert.strictEqual(
    workoutStore.getWorkout("Morning"),
    null,
    "old workout name should be removed after rename",
  );
  const evening = workoutStore.getWorkout("Evening");
  assert(evening, "renamed workout should exist");
  assert.strictEqual(evening.name, "Evening");

  const deleted = workoutStore.deleteWorkout("Evening");
  assert.strictEqual(deleted, true, "delete should succeed");
  assert.deepStrictEqual(
    workoutStore.listWorkouts(),
    [],
    "workout list should be empty after delete",
  );
});

test("workout store tracks last selection and clears when removed", () => {
  storageMock.clear();
  workoutStore.replaceAll({});
  workoutStore.saveWorkout("Session", [
    { preset: "Focus", goals: { correct: 5, total: 0 } },
  ]);

  workoutStore.setLastSelection("Session", 2);
  const selection = workoutStore.getLastSelection();
  assert.deepStrictEqual(
    selection,
    { workout: "Session", entryIndex: 2 },
    "selection should round-trip",
  );

  workoutStore.deleteWorkout("Session");
  const cleared = workoutStore.getLastSelection();
  assert.strictEqual(
    cleared,
    null,
    "selection should clear when workout removed",
  );
});

test("workout store imports and exports workout JSON", () => {
  storageMock.clear();
  workoutStore.replaceAll({});
  workoutStore.saveWorkout("Stored", [
    {
      preset: "Stored Preset",
      goals: { correct: 2, total: 3 },
      category: "chords",
      settings: {
        mode: "tabScales",
        flow: { mode: "ascendingWholeSteps", startKey: "D" },
      },
    },
  ]);

  const exported = JSON.parse(workoutStore.exportWorkouts(true));
  assert(exported.workouts.Stored, "export should include saved workout");
  assert.deepStrictEqual(
    exported.workouts.Stored.entries[0].settings,
    {
      mode: "tabScales",
      flow: { mode: "ascendingWholeSteps", startKey: "D" },
    },
    "export should include embedded preset settings",
  );

  const importedCount = workoutStore.importWorkouts({
    workouts: {
      Imported: {
        entries: [
          {
            preset: "Imported Preset",
            goal: 5,
            category: "progressions",
            settings: {
              mode: "tabProgressions",
              flow: { mode: "descendingWholeSteps", startKey: "F" },
            },
          },
        ],
      },
    },
  });

  assert.strictEqual(importedCount, 1, "one workout should import");
  const imported = workoutStore.getWorkout("Imported");
  assert(imported, "imported workout should load");
  assert.deepStrictEqual(imported.entries, [
    {
      preset: "Imported Preset",
      goals: { correct: 5, total: 0 },
      category: "progressions",
      settings: {
        mode: "tabProgressions",
        flow: { mode: "descendingWholeSteps", startKey: "F" },
      },
    },
  ]);
});

test("workout store sanitizes malformed goal objects", () => {
  storageMock.clear();
  workoutStore.replaceAll({});

  const importedCount = workoutStore.importWorkouts({
    workouts: {
      Hostile: {
        entries: [
          {
            preset: "Goal Fuzz",
            goals: {
              correct: { toString: "not callable" },
              total: { valueOf: "not callable" },
            },
          },
        ],
      },
    },
  });

  assert.strictEqual(importedCount, 1, "workout should import");
  assert.deepStrictEqual(workoutStore.getWorkout("Hostile").entries, [
    {
      preset: "Goal Fuzz",
      goals: { correct: 0, total: 0 },
      category: null,
    },
  ]);
});

let passed = 0;
let failed = 0;
tests.forEach(({ name, fn }) => {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
});

if (failed) {
  throw new Error(`${failed} test${failed === 1 ? "" : "s"} failed.`);
} else {
  console.log(`${passed} tests passed.`);
}
