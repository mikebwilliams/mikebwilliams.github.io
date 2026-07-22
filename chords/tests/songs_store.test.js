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
  songsStore,
  sanitizeSongsPracticeSettings,
  pickSongIdForSongNavigation,
  pickSongIdForFavoriteNavigation,
  pickSongIdForFinishAction,
} = require("../data.js");

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

  storageMock.setItem("unrelated.storage", "keep");
  assert.strictEqual(songsStore.clearAll(), true);
  assert.strictEqual(
    songsStore.getLastSelection(),
    "",
    "selection should clear when songs are cleared",
  );
  assert.strictEqual(
    storageMock.getItem(songsStore.storageKey),
    null,
    "song data should be removed",
  );
  assert.strictEqual(
    storageMock.getItem(songsStore.selectedKey),
    null,
    "song selection should be removed",
  );
  assert.strictEqual(
    storageMock.getItem("unrelated.storage"),
    "keep",
    "clearing songs should not affect unrelated storage",
  );
});

test("clearing songs reports storage failures", () => {
  const originalStorage = songsStore.storage;
  songsStore.storage = {
    removeItem() {
      throw new Error("storage unavailable");
    },
  };

  try {
    assert.strictEqual(songsStore.clearAll(), false);
  } finally {
    songsStore.storage = originalStorage;
  }
});

test("songs store preserves favorites across re-import and song settings sanitize cleanly", () => {
  storageMock.clear();
  songsStore.clearAll();

  songsStore.importSource(
    "irealbook://Favorite Study=Doe Jane=Medium Swing=C=n=[*AT44C7 |F7 Z",
  );

  const firstSong = songsStore.listSongs()[0];
  assert(firstSong, "song should exist after import");

  songsStore.setFavorite(firstSong.id, true);
  assert.strictEqual(
    songsStore.getSong(firstSong.id).favorite,
    true,
    "favorite flag should persist after toggle",
  );

  songsStore.importSource(
    "irealbook://Favorite Study=Doe Jane=Medium Swing=C=n=[*AT44C7 |G7 Z",
  );

  assert.strictEqual(
    songsStore.getSong(firstSong.id).favorite,
    true,
    "re-import should preserve an existing favorite flag",
  );

  assert.deepStrictEqual(
    sanitizeSongsPracticeSettings({
      finishAction: "bogus",
      repeatCount: "0",
      countChordsTowardGoals: false,
    }),
    {
      useOriginalKey: true,
      advanceKeyOnRepeat: false,
      advanceKeyOnSongChange: false,
      finishAction: "nothing",
      repeatCount: 3,
      countChordsTowardGoals: false,
      displayRomanNumerals: false,
    },
  );
});

test("song finish actions choose the expected next song", () => {
  const songs = [
    { id: "alpha", favorite: false },
    { id: "beta", favorite: true },
    { id: "gamma", favorite: true },
  ];

  assert.strictEqual(
    pickSongIdForFinishAction(songs, "alpha", "nextFavorite"),
    "beta",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "beta", "nextFavorite"),
    "gamma",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "gamma", "nextFavorite"),
    "beta",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "alpha", "nextSong"),
    "beta",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "gamma", "nextSong"),
    "alpha",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "gamma", "randomFavorite", 0),
    "beta",
  );
  assert.strictEqual(
    pickSongIdForFinishAction(songs, "alpha", "randomSong", 0.8),
    "gamma",
  );
});

test("song navigation can move forward and backward through saved songs", () => {
  const songs = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }];

  assert.strictEqual(
    pickSongIdForSongNavigation(songs, "alpha", "next"),
    "beta",
  );
  assert.strictEqual(
    pickSongIdForSongNavigation(songs, "gamma", "next"),
    "alpha",
  );
  assert.strictEqual(
    pickSongIdForSongNavigation(songs, "alpha", "previous"),
    "gamma",
  );
  assert.strictEqual(
    pickSongIdForSongNavigation(songs, "missing", "previous"),
    "gamma",
  );
});

test("favorite navigation can move forward and backward through favorites", () => {
  const songs = [
    { id: "alpha", favorite: true },
    { id: "beta", favorite: false },
    { id: "gamma", favorite: true },
    { id: "delta", favorite: true },
  ];

  assert.strictEqual(
    pickSongIdForFavoriteNavigation(songs, "alpha", "next"),
    "gamma",
  );
  assert.strictEqual(
    pickSongIdForFavoriteNavigation(songs, "gamma", "next"),
    "delta",
  );
  assert.strictEqual(
    pickSongIdForFavoriteNavigation(songs, "delta", "next"),
    "alpha",
  );
  assert.strictEqual(
    pickSongIdForFavoriteNavigation(songs, "delta", "previous"),
    "gamma",
  );
  assert.strictEqual(
    pickSongIdForFavoriteNavigation(songs, "beta", "previous"),
    "alpha",
  );
});

test("favorite songs sort to the top of the saved songs list", () => {
  storageMock.clear();
  songsStore.clearAll();

  songsStore.importSource(
    "irealbook://Beta Study=Doe Jane=Medium Swing=C=n=[*AT44C7 Z",
  );
  songsStore.importSource(
    "irealbook://Alpha Study=Doe Jane=Medium Swing=C=n=[*AT44C7 Z",
  );

  const beforeFavorite = songsStore.listSongs().map((song) => song.title);
  assert.deepStrictEqual(
    beforeFavorite,
    ["Alpha Study", "Beta Study"],
    "songs should sort alphabetically before any favorites are set",
  );

  const beta = songsStore
    .listSongs()
    .find((song) => song.title === "Beta Study");
  assert(beta, "beta song should exist");
  songsStore.setFavorite(beta.id, true);

  const afterFavorite = songsStore.listSongs().map((song) => ({
    title: song.title,
    favorite: song.favorite,
  }));
  assert.deepStrictEqual(afterFavorite, [
    { title: "Beta Study", favorite: true },
    { title: "Alpha Study", favorite: false },
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
