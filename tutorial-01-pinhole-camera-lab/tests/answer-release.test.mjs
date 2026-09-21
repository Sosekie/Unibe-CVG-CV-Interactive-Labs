import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { readdir, readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(`
  CREATE TABLE questions (id TEXT PRIMARY KEY, prompt TEXT NOT NULL, answer TEXT NOT NULL, answer_published INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL);
  CREATE TABLE votes (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id TEXT NOT NULL, voter_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);
const writes = [];
globalThis.__answerTestDb = drizzle(async (sql, params, method) => {
  const statement = sqlite.prepare(sql);
  if (method === "run") { writes.push({ sql, params }); statement.run(...params); return { rows: [] }; }
  statement.setReturnArrays(true);
  return { rows: method === "get" ? statement.get(...params) : statement.all(...params) };
});
globalThis.__answerTestUser = null;
process.env.TEACHER_EMAIL = "teacher@example.test";
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false },
  plugins: [{
    name: "isolated-classroom-bindings", enforce: "pre",
    resolveId(id) {
      const normalized = id.replaceAll("\\", "/");
      if (normalized === `${root}/db` || normalized === "@/db") return "\0test-db";
      if (normalized === `${root}/app/chatgpt-auth` || normalized === "@/app/chatgpt-auth") return "\0test-auth";
    },
    load(id) {
      if (id === "\0test-db") return "export const getDb = () => globalThis.__answerTestDb;";
      if (id === "\0test-auth") return "export const getChatGPTUser = async () => globalThis.__answerTestUser;";
    },
  }],
});
after(async () => { await vite.close(); sqlite.close(); delete globalThis.__answerTestDb; delete globalThis.__answerTestUser; });

const repository = await vite.ssrLoadModule("/lib/tutorial-questions.ts");
const route = await vite.ssrLoadModule("/app/api/teacher/questions/route.ts");
const { tutorialAnswers } = await vite.ssrLoadModule("/lib/tutorial-answers.ts");
const { AnswerExplanation } = await vite.ssrLoadModule("/components/answer-explanation.tsx");
const put = (payload) => route.PUT(new Request("https://example.test/api/teacher/questions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));

test("classroom release is owner-only, atomic, reversible, and preserves votes", async () => {
  await repository.ensureTutorialQuestions();
  sqlite.prepare("INSERT INTO questions VALUES (?, ?, ?, ?, ?)").run("unrelated-question", "Other tutorial", "Other answer", 0, 99);
  sqlite.prepare("INSERT INTO votes (question_id, voter_id) VALUES (?, ?)").run(repository.tutorialQuestionIds[3], "student-a");
  const hidden = await repository.getStudentQuestions("student-a");
  assert.equal(hidden.length, 7);
  for (const question of hidden) {
    assert.equal(question.answerPublished, false);
    assert.equal(Object.hasOwn(question, "answer"), false);
    assert.equal(Object.hasOwn(question, "explanation"), false);
  }
  for (const user of [null, { email: "student@example.test" }]) {
    globalThis.__answerTestUser = user;
    assert.equal((await route.GET()).status, 401);
    assert.equal((await put({ scope: "all", published: true })).status, 401);
  }
  globalThis.__answerTestUser = { email: "teacher@example.test" };
  for (const payload of [null, [], {}, { scope: "all", published: "true" }, { scope: "all", questionId: repository.tutorialQuestionIds[0], published: true }, { questionId: 42, published: true }, { questionId: "unrelated-question", published: true }, { scope: "unknown", published: true }]) {
    assert.equal((await put(payload)).status, 400);
  }
  assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: "{" }))).status, 400);
  writes.length = 0;
  assert.equal((await put({ scope: "all", published: true })).status, 200);
  const publicationWrites = writes.filter(({ sql }) => sql.includes('set "answer_published"'));
  assert.equal(publicationWrites.length, 1, "all flags change in a single SQL statement");
  assert.equal(sqlite.prepare("SELECT answer_published FROM questions WHERE id = 'unrelated-question'").get().answer_published, 0);
  const released = await repository.getStudentQuestions("student-a");
  assert.equal(released.filter((question) => question.answerPublished && question.answer && question.explanation).length, 7);
  assert.equal(released[3].votes, 1);
  assert.equal(released[3].hasVoted, true);
  const teacherResponse = await route.GET();
  assert.equal(teacherResponse.headers.get("Cache-Control"), "no-store");
  const teacher = (await teacherResponse.json()).questions;
  assert.equal(teacher[0].sortOrder, 4, "vote rank must not replace the stable question number");
  assert.equal((await put({ questionId: repository.tutorialQuestionIds[0], published: false })).status, 200);
  const partial = await repository.getStudentQuestions();
  assert.equal(Object.hasOwn(partial[0], "explanation"), false);
  assert.equal(partial.filter((question) => question.answerPublished).length, 6);
  assert.equal((await put({ scope: "all", published: false })).status, 200);
  const reset = await repository.getStudentQuestions("student-a");
  assert.equal(reset.filter((question) => question.answerPublished).length, 0);
  assert.equal(reset[3].votes, 1);
  assert.equal((await repository.getTeacherQuestions()).filter((question) => question.explanation).length, 7, "owner can preview hidden answers");
});

test("all seven explanations render accessible figures and expandable reasoning", () => {
  assert.deepEqual(Object.keys(tutorialAnswers), repository.tutorialQuestionIds);
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
  const straight = tutorialAnswers[repository.tutorialQuestionIds[0]].illustration;
  straight.points.forEach((point, t) => closePoint(point.at, project([t, 1, 2 + t])));
  for (const line of straight.lines) for (const [x, y] of line.points) close(x + 2 * y, 1);
  closePoint(project([0, 0, 1]), project([0, 0, 2]));
  const v = [1, 0, 1], w = [1, 1, -1];
  close(v.reduce((sum, value, index) => sum + value * w[index], 0), 0);
  const angle = tutorialAnswers[repository.tutorialQuestionIds[3]].illustration;
  closePoint(angle.lines[0].points[1], project([1, 0, 3]));
  closePoint(angle.lines[1].points[1], project([1, 1, 1]));
  const [a, b] = angle.lines.map((line) => line.points[1]);
  close(Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI, 45);
  const lengths = tutorialAnswers[repository.tutorialQuestionIds[4]].illustration;
  close(lengths.lines[0].points[1][1] / lengths.lines[1].points[1][1], 2);
  const vanishing = tutorialAnswers[repository.tutorialQuestionIds[6]].illustration;
  [-1, 1].forEach((a, index) => [0, 8].forEach((t, end) => closePoint(vanishing.lines[index].points[end], project([a + t, 0.5, 2 + t]))));
});

test("downloadable client bundles do not contain hidden answer content", async () => {
  const directory = new URL("../dist/client/", import.meta.url);
  const files = await readdir(directory, { recursive: true });
  const javascript = (await Promise.all(files.filter((file) => file.endsWith(".js") || file.endsWith(".map")).map((file) => readFile(new URL(file.replaceAll("\\", "/"), directory), "utf8")))).join("\n");
  assert.ok(javascript.length > 1000);
  for (const explanation of Object.values(tutorialAnswers)) assert.equal(javascript.includes(explanation.illustration.title), false, "explanations are supplied by the authenticated/publication-gated API only");
});

test("Q04 generated SVG preserves the measured 45 degree angle when resized", () => {
  const html = renderToStaticMarkup(React.createElement(AnswerExplanation, { explanation: tutorialAnswers[repository.tutorialQuestionIds[3]], questionNumber: 4 }));
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
