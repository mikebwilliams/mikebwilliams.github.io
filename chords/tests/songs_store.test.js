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

const { songsStore } = require("../data.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("songs store persists last selected song and falls back after delete", () => {
  storageMock.clear();
  songsStore.clearAll();

  songsStore.importSource(
    "irealbook://Alpha Study=Doe Jane=Medium Swing=C=n=[*AT44C7 |F7 Z",
  );
  songsStore.importSource(
    "irealbook://Beta Study=Doe Jane=Medium Swing=F=n=[*AT44F-7 |Bb7 Z",
  );

  const songs = songsStore.listSongs();
  const alpha = songs.find((song) => song.title === "Alpha Study");
  const beta = songs.find((song) => song.title === "Beta Study");

  assert(alpha, "alpha song should exist");
  assert(beta, "beta song should exist");

  assert.strictEqual(
    songsStore.getLastSelection(),
    beta.id,
    "latest import should become selected",
  );

  songsStore.setLastSelection(alpha.id);
  assert.strictEqual(
    songsStore.getLastSelection(),
    alpha.id,
    "explicit selection should persist",
  );

  songsStore.deleteSong(alpha.id);
  assert.strictEqual(
    songsStore.getLastSelection(),
    beta.id,
    "selection should fall back to first remaining song",
  );

  songsStore.clearAll();
  assert.strictEqual(
    songsStore.getLastSelection(),
    "",
    "selection should clear when songs are cleared",
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
