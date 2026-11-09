// Shared legal pages (Terms, Privacy, Imprint) for 20Vision sites that run outside jobworks (Cloudflare Workers etc.).
// Copy this file into the site's src/ as legal.js and call legalResponse(cfg, path) for /terms, /privacy, /imprint.
// Paid jobworks products use ~/projects/jobworks/legal.mjs instead. Check every live site with bin/legal-check.
// cfg = { name, host, what, terms: [html paragraphs], collects: [html list items], processors: [html list items], css }
export const COMPANY = {
  name: '20Vision GmbH', street: 'Anisgasse 30', city: '1220 Vienna, Austria', cityDe: '1220 Wien, Österreich',
  fn: 'FN 578589t', court: 'Commercial Court Vienna (Handelsgericht Wien)', vat: 'ATU78179659', director: 'Alexander Hofer',
  purpose: 'Software development and online services', email: 'hello@myclawn.com', updated: 'November 9, 2026',
};
const C = COMPANY, mail = `<a href="mailto:${C.email}">${C.email}</a>`;
const provider = `${C.name}, ${C.street}, ${C.city}. Company register ${C.fn}, ${C.court}. VAT ID ${C.vat}. Email ${mail}.`;
const links = '<p class="lg-links"><a href="/">Home</a> · <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a> · <a href="/imprint">Imprint</a></p>';
export const legalFooterLinks = '<a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/imprint">Imprint</a>';

export function legalHtml(cfg, kind) {
  if (kind === 'terms') return `<h1>Terms of Service</h1><p class="m">${cfg.name} · Last updated: ${C.updated}</p>
<h2>1. Who we are</h2><p>${cfg.name} (${cfg.host}) is operated by ${provider}</p>
<h2>2. The service</h2><p>${cfg.what}</p>${(cfg.terms || []).map(t => `<p>${t}</p>`).join('')}
<h2>3. No warranty</h2><p>The service is free and provided as is and as available. We may change, limit or stop it at any time. Content from third parties and AI tools can be wrong; check it before you rely on it.</p>
<h2>4. Liability</h2><p>We are liable without limit for intent and gross negligence, for personal injury, and wherever liability is mandatory by law. Otherwise, as far as the law allows, we are not liable for slight negligence. Nothing in these terms limits your rights under mandatory consumer law.</p>
<h2>5. Law and disputes</h2><p>Austrian law applies, excluding its conflict-of-law rules. If you are a consumer, you keep the protection of the mandatory law of the country where you live. For businesses, the courts of Vienna, Austria have exclusive jurisdiction.</p>
<h2>6. Changes</h2><p>We may update these terms; the date above shows the current version. Contact: ${mail}.</p>${links}`;
  if (kind === 'privacy') return `<h1>Privacy Policy</h1><p class="m">${cfg.name} · Last updated: ${C.updated}</p>
<h2>Controller</h2><p>${provider}</p>
<h2>What we process and why</h2><ul>${(cfg.collects || []).map(x => `<li>${x}</li>`).join('')}
<li><b>Usage analytics</b>: our own cookieless analytics (t.myclawn.com) records page views and clicks with an anonymous visitor id. No ad pixels, no third-party tracking cookies (Art. 6(1)(f) GDPR, legitimate interest in improving the site).</li>
<li><b>Server logs</b>: IP address and request data for security and abuse prevention, kept briefly (Art. 6(1)(f)).</li></ul>
<h2>Where your data goes (processors)</h2><ul><li><b>Cloudflare, Inc.</b> (USA): hosting, database and delivery of this site.</li>${(cfg.processors || []).map(x => `<li>${x}</li>`).join('')}</ul>
<p>Transfers to the USA rely on the EU-US Data Privacy Framework where the recipient is certified, and otherwise on the EU Standard Contractual Clauses.</p>
<h2>Your rights</h2><p>You can ask for access, correction, deletion, restriction, data portability, and object to processing based on legitimate interest: email ${mail}. You can also complain to the Austrian Data Protection Authority (Datenschutzbehörde, Barichgasse 40-42, 1030 Vienna, dsb.gv.at) or the authority where you live.</p>${links}`;
  return `<h1>Imprint</h1><p class="m">Legal notice under § 5 ECG, § 14 UGB and § 25 MedienG (Austria)</p>
<p><b>${C.name}</b><br>${C.street}<br>${C.cityDe}</p><p>Email: ${mail}</p>
<p>Company register: ${C.fn}, ${C.court}<br>VAT ID: ${C.vat}<br>Managing director: ${C.director}<br>Line of business: ${C.purpose}</p>
<p>Media owner (§ 25 MedienG): ${C.name}, Vienna. Purpose of this website: ${cfg.what}</p>${links}`;
}

const TITLES = { '/terms': ['terms', 'Terms of Service'], '/privacy': ['privacy', 'Privacy Policy'], '/imprint': ['imprint', 'Imprint'], '/impressum': ['imprint', 'Imprint'] };
export function legalResponse(cfg, path) {
  const t = TITLES[path]; if (!t) return null;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t[1]} · ${cfg.name}</title><meta name="robots" content="noindex,follow"><style>body{margin:0;background:#fff;color:#1b1d22;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}main{max-width:720px;margin:0 auto;padding:32px 20px 60px}h1{font-size:32px;margin:0 0 6px}h2{font-size:19px;margin:28px 0 6px}.m{color:#666}a{color:inherit}.lg-links{margin-top:36px;color:#666;font-size:14px}</style></head><body><main>${legalHtml(cfg, t[0])}</main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
