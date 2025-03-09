-- Drop the existing collaborator table
DROP TABLE IF EXISTS collaborator_backup;

-- Create a backup of the current table
CREATE TABLE collaborator_backup AS SELECT * FROM collaborator;

-- Drop the original table
DROP TABLE collaborator;

-- Create the table with the correct schema
CREATE TABLE `collaborator` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `type` text NOT NULL,
    `installation_id` integer NOT NULL,
    `owner_id` integer NOT NULL,
    `repo_id` integer,
    `owner` text NOT NULL,
    `repo` text NOT NULL,
    `branch` text,
    `email` text,
    `github_username` text,
    `invitation_id` integer,
    `invitation_status` text DEFAULT 'pending',
    `user_id` text,
    `status` text,
    `invited_by` text NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

-- Copy data from the backup table to the new table
INSERT INTO collaborator (
    id, type, installation_id, owner_id, repo_id, owner, repo, branch, 
    email, github_username, user_id, invited_by
)
SELECT 
    id, type, installation_id, owner_id, repo_id, owner, repo, branch, 
    email, github_username, user_id, invited_by
FROM collaborator_backup;

-- Drop the backup table
DROP TABLE collaborator_backup;
