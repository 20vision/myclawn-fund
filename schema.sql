CREATE TABLE IF NOT EXISTS projects(
 slug TEXT PRIMARY KEY, owner TEXT NOT NULL, repo TEXT NOT NULL, title TEXT NOT NULL, vision TEXT NOT NULL,
 context TEXT NOT NULL, image TEXT DEFAULT '', image_path TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
 note TEXT DEFAULT '', created_at INTEGER NOT NULL, reviewed_at INTEGER,
 copies INTEGER DEFAULT 0, sessions INTEGER DEFAULT 0, prs_open INTEGER DEFAULT 0, prs_merged INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS events(slug TEXT, day TEXT, who TEXT, kind TEXT, PRIMARY KEY(slug,day,who,kind));
CREATE TABLE IF NOT EXISTS images(slug TEXT PRIMARY KEY, data TEXT);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, slug TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS receipts(session TEXT PRIMARY KEY, slug TEXT, pr INTEGER, tokens INTEGER, model TEXT, status TEXT, gh_user TEXT DEFAULT '', created_at INTEGER);
CREATE TABLE IF NOT EXISTS identities(login TEXT PRIMARY KEY, key_hash TEXT, gh_created INTEGER, followers INTEGER DEFAULT 0, repos INTEGER DEFAULT 0, x_handle TEXT DEFAULT '', strikes INTEGER DEFAULT 0, banned INTEGER DEFAULT 0, created_at INTEGER);
CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY, created_at INTEGER);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, target TEXT, reporter TEXT, reason TEXT, evidence TEXT, status TEXT DEFAULT 'open', created_at INTEGER, UNIQUE(kind,target,reporter));
CREATE TABLE IF NOT EXISTS votes(report_id INTEGER, voter TEXT, vote TEXT, weight REAL, PRIMARY KEY(report_id,voter));
CREATE TABLE IF NOT EXISTS audits(slug TEXT, sha TEXT, login TEXT, verdict TEXT, summary TEXT, created_at INTEGER, PRIMARY KEY(slug,sha,login));
CREATE TABLE IF NOT EXISTS actions(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, login TEXT, action TEXT, note TEXT, created_at INTEGER);
CREATE INDEX IF NOT EXISTS actions_slug ON actions(slug,created_at);
ALTER TABLE projects ADD COLUMN build_tokens INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN chat TEXT DEFAULT ''; ALTER TABLE projects ADD COLUMN links TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN blocked TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS pledges(login TEXT, slug TEXT, weekly INTEGER, created_at INTEGER, stopped_at INTEGER DEFAULT 0, PRIMARY KEY(login, slug));
ALTER TABLE sessions ADD COLUMN task INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN reports INTEGER DEFAULT 0;
