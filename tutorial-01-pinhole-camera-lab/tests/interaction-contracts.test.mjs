import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const questionsSource = await readFile(new URL("../components/questions-section.tsx", import.meta.url), "utf8");
const teacherSource = await readFile(new URL("../components/teacher-dashboard.tsx", import.meta.url), "utf8");
const teacherPageSource = await readFile(new URL("../app/teacher/page.tsx", import.meta.url), "utf8");
const teacherAppSource = await readFile(new URL("../components/teacher-app.tsx", import.meta.url), "utf8");

test("student and teacher views refresh live data while visible", () => {
  assert.match(questionsSource, /REFRESH_INTERVAL_MS = 10000/);
  assert.match(questionsSource, /visibilitychange/);
  assert.match(teacherSource, /REFRESH_INTERVAL_MS = 5000/);
  assert.match(teacherSource, /visibilitychange/);
});

test("teacher ranking sorts by votes with tutorial order as the tie-breaker", () => {
  assert.match(teacherSource, /second\.votes - first\.votes \|\| first\.sortOrder - second\.sortOrder/);
});

test("voting and publishing controls have question-specific accessible names", () => {
  assert.match(questionsSource, /Vote for question \$\{question\.sortOrder\}: \$\{question\.prompt\}/);
  assert.match(teacherSource, /answer for question \$\{question\.sortOrder\}: \$\{question\.prompt\}/);
});

test("the static teacher page shows the dashboard only after GitHub sign-in on the course server", () => {
  assert.match(teacherPageSource, /<TeacherApp \/>/);
  assert.match(teacherAppSource, /if \(session\) return <TeacherDashboard/);
  assert.match(teacherAppSource, /teacherSignInUrl\(\)/);
});
