import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Votes and releases live in the course API (api/ in this repository), which has
// its own tests for owner-only, reversible release. These tests cover the page.
const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false },
});
after(async () => { await vite.close(); delete globalThis.window; });

const { tutorialQuestions, tutorialSlug } = await vite.ssrLoadModule("/lib/question-bank.ts");
const { tutorialAnswers } = await vite.ssrLoadModule("/lib/tutorial-answers.ts");
const { AnswerExplanation } = await vite.ssrLoadModule("/components/answer-explanation.tsx");
const questionIds = tutorialQuestions.map((question) => question.id);

test("the static student page shows every question but no answer before the course API releases one", async () => {
  assert.equal(tutorialSlug, "tutorial-01");
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  for (const question of tutorialQuestions) assert.ok(html.includes(question.prompt), `missing prompt ${question.id}`);
  for (const explanation of Object.values(tutorialAnswers)) assert.equal(html.includes(explanation.illustration.title), false, "explanations appear only after release");
  assert.match(html, /Think first/);
});

test("teacher sign-in is read once from the URL fragment, kept for later visits and cleared on sign-out", async () => {
  const stored = new Map();
  const cleanUrls = [];
  globalThis.window = {
    location: { hash: "#teacher_token=abc.def&login=Sosekie", pathname: "/tutorial-01/teacher/", search: "", href: "http://localhost:3000/tutorial-01/teacher/#teacher_token=abc.def&login=Sosekie" },
    history: { replaceState: (_state, _title, url) => cleanUrls.push(url) },
    localStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
  };
  const api = await vite.ssrLoadModule("/lib/labs-api.ts");
  assert.deepEqual(api.serverTeacherSessionState(), { session: null, message: "", ready: false });
  const state = api.teacherSessionState();
  assert.deepEqual(state, { session: { token: "abc.def", login: "Sosekie" }, message: "", ready: true });
  assert.equal(api.teacherSessionState(), state, "the snapshot stays stable for useSyncExternalStore");
  assert.deepEqual(cleanUrls, ["/tutorial-01/teacher/"], "the token is removed from the address bar");
  assert.equal(JSON.parse(stored.get("cv-labs-teacher-session")).login, "Sosekie");
  api.signOutTeacher("You are signed out.");
  assert.deepEqual(api.teacherSessionState(), { session: null, message: "You are signed out.", ready: true });
  assert.equal(stored.size, 0);
  assert.match(api.signInErrorMessage("not_allowed", "a-student"), /a-student is not on the instructor list/);
});

test("all seven explanations render accessible figures and expandable reasoning", () => {
  assert.deepEqual(Object.keys(tutorialAnswers), questionIds);
  for (const [index, explanation] of Object.values(tutorialAnswers).entries()) {
    const html = renderToStaticMarkup(React.createElement(AnswerExplanation, { explanation, questionNumber: index + 1 }));
    assert.match(html, /<svg[^>]+role="img"/);
    assert.match(html, /<title id=/);
    assert.match(html, /<desc id=/);
    assert.match(html, /<details class="answer-derivation">/);
    assert.match(html, /Before we discuss/);
    assert.match(html, /principal point at \(0, 0\)/);
    assert.doesNotMatch(html, /NaN|undefined|Infinity/);
    const [xmin, xmax, ymin, ymax] = explanation.illustration.bounds;
    for (const point of [...explanation.illustration.lines.flatMap((line) => line.points), ...explanation.illustration.points.map((point) => point.at)]) {
      assert.ok(point[0] >= xmin && point[0] <= xmax && point[1] >= ymin && point[1] <= ymax, "diagram geometry stays inside its plot");
    }
  }
});

test("diagram samples independently match the course projection equations", () => {
  const project = ([x, y, z]) => [x / z, y / z];
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
  const closePoint = (a, b) => a.forEach((v, index) => close(v, b[index]));
  const straight = tutorialAnswers[questionIds[0]].illustration;
  straight.points.forEach((point, t) => closePoint(point.at, project([t, 1, 2 + t])));
  for (const line of straight.lines) for (const [x, y] of line.points) close(x + 2 * y, 1);
  closePoint(project([0, 0, 1]), project([0, 0, 2]));
  const v = [1, 0, 1], w = [1, 1, -1];
  close(v.reduce((sum, value, index) => sum + value * w[index], 0), 0);
  const angle = tutorialAnswers[questionIds[3]].illustration;
  closePoint(angle.lines[0].points[1], project([1, 0, 3]));
  closePoint(angle.lines[1].points[1], project([1, 1, 1]));
  const [a, b] = angle.lines.map((line) => line.points[1]);
  close(Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI, 45);
  const lengths = tutorialAnswers[questionIds[4]].illustration;
  close(lengths.lines[0].points[1][1] / lengths.lines[1].points[1][1], 2);
  const vanishing = tutorialAnswers[questionIds[6]].illustration;
  [-1, 1].forEach((a, index) => [0, 8].forEach((t, end) => closePoint(vanishing.lines[index].points[end], project([a + t, 0.5, 2 + t]))));
});

test("Q04 generated SVG preserves the measured 45 degree angle when resized", () => {
  const html = renderToStaticMarkup(React.createElement(AnswerExplanation, { explanation: tutorialAnswers[questionIds[3]], questionNumber: 4 }));
  assert.match(html, /preserveAspectRatio="xMidYMid meet"/);
  const vectors = [...html.matchAll(/<polyline points="([^"]+)"/g)].map((match) => {
    const [start, end] = match[1].split(" ").map((point) => point.split(",").map(Number));
    return [end[0] - start[0], end[1] - start[1]];
  });
  assert.equal(vectors.length, 2);
  for (const [width, height] of [[360, 290], [920, 250], [720, 580]]) {
    // SVG 'meet' applies one scale factor even when its viewport aspect changes.
    const scale = Math.min(width / 460, height / 290);
    const [a, b] = vectors.map((vector) => vector.map((value) => value * scale));
    const angle = Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI;
    assert.ok(Math.abs(angle - 45) < 1e-10);
  }
});
