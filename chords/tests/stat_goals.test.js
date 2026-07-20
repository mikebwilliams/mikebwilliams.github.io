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

function getGoalInputs(category) {
  return dom.statGoals && dom.statGoals[category]
    ? dom.statGoals[category]
    : null;
}

function setGoals(category, goals) {
  const inputs = getGoalInputs(category);
  if (!inputs) return;
  if (
    Object.prototype.hasOwnProperty.call(goals, "correct") &&
    inputs.correct &&
    typeof inputs.correct.value !== "undefined"
  ) {
    inputs.correct.value = String(goals.correct);
  }
  if (
    Object.prototype.hasOwnProperty.call(goals, "total") &&
    inputs.total &&
    typeof inputs.total.value !== "undefined"
  ) {
    inputs.total.value = String(goals.total);
  }
}

function setCounts(category, { correct, incorrect }) {
  const correctSpans = {
    chords: dom.cntChordsCorrect,
    progressions: dom.cntProgsCorrect,
    songs: dom.cntSongsCorrect,
    degrees: dom.cntDegreesCorrect,
    scales: dom.cntScalesCorrect,
    bricks: dom.cntBricksCorrect,
  };
  const incorrectSpans = {
    chords: dom.cntChordsIncorrect,
    progressions: dom.cntProgsIncorrect,
    songs: dom.cntSongsIncorrect,
    degrees: dom.cntDegreesIncorrect,
    scales: dom.cntScalesIncorrect,
    bricks: dom.cntBricksIncorrect,
  };
  const totalSpans = {
    chords: dom.cntChordsTotal,
    progressions: dom.cntProgsTotal,
    songs: dom.cntSongsTotal,
    degrees: dom.cntDegreesTotal,
    scales: dom.cntScalesTotal,
    bricks: dom.cntBricksTotal,
  };
  const nextCorrect =
    typeof correct === "number"
      ? correct
      : parseInt(correctSpans[category]?.textContent || "0", 10);
  const nextIncorrect =
    typeof incorrect === "number"
      ? incorrect
      : parseInt(incorrectSpans[category]?.textContent || "0", 10);
  if (typeof correct === "number" && correctSpans[category]) {
    correctSpans[category].textContent = String(correct);
  }
  if (typeof incorrect === "number" && incorrectSpans[category]) {
    incorrectSpans[category].textContent = String(incorrect);
  }
  if (totalSpans[category]) {
    const totalValue =
      (Number.isFinite(nextCorrect) ? nextCorrect : 0) +
      (Number.isFinite(nextIncorrect) ? nextIncorrect : 0);
    totalSpans[category].textContent = String(totalValue);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("stat card marks goal when both thresholds reached", () => {
  const card = dom.statCards.chords;
  attachTrackingClassList(card);
  setGoals("chords", { correct: 3, total: 5 });
  setCounts("chords", { correct: 2, incorrect: 2 });

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should not be marked complete before goals reached",
  );

  setCounts("chords", { correct: 3, incorrect: 1 });
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should not be complete until total goal reached",
  );

  setCounts("chords", { correct: 3, incorrect: 2 });
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "card should be marked complete once both goals reached",
  );
});

test("stat card clears completion when goals disabled", () => {
  const card = dom.statCards.progressions;
  attachTrackingClassList(card);
  setGoals("progressions", { correct: 2, total: 0 });
  setCounts("progressions", { correct: 5, incorrect: 0 });

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "card should be complete when correct count exceeds goal",
  );

  setGoals("progressions", { correct: 0, total: 0 });
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should clear completion when goal disabled",
  );
});

test("total-only goals respect total attempts", () => {
  const card = dom.statCards.degrees;
  attachTrackingClassList(card);
  setGoals("degrees", { correct: 0, total: 4 });
  setCounts("degrees", { correct: 1, incorrect: 2 });

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "card should not complete before total attempts reached",
  );

  setCounts("degrees", { correct: 2, incorrect: 2 });
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "card should complete when total attempts match goal",
  );
});

test("song goals use the Songs stat card", () => {
  const card = dom.statCards.songs;
  attachTrackingClassList(card);
  setGoals("songs", { correct: 2, total: 3 });
  setCounts("songs", { correct: 2, incorrect: 0 });

  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    false,
    "song card should wait for total goal",
  );

  setCounts("songs", { correct: 2, incorrect: 1 });
  triggerGoalUpdate();
  assert.strictEqual(
    card.classList.contains("goalMet"),
    true,
    "song card should complete when song goals are reached",
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
  throw new Error(`${failed} test${failed === 1 ? "" : "s"} failed.`);
} else {
  console.log(`${passed} tests passed.`);
}
