import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("includes development preview metadata in the server build", async () => {
  // Vinext's Cloudflare bundle imports the cloudflare:workers virtual module,
  // so plain Node cannot execute it. Inspect the successful server build
  // instead of importing a runtime that only exists in Workers.
  const source = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.match(source, /codex-preview/);
  assert.match(source, /development/);
});
