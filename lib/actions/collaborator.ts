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

		// Store in database
		const newCollaborator = await db.insert(collaboratorTable).values({
			type: installationRepos[0].owner.type === "User" ? "user" : "org",
			installationId: installations[0].id,
			ownerId: installationRepos[0].owner.id,
			repoId: installationRepos[0].id,
			owner: owner,
			repo: repo,
			githubUsername: username,
			invitationId: invitation.invitationId,
			invitationStatus: "pending",
			invitedBy: user.id
		}).returning();

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

		// Get collaborator from database
		const collaborator = await db.query.collaboratorTable.findFirst({
			where: eq(collaboratorTable.id, collaboratorId)
		});
		
		if (!collaborator) throw new Error("Collaborator not found");

		const installations = await getInstallations(token, [owner]);
		if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

		const installationRepos = await getInstallationRepos(token, installations[0].id, [repo]);
		if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);

		// If there's a pending invitation, cancel it
		if (collaborator.invitationId && collaborator.invitationStatus === "pending") {
			await cancelInvitation(token, owner, repo, collaborator.invitationId);
		}
		
		// If the user is already a collaborator, remove them
		if (collaborator.githubUsername && collaborator.invitationStatus === "accepted") {
			await removeCollaborator(token, owner, repo, collaborator.githubUsername);
		}

		// Delete from database
		await db.delete(collaboratorTable).where(eq(collaboratorTable.id, collaboratorId)).returning();

		const displayName = collaborator.githubUsername || collaborator.email || "Collaborator";
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

		// Get collaborator from database
		const collaborator = await db.query.collaboratorTable.findFirst({
			where: eq(collaboratorTable.id, collaboratorId)
		});
		
		if (!collaborator) throw new Error("Collaborator not found");
		if (!collaborator.invitationId) throw new Error("No invitation found for this collaborator");

		// Use the GitHub API to check invitation status
		const status = await checkGitHubInvitationStatus(token, owner, repo, collaborator.invitationId);
		
		// Update the database with the current status
		if (status.status === "accepted" || status.status === "declined") {
			await db.update(collaboratorTable)
				.set({ invitationStatus: status.status })
				.where(eq(collaboratorTable.id, collaboratorId));
		}

		return { status: status.status };
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

export { handleAddCollaborator, handleRemoveCollaborator, checkInvitationStatus };
