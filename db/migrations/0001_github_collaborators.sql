-- Migration to add GitHub collaborator fields to the collaborator table
ALTER TABLE collaborator ADD COLUMN github_username TEXT;
ALTER TABLE collaborator ADD COLUMN invitation_id INTEGER;
ALTER TABLE collaborator ADD COLUMN invitation_status TEXT DEFAULT 'pending';
-- Make email field optional
ALTER TABLE collaborator RENAME TO collaborator_old;
CREATE TABLE collaborator (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  installation_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  repo_id INTEGER,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT,
  email TEXT,
  github_username TEXT,
  invitation_id INTEGER,
  invitation_status TEXT DEFAULT 'pending',
  user_id TEXT REFERENCES user(id),
  status TEXT,
  invited_by TEXT NOT NULL REFERENCES user(id)
);
INSERT INTO collaborator (
  id, type, installation_id, owner_id, repo_id, owner, repo, branch, 
  email, user_id, status, invited_by
)
SELECT 
  id, type, installation_id, owner_id, repo_id, owner, repo, branch, 
  email, user_id, status, invited_by
FROM collaborator_old;
DROP TABLE collaborator_old;
