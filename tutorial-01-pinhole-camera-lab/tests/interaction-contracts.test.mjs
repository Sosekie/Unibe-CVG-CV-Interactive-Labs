import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const questionsSource = await readFile(new URL("../components/questions-section.tsx", import.meta.url), "utf8");
const teacherSource = await readFile(new URL("../components/teacher-dashboard.tsx", import.meta.url), "utf8");
const tutorialSource = await readFile(new URL("../lib/tutorial-questions.ts", import.meta.url), "utf8");
const teacherPageSource = await readFile(new URL("../app/teacher/page.tsx", import.meta.url), "utf8");
const teacherRouteSource = await readFile(new URL("../app/api/teacher/questions/route.ts", import.meta.url), "utf8");

test("student and teacher views refresh live data while visible", () => {
  assert.match(questionsSource, /REFRESH_INTERVAL_MS = 5000/);
  assert.match(questionsSource, /visibilitychange/);
  assert.match(teacherSource, /REFRESH_INTERVAL_MS = 5000/);
  assert.match(teacherSource, /visibilitychange/);
});

test("teacher ranking sorts by votes with tutorial order as the tie-breaker", () => {
  assert.match(tutorialSource, /second\.votes - first\.votes \|\| first\.sortOrder - second\.sortOrder/);
});

test("voting and publishing controls have question-specific accessible names", () => {
  assert.match(questionsSource, /Vote for question \$\{question\.sortOrder\}: \$\{question\.prompt\}/);
  assert.match(teacherSource, /answer for question \$\{question\.sortOrder\}: \$\{question\.prompt\}/);
});

test("teacher page and API both enforce the same owner allowlist", () => {
  assert.match(teacherPageSource, /const teacherEmail = process\.env\.TEACHER_EMAIL\?\.toLowerCase\(\)/);
  assert.match(teacherPageSource, /user\.email\.toLowerCase\(\) !== teacherEmail/);
  assert.match(teacherRouteSource, /const TEACHER_EMAIL = process\.env\.TEACHER_EMAIL\?\.toLowerCase\(\)/);
  assert.match(teacherRouteSource, /user\?\.email\.toLowerCase\(\) === TEACHER_EMAIL/);
});
