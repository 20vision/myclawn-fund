#!/usr/bin/env node
// Runs hourly. 1) Checks new listings are public and licensed. 2) Counts real pull requests per project. 3) Logs the funnel.
// Exits non-zero on failure, so the task panel shows red.
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
const HOME = process.env.HOME, DIR = new URL('..', import.meta.url).pathname;
const TOKEN = /ADMIN_TOKEN=(\S+)/.exec(readFileSync(`${HOME}/.config/tokenfund/env`, 'utf8'))[1];
const API = 'https://tokenfund.myclawn.com';
const admin = async (path, body) => {
  const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'tokenfund-loop' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};
const gh = (...a) => JSON.parse(execFileSync('gh', ['api', ...a], { encoding: 'utf8', maxBuffer: 2e7 }));
const review = async p => {
  const r = gh(`repos/${p.owner}/${p.repo}`);
  const problems = [];
  if (r.private) problems.push('private');
  if (r.fork) problems.push('fork');
  if (r.archived) problems.push('archived');
  if (!r.license || r.license.spdx_id === 'NOASSERTION') problems.push('no open source license');
  if (problems.length) return admin('/admin/review', { slug: p.slug, status: 'rejected', note: problems.join(', ') });
  let image = '';
  if (p.image_path && /^[\w./-]+\.(png|jpe?g|webp)$/i.test(p.image_path) && !p.image_path.includes('..')) {
    const sha = gh(`repos/${p.owner}/${p.repo}/commits/${r.default_branch}`).sha; // pinned, so the picture can't change after review
    image = `https://raw.githubusercontent.com/${p.owner}/${p.repo}/${sha}/${p.image_path}`;
  }
  return admin('/admin/review', { slug: p.slug, status: 'live', note: 'checked', image });
};
// Shrinks the pinned GitHub image and serves it from our edge: full-size screenshots took 1.7 s to load.
const shrink = async p => {
  const r = await fetch(p.image); if (!r.ok) throw new Error(`image ${p.slug}: ${r.status}`);
  const py = "import sys,io,base64;from PIL import Image;i=Image.open(io.BytesIO(sys.stdin.buffer.read()));i.thumbnail((800,800));i=i.convert('RGB');o=io.BytesIO();i.save(o,'WEBP',quality=78,method=6);sys.stdout.write(base64.b64encode(o.getvalue()).decode())";
  const data = execFileSync('python3', ['-I', '-c', py], { input: Buffer.from(await r.arrayBuffer()), encoding: 'utf8', maxBuffer: 2e7 });
  await admin('/admin/image', { slug: p.slug, data, image: `/img/${p.slug}?v=${/\/([0-9a-f]{40})\//.exec(p.image)[1].slice(0, 8)}` });
  console.log('shrunk', p.slug, Math.round(data.length * .75 / 1024), 'KB');
};
const projects = await admin('/admin/projects');
// Structural facts only (public, license, not a fork). Nobody judges content here: agents and reports do that.
for (const p of projects.filter(p => p.status === 'live' && p.note === '' )) await review(p);
const after = await admin('/admin/projects');
for (const p of after.filter(p => p.status === 'live')) {
  const tasks = p.context.split('\n').filter(l => /^\s*[-*] /.test(l)).map(l => l.replace(/^\s*[-*] /, '').trim()).filter(l => l.length > 4);
  if (tasks.length) await admin('/admin/seed', { slug: p.slug, tasks });
}
for (const p of after.filter(p => p.status === 'live' && p.image.startsWith('https://raw.githubusercontent.com/'))) await shrink(p);
// Credit rules live here because this is where GitHub, not the contributor, supplies the facts.
const ageOk = u => Date.now() - new Date(gh(`users/${u}`).created_at).getTime() > 30 * 864e5;
const seen = new Set();
const bySlug = Object.fromEntries(after.map(p => [p.slug, p]));
for (const r of await admin('/admin/receipts')) {
  const p = bySlug[r.slug]; if (!p) continue;
  const pr = gh(`repos/${p.owner}/${p.repo}/pulls/${r.pr}`), user = pr.user.login;
  const day = `${user}|${r.slug}|${new Date(r.created_at).toISOString().slice(0, 10)}`;
  let status;
  if (!(pr.body || '').includes(`session ${r.session}`)) status = 'no_marker';
  else if (user.toLowerCase() === p.owner.toLowerCase()) status = 'self';
  else if (!ageOk(user)) status = 'young_account';
  else if (seen.has(day)) status = 'daily_limit';
  else status = pr.merged_at ? 'merged' : pr.state === 'open' ? 'open' : 'closed';
  if (['open', 'merged'].includes(status)) seen.add(day);
  if (status !== r.status) await admin('/admin/receipt', { session: r.session, slug: r.slug, status, gh_user: user });
}
// GitHub's facts for reputation are read here, with our own login, so a contributor can't supply them.
for (const i of await admin('/admin/identities')) {
  const u = gh(`users/${i.login}`);
  const t = new Date(u.created_at).getTime();
  if (t !== i.gh_created || u.followers !== i.followers || (u.twitter_username || '') !== i.x_handle) await admin('/admin/identity', { login: i.login, gh_created: t, followers: u.followers, repos: u.public_repos, x_handle: u.twitter_username || '' });
}
const final = await admin('/admin/projects');
const rows = final.filter(p => p.status === 'live').map(p => ({ slug: p.slug, copies: p.copies, sessions: p.sessions, open: p.prs_open, merged: p.prs_merged, tokens_open: p.tokens_open, tokens_merged: p.tokens_merged }));
const status = { at: new Date().toISOString(), summary: '', ok: true, live: rows.length, pending: after.filter(p => p.status === 'pending').length, rejected: after.filter(p => p.status === 'rejected').length, funnel: rows, totals: rows.reduce((a, r) => ({ copies: a.copies + r.copies, sessions: a.sessions + r.sessions, prs: a.prs + r.open + r.merged, merged: a.merged + r.merged, tokens: a.tokens + r.tokens_open + r.tokens_merged }), { copies: 0, sessions: 0, prs: 0, merged: 0, tokens: 0 }) };
status.summary = `${status.live} live, ${status.pending} in review, ${status.totals.sessions} sessions, ${status.totals.merged} merged`;
mkdirSync(`${DIR}logs`, { recursive: true });
writeFileSync(`${DIR}logs/status.json`, JSON.stringify(status, null, 1));
appendFileSync(`${DIR}logs/metrics.jsonl`, JSON.stringify(status) + '\n');
console.log(new Date().toISOString(), JSON.stringify(status.totals), `live=${status.live} pending=${status.pending} rejected=${status.rejected}`);
