const assert = require("assert");

require("../data.js");
require("../scripts.js");

const appGlobals = global.appGlobals || {};
const dom = appGlobals.domElements || {};

function attachTrackingClassList(element) {
  const state = new Set();
  element.classList = {
    add(name) {
      state.add(name);
    },
    remove(name) {
      state.delete(name);
    },
    contains(name) {
      return state.has(name);
    },
  };
  return element.classList;
}

function triggerGoalUpdate() {
  if (typeof appGlobals.statGoalsChanged === "function") {
    appGlobals.statGoalsChanged();
  } else if (typeof appGlobals.updateStatGoalStatuses === "function") {
    appGlobals.updateStatGoalStatuses();
  }
}

function setGoal(category, value) {
  const input = dom.statGoals && dom.statGoals[category];
  if (input) {
    input.value = String(value);
  }
}

function setCorrect(category, value) {
  const spans = {
    chords: dom.cntChordsCorrect,
    progressions: dom.cntProgsCorrect,
    degrees: dom.cntDegreesCorrect,
    scales: dom.cntScalesCorrect,
    bricks: dom.cntBricksCorrect,
  };
  const el = spans[category];
  if (el) {
    el.textContent = String(value);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("stat card marks goal when target reached", () => {
  const card = dom.statCards.chords;
  attachTrackingClassList(card);
  setGoal("chords", 3);
  setCorrect("chords", 2);

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should not be marked complete before reaching goal",
  );

  setCorrect("chords", 3);
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "card should be marked complete once goal reached",
  );
});

test("stat card clears completion when goal lowered", () => {
  const card = dom.statCards.progressions;
  attachTrackingClassList(card);
  setGoal("progressions", 2);
  setCorrect("progressions", 5);

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "card should be complete when correct count exceeds goal",
  );

  setGoal("progressions", 0);
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should clear completion when goal disabled",
  );
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
  process.exitCode = 1;
} else {
  console.log(`${passed} tests passed.`);
}
