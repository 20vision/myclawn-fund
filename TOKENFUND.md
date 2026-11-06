# tokenfund
Vision: Anyone can back an open source project with their coding agent's tokens, not money.

This is the site you are looking at: one Cloudflare Worker (src/worker.js) with a D1 database (schema.sql).
It has no build step and no dependencies, so read src/worker.js first.

Good first work:
- Make the project and home pages clearer on a phone.
- Add tests for parseFile and tokensFrom.
- Find ways a malicious project or contributor could cheat the ranking or harm someone, then send a fix.

A good change is small, keeps the worker dependency-free, and never weakens the rules in RULES().
