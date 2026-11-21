import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root));

test('each indoor example has aligned depth and point-map arrays', async () => {
  for (const i of [0, 1, 2]) {
    for (const suffix of ['reference', 'da2', 'moge']) {
      const b = await read(`dist/assets/nyu${i}-${suffix}.f32`);
      assert.equal(b.length, 160 * 120 * 4);
      const values = Array.from({length: 160 * 120}, (_, j) => b.readFloatLE(j * 4));
      assert.ok(values.filter(Number.isFinite).length > 18000);
    }
    const xyz = await read(`dist/assets/nyu${i}-moge-xyz.f32`);
    assert.equal(xyz.length, 160 * 120 * 3 * 4);
    assert.ok((await stat(new URL(`dist/assets/nyu${i}-rgb.png`, root))).size > 1000);
  }
});

test('the published page links to its two handouts and includes the paper assets', async () => {
  const html = await read('dist/index.html');
  for (const path of ['materials/exercises.pdf', 'materials/solutions.pdf']) {
    assert.ok(html.includes(path));
    assert.ok((await read(`dist/${path}`)).subarray(0, 5).equals(Buffer.from('%PDF-')));
  }
  for (const name of ['paper-dis-input.jpg','paper-dis-pro.jpg','paper-dis-da.jpg','paper-am-input.jpg','paper-am-pro.jpg','paper-am-da.jpg','moge-paper-refinement.png','moge-paper-ablation.png']) {
    assert.ok((await stat(new URL(`dist/assets/${name}`, root))).size > 1000);
  }
});

test('the question source contains every question once and its worked answers', async () => {
  const tex = (await read('materials/source/tex/tutorial_content.tex')).toString();
  for (const id of ['1.1','1.2','2.1','2.2','3.1','3.2','3.3','4.1','4.2','4.3']) {
    assert.ok(tex.includes(`\\subsubsection*{${id}}`));
  }
  assert.equal((tex.match(/\\textbf\{Solution \(a\)\.\}/g) || []).length, 10);
  assert.equal((tex.match(/\\textbf\{Solution \(b\)\.\}/g) || []).length, 10);
  assert.ok(tex.includes('https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-11/'));
});
