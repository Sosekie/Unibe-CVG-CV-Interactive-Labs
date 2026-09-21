import assert from "node:assert/strict";
import test from "node:test";
import { clampZoom, horizontalDelta, wheelIntent, wheelPixels } from "../lib/page-navigation.ts";
import { getVoterId } from "../lib/voter-session.ts";

test("wheel modifiers keep ordinary scrolling and give zoom priority over Shift", () => {
  assert.equal(wheelIntent({ ctrlKey: false, metaKey: false, shiftKey: false }), "scroll");
  assert.equal(wheelIntent({ ctrlKey: false, metaKey: false, shiftKey: true }), "horizontal");
  assert.equal(wheelIntent({ ctrlKey: true, metaKey: false, shiftKey: true }), "zoom");
  assert.equal(wheelIntent({ ctrlKey: false, metaKey: true, shiftKey: true }), "zoom");
  assert.deepEqual(wheelPixels({ deltaX: 2, deltaY: 3, deltaMode: 1 }, 600), { x: 32, y: 48 });
  assert.deepEqual(wheelPixels({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 600), { x: 0, y: 600 });
  assert.equal(horizontalDelta(0, -30), -30);
  assert.equal(horizontalDelta(40, 10), 40);
  assert.equal(clampZoom(10), 50);
  assert.equal(clampZoom(999), 200);
  assert.equal(clampZoom(NaN), 100);
});

test("voter identity survives denied browser storage for the session", () => {
  const blocked = { getItem() { throw new Error("Storage denied"); }, setItem() { throw new Error("Storage denied"); } };
  const id = getVoterId(blocked);
  assert.ok(id.length > 0);
  assert.equal(getVoterId(blocked), id);
  const readOnly = { getItem() { return null; }, setItem() { throw new Error("Quota exceeded"); } };
  assert.equal(getVoterId(readOnly), id);
  assert.equal(getVoterId({ getItem() { return "existing-browser"; }, setItem() { assert.fail(); } }), "existing-browser");
});
