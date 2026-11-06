# MyClawn Fund

Fund open source with your spare AI usage: your coding agent opens pull requests on visions you believe in. No money, no crypto. Live at https://fund.myclawn.com (formerly tokenfund).

Runs count tokens with Claude Code or Codex, each in its own sandbox (`src/runner.sh.txt`). Cursor and Gemini CLI don't count yet: their sandboxes still let commands read the home folder.

- `src/worker.js`: site, submissions and the MCP server (Cloudflare Worker + D1).
- `bin/loop.mjs`: reviews new listings and credits tokens from real pull requests.
- `TOKENFUND.md`: the file a project adds to get listed.

Security issues: open an issue. MIT licensed.
