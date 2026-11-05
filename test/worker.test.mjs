// Run with: node --test test/
// Pulls parseFile, CAP and tokensFrom out of src/worker.js so the worker stays unchanged and dependency-free.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const slice = (from, to) => {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  assert.ok(a >= 0 && b > a, `could not find ${from} in worker.js`);
  return src.slice(a, b);
};
const { parseFile, tokensFrom, CAP } = new Function(
  `${slice('function parseFile', 'async function submit')}
   ${slice('const CAP', 'const newSession')}
   ${slice('function tokensFrom', 'async function receipt')}
   return { parseFile, tokensFrom, CAP };`
)();

test('parseFile reads title, vision, image, model and context', () => {
  const f = parseFile('# My Project\nVision: Make things.\nImage: https://x.test/a.png\nModel: claude-opus-5-5\n\nDo this work.\nAnd this.');
  assert.equal(f.title, 'My Project');
  assert.equal(f.vision, 'Make things.');
  assert.equal(f.image, 'https://x.test/a.png');
  assert.equal(f.model, 'claude-opus-5-5');
  assert.equal(f.context, 'Do this work.\nAnd this.');
});

test('parseFile keys are case-insensitive and CRLF is handled', () => {
  const f = parseFile('# T\r\nVISION: v\r\nmodel: m1\r\nbody');
  assert.equal(f.vision, 'v');
  assert.equal(f.model, 'm1');
  assert.equal(f.context, 'body');
});

test('parseFile returns empty strings when fields are missing', () => {
  const f = parseFile('just text');
  assert.deepEqual(f, { title: '', vision: '', image: '', model: '', context: 'just text' });
});

test('parseFile keeps the first title and ## headings stay in the context', () => {
  const f = parseFile('# First\n# Second\n## Good first work\nstuff');
  assert.equal(f.title, 'First');
  assert.equal(f.context, '## Good first work\nstuff');
});

test('tokensFrom sums input, output and cache creation tokens', () => {
  const t = tokensFrom({ modelUsage: { 'claude-opus-5-5': { inputTokens: 10, outputTokens: 20, cacheCreationInputTokens: 5 } } });
  assert.deepEqual(t, { total: 35, model: 'claude-opus-5-5' });
});

test('tokensFrom ignores cache reads', () => {
  const t = tokensFrom({ modelUsage: { m: { inputTokens: 1, outputTokens: 1, cacheReadInputTokens: 9_000_000 } } });
  assert.equal(t.total, 2);
});

test('tokensFrom ignores negative, NaN and non-numeric values', () => {
  const t = tokensFrom({ modelUsage: { m: { inputTokens: -500, outputTokens: NaN, cacheCreationInputTokens: '7' } } });
  assert.equal(t.total, 0);
});

test('tokensFrom caps one session at CAP', () => {
  const t = tokensFrom({ modelUsage: { m: { inputTokens: 10 * CAP } } });
  assert.equal(t.total, CAP);
});

test('tokensFrom counts only models matching the required one', () => {
  const run = { modelUsage: { 'claude-haiku-5-5': { inputTokens: 100 }, 'claude-opus-5-5': { inputTokens: 40, outputTokens: 2 } } };
  assert.deepEqual(tokensFrom(run, 'opus'), { total: 42, model: 'claude-opus-5-5' });
  assert.equal(tokensFrom(run, 'sonnet').total, 0);
});

test('tokensFrom sums across models when none is required and reports the biggest', () => {
  const t = tokensFrom({ modelUsage: { a: { inputTokens: 100 }, b: { inputTokens: 30 } } });
  assert.equal(t.total, 130);
  assert.equal(t.model, 'a');
});

test('tokensFrom returns null for missing or malformed usage', () => {
  assert.equal(tokensFrom(null), null);
  assert.equal(tokensFrom({}), null);
  assert.equal(tokensFrom({ modelUsage: 'x' }), null);
});
