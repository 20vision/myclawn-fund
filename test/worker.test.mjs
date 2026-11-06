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
const { parseFile, tokensFrom, codexTokensFrom, CAP } = new Function(
  `${slice('function parseFile', 'async function submit')}
   ${slice('const CAP', 'const newSession')}
   ${slice('function tokensFrom', 'async function receipt')}
   return { parseFile, tokensFrom, codexTokensFrom, CAP };`
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
  assert.deepEqual(f, { title: '', vision: '', image: '', model: '', location: '', chat: '', links: '', block: '', context: 'just text', state: 'open', maxOpen: -1 });
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

test('page JavaScript parses (one stray quote kills every button)', () => {
  const start = src.indexOf('const JS = `') + 'const JS = `'.length;
  const js = src.slice(start, src.indexOf('`;', start)).replace(/\\(.)/g, '$1');
  assert.doesNotThrow(() => new Function(js));
});

test('/list agent instructions include the template and the submit call', () => {
  const ORIGIN = 'https://tokenfund.myclawn.com';
  const TEMPLATE = new Function(`${slice('const TEMPLATE', 'const listText')}; return TEMPLATE;`)();
  const listText = new Function('ORIGIN', 'TEMPLATE', `${slice('const listText', 'const submitPage')}; return listText;`)(ORIGIN, TEMPLATE);
  const t = listText();
  assert.match(t, /# My Project\nVision:/);
  assert.match(t, /POST https:\/\/tokenfund\.myclawn\.com\/api\/submit/);
  assert.ok(!t.includes('${'));
});

test('parseFile reads the Block line and keeps it out of the context', () => {
  const f = parseFile('# P\nVision: v\nBlock: @bad-user, other\nreal context');
  assert.equal(f.block, '@bad-user, other');
  assert.equal(f.context, 'real context');
});

test('parseFile reads owner controls and keeps them out of the context', () => {
  const f = parseFile('# P\nVision: v\nStatus: Paused\nMax open PRs: 3\nctx');
  assert.equal(f.state, 'paused'); assert.equal(f.maxOpen, 3); assert.equal(f.context, 'ctx');
  assert.equal(parseFile('Status: whatever').state, 'open');
});

// Shape from the Codex docs (developers.openai.com/codex/noninteractive) and codex-rs/exec/src/exec_events.rs.
const CODEX_DOC = '{"type":"turn.completed","usage":{"input_tokens":24763,"cached_input_tokens":24448,"output_tokens":122,"reasoning_output_tokens":0}}';

test('codexTokensFrom counts non-cached input plus output from the documented turn.completed', () => {
  assert.deepEqual(codexTokensFrom(CODEX_DOC), { total: 24763 - 24448 + 122, model: '' });
});

test('codexTokensFrom takes the last running total, not the sum, and ignores cache writes and reasoning', () => {
  const a = '{"type":"turn.completed","usage":{"input_tokens":1000,"cached_input_tokens":0,"output_tokens":10,"reasoning_output_tokens":5}}';
  const b = '{"type":"turn.completed","usage":{"input_tokens":5000,"cached_input_tokens":3000,"cache_write_input_tokens":900,"output_tokens":50,"reasoning_output_tokens":40}}';
  assert.equal(codexTokensFrom(a + '\n' + b + '\n').total, 2050);
});

test('codexTokensFrom rejects other events, junk and missing usage', () => {
  assert.equal(codexTokensFrom(''), null);
  assert.equal(codexTokensFrom('{"type":"thread.started","thread_id":"x"}'), null);
  assert.equal(codexTokensFrom('{"type":"turn.completed"}'), null);
  assert.equal(codexTokensFrom('not json'), null);
  assert.equal(codexTokensFrom('{"modelUsage":{"m":{"inputTokens":5}}}'), null);
});

test('codexTokensFrom ignores negative and non-numeric values, never counts cached reads, and caps at CAP', () => {
  assert.equal(codexTokensFrom('{"type":"turn.completed","usage":{"input_tokens":-9,"cached_input_tokens":0,"output_tokens":"7"}}').total, 0);
  assert.equal(codexTokensFrom('{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":9000000,"output_tokens":3}}').total, 3);
  assert.equal(codexTokensFrom(`{"type":"turn.completed","usage":{"input_tokens":${10 * CAP},"cached_input_tokens":0,"output_tokens":0}}`).total, CAP);
});

test('runner script is valid bash and knows both harnesses', async () => {
  const { execFileSync } = await import('node:child_process');
  const r = (await import('node:fs')).readFileSync(new URL('../src/runner.sh.txt', import.meta.url), 'utf8');
  assert.match(r, /HARNESS="\$\{TF_HARNESS:-@@HARNESS@@\}"/);
  assert.match(r, /codex\) AGENT=Codex/);
  assert.match(r, /\?h=\$HARNESS/);
  execFileSync('bash', ['-n', '-c', r]);
});
