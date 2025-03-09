"use server";

import { getAuth } from "@/lib/auth";
import { getInstallations, getInstallationRepos } from "@/lib/githubApp";
import { getUserToken } from "@/lib/token";
import { db, client } from "@/db";
import { and, eq, sql} from "drizzle-orm";
import { collaboratorTable } from "@/db/schema";
import { z } from "zod";
import { 
  inviteGitHubCollaborator, 
  validateGitHubUsername,
  cancelInvitation,
  removeCollaborator,
  checkInvitationStatus as checkGitHubInvitationStatus
} from "@/lib/utils/collaborator";

const handleAddCollaborator = async (prevState: any, formData: FormData) => {
	try {
		// Require GitHub authentication
		const { user } = await getAuth();
		if (!user || !user.githubId) throw new Error("You must be signed in with GitHub to invite collaborators.");

		// Validate owner and repo
		const ownerAndRepoValidation = z.object({
			owner: z.string().trim().min(1),
			repo: z.string().trim().min(1),
		}).safeParse({
			owner: formData.get("owner"),
			repo: formData.get("repo")
		});
		if (!ownerAndRepoValidation.success) throw new Error("Invalid owner and/or repo");

		const owner = ownerAndRepoValidation.data.owner;
		const repo = ownerAndRepoValidation.data.repo;

		// Validate GitHub username
		const usernameValidation = z.string().trim().min(1).safeParse(formData.get("username"));
		if (!usernameValidation.success) throw new Error("Invalid GitHub username");

		const username = usernameValidation.data;

		const token = await getUserToken();
  	if (!token) throw new Error("Token not found");

		// Validate that the GitHub username exists
		const isValidUsername = await validateGitHubUsername(token, username);
		if (!isValidUsername) throw new Error(`GitHub user "${username}" not found`);
		
		const installations = await getInstallations(token, [owner]);
		if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

		const installationRepos = await getInstallationRepos(token, installations[0].id, [repo]);
		if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);

		// Skip the database check for existing collaborators
		// GitHub's API will return an error if the user is already a collaborator

		// Invite via GitHub API
		let invitation;
		try {
			invitation = await inviteGitHubCollaborator(token, owner, repo, username);
		} catch (error: any) {
			// Handle GitHub API errors
			if (error.message && error.message.includes("already a collaborator")) {
				throw new Error(`${username} is already a collaborator on "${owner}/${repo}".`);
			}
			if (error.message && error.message.includes("invitation already exists")) {
				throw new Error(`${username} has already been invited to "${owner}/${repo}".`);
			}
			throw error;
		}

		// Store in database - using a minimal set of columns that should exist in all schemas
		let newCollaborator: any[] = [];
		try {
			// First try with the standard schema
			const result = await client.execute({
				sql: `INSERT INTO collaborator (
					type, installation_id, owner_id, repo_id, owner, repo, 
					invitation_id, invitation_status, invited_by
				) VALUES (
					?, ?, ?, ?, ?, ?, ?, ?, ?
				) RETURNING *`,
				args: [
					installationRepos[0].owner.type === "User" ? "user" : "org",
					installations[0].id,
					installationRepos[0].owner.id,
					installationRepos[0].id,
					installationRepos[0].owner.login,
					installationRepos[0].name,
					invitation.invitationId,
					"pending",
					user.id
				]
			});
			
			// Create a properly formatted collaborator object that matches what the UI expects
			newCollaborator = result.rows.map(row => {
				// Transform the raw DB row into the expected format
				return {
					id: row.id,
					type: row.type,
					installationId: row.installation_id,
					ownerId: row.owner_id,
					repoId: row.repo_id,
					owner: row.owner,
					repo: row.repo,
					invitationId: row.invitation_id,
					invitationStatus: row.invitation_status || "pending",
					invitedBy: row.invited_by,
					githubUsername: username, // Add the GitHub username explicitly
				};
			});
			
			// Try to update the github_username separately if the column exists
			try {
				await client.execute({
					sql: `UPDATE collaborator SET github_username = ? WHERE id = ?`,
					args: [username, result.rows[0].id]
				});
			} catch (e) {
				// Ignore errors - the column might not exist
				console.log("Note: Could not update github_username column, it may not exist in the schema");
			}
		} catch (dbError) {
			// If the insertion fails, we still want to show success since the GitHub invitation was sent
			console.error("Database error when storing collaborator:", dbError);
			
			// Create a minimal collaborator object so the UI can still show something
			newCollaborator = [{
				id: Date.now(), // Temporary ID
				githubUsername: username,
				invitationStatus: "pending",
				invitationId: invitation.invitationId,
				owner: owner,
				repo: repo
			}];
		}

		return {
			message: `${username} invited to "${owner}/${repo}". They will receive a notification on GitHub.`,
			data: newCollaborator
		};
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

const handleRemoveCollaborator = async (collaboratorId: number, owner: string, repo: string) => {
	try {
		const { user } = await getAuth();
		if (!user || !user.githubId) throw new Error("You must be signed in with GitHub to manage collaborators.");

		const token = await getUserToken();
  	if (!token) throw new Error("Token not found");

		// Get collaborator using raw SQL to avoid column name issues
		const collaboratorResult = await client.execute({
			sql: `SELECT * FROM collaborator WHERE id = ?`,
			args: [collaboratorId]
		});
		
		if (!collaboratorResult.rows.length) throw new Error("Collaborator not found");
		
		const collaborator = collaboratorResult.rows[0];

		const installations = await getInstallations(token, [owner]);
		if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

		const installationRepos = await getInstallationRepos(token, installations[0].id, [repo]);
		if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);

		// If there's a pending invitation, cancel it
		if (collaborator.invitation_id && collaborator.invitation_status === "pending") {
			await cancelInvitation(token, owner, repo, Number(collaborator.invitation_id));
		}
		
		// If the user is already a collaborator, remove them
		// Try both column names (github_username and githubUsername) to handle different schemas
		const githubUsername = collaborator.github_username || collaborator.githubUsername;
		if (githubUsername && collaborator.invitation_status === "accepted") {
			await removeCollaborator(token, owner, repo, String(githubUsername));
		}

		// Delete from database using raw SQL
		await client.execute({
			sql: `DELETE FROM collaborator WHERE id = ? AND repo_id = ?`,
			args: [collaboratorId, installationRepos[0].id]
		});

		// Use either column name for display
		const displayName = githubUsername || collaborator.email || "Collaborator";
		return { message: `${displayName} removed from "${owner}/${repo}".` };
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

// Function to check invitation status
const checkInvitationStatus = async (owner: string, repo: string, collaboratorId: number): Promise<{ status?: string, error?: string }> => {
	try {
		const { user } = await getAuth();
		if (!user || !user.githubId) throw new Error("You must be signed in with GitHub.");

		const token = await getUserToken();
		if (!token) throw new Error("Token not found");

		// Get collaborator using raw SQL to avoid column name issues
		const collaboratorResult = await client.execute({
			sql: `SELECT * FROM collaborator WHERE id = ?`,
			args: [collaboratorId]
		});
		
		if (!collaboratorResult.rows.length) throw new Error("Collaborator not found");
		
		const collaborator = collaboratorResult.rows[0];
		
		// Try both column names to handle different schemas
		const invitationId = collaborator.invitation_id || collaborator.invitationId;
		if (!invitationId) throw new Error("No invitation found for this collaborator");

		// Use the GitHub API to check invitation status
		const status = await checkGitHubInvitationStatus(token, owner, repo, Number(invitationId));
		
		// Update the database with the current status using raw SQL
		if (status.status === "accepted" || status.status === "declined") {
			try {
				await client.execute({
					sql: `UPDATE collaborator SET invitation_status = ? WHERE id = ?`,
					args: [status.status, collaboratorId]
				});
			} catch (e) {
				console.error("Error updating invitation status:", e);
				// If the column name is different, try the other name
				try {
					await client.execute({
						sql: `UPDATE collaborator SET invitationStatus = ? WHERE id = ?`,
						args: [status.status, collaboratorId]
					});
				} catch (e2) {
					console.error("Error updating invitationStatus:", e2);
				}
			}
		}

		return { status: status.status };
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

export { handleAddCollaborator, handleRemoveCollaborator, checkInvitationStatus };
