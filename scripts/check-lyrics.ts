// Run: node scripts/check-lyrics.ts  (Node strips the TS types)
import assert from "node:assert";
import { parseLyrics, activeLineIndex } from "../src/lib/lyrics.ts";

// plain text -> not synced, lines kept
const plain = parseLyrics("hello\nworld\n");
assert.equal(plain.synced, false);
assert.equal(plain.lines.length, 2);

// LRC -> synced, timestamps parsed and sorted
const lrc = parseLyrics("[00:10.50]second\n[00:01.00]first\n");
assert.equal(lrc.synced, true);
assert.equal(lrc.lines[0].text, "first");
assert.equal(lrc.lines[0].time, 1);
assert.equal(lrc.lines[1].time, 10.5);

// active line tracking
assert.equal(activeLineIndex(lrc.lines, 0), -1); // before first tag
assert.equal(activeLineIndex(lrc.lines, 5), 0);
assert.equal(activeLineIndex(lrc.lines, 11), 1);

// repeated tags on one line expand to multiple entries
const repeat = parseLyrics("[00:01.00][00:05.00]chorus\n");
assert.equal(repeat.lines.length, 2);

console.log("lyrics parser: all checks passed");
