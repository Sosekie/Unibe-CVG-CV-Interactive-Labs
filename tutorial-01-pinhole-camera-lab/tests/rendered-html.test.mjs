import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the static export contains the student and teacher pages", async () => {
  // npm test builds first; scripts/export-site.mjs collects the pages into out/.
  const student = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const teacher = await readFile(new URL("../out/teacher/index.html", import.meta.url), "utf8");
  assert.match(student, /<title>Pinhole Camera Lab<\/title>/);
  assert.match(student, /<link rel="icon" href="[^"]*\/favicon\.svg"/);
  assert.match(teacher, /Sign in to see the votes/);
});
