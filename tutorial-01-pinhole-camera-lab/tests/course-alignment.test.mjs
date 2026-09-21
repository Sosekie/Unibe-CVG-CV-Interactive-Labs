import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const questionsSource = await readFile(new URL("../lib/tutorial-questions.ts", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const questionsRoute = await readFile(new URL("../app/api/questions/route.ts", import.meta.url), "utf8");
const votesRoute = await readFile(new URL("../app/api/votes/route.ts", import.meta.url), "utf8");

test("uses the seven canonical Tutorial 01 perspective questions", () => {
  const ids = questionsSource.match(/id: "tutorial01-[^"]+"/g) ?? [];
  assert.equal(ids.length, 7);
  assert.match(questionsSource, /straight lines in 3D space/);
  assert.match(questionsSource, /angles are not preserved/);
  assert.match(questionsSource, /3D plane that corresponds to the horizon/);
  assert.doesNotMatch(questionsSource, /perspective projection of an opaque sphere/);
  assert.match(questionsSource, /vanishing point/);
  assert.match(questionsSource, /inArray\(questions\.id, tutorialQuestionIds\)/);
  assert.doesNotMatch(questionsSource, /fov-focal-length|distance-scale|principal-point|vanishing-points/);
});

test("states the signed physical-image-plane convention in the UI", () => {
  assert.match(pageSource, /z = −f/);
  assert.match(pageSource, /yₛ = cᵧ − f · Y \/ Z/);
  assert.match(pageSource, /physical sensor convention/);
  assert.match(pageSource, /yᵥ = fY\/Z/);
  assert.match(pageSource, /each side uses its own uniform scale/);
  assert.match(pageSource, /object endpoints ↔ camera centre/);
});

test("public API errors do not expose database exception messages", () => {
  assert.doesNotMatch(questionsRoute, /error instanceof Error/);
  assert.doesNotMatch(votesRoute, /error instanceof Error/);
  assert.match(questionsRoute, /Could not load questions\./);
  assert.match(votesRoute, /Could not submit vote\./);
});
