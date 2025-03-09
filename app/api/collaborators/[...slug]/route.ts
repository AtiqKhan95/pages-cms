import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getUserToken } from "@/lib/token";
import { and, eq } from "drizzle-orm";
import { db, client } from "@/db";
import { collaboratorTable } from "@/db/schema";
import { getInstallations, getInstallationRepos } from "@/lib/githubApp";
import { createOctokitInstance } from "@/lib/utils/octokit";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getUserToken();
    if (!token) throw new Error("Token not found");

    // TODO: support for branches and account collaborators
    if (!params.slug || params.slug.length !== 2) throw new Error("Invalid slug: owner and repo are mandatory");

    const owner = params.slug[0];
		const repo = params.slug[1];

    const installations = await getInstallations(token, [owner]);
		if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

		const installationRepos =  await getInstallationRepos(token, installations[0].id, [repo]);
		if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);
    
    // Use raw SQL to avoid column name issues
    const result = await client.execute({
      sql: `SELECT * FROM collaborator WHERE owner_id = ? AND repo_id = ?`,
      args: [installationRepos[0].owner.id, installationRepos[0].id]
    });
    
    // Format the data to match what the UI expects
    const collaborators = result.rows.map(row => {
      return {
        id: row.id,
        type: row.type,
        installationId: row.installation_id,
        ownerId: row.owner_id,
        repoId: row.repo_id,
        owner: row.owner,
        repo: row.repo,
        branch: row.branch,
        email: row.email,
        githubUsername: row.github_username || row.githubUsername,
        invitationId: row.invitation_id || row.invitationId,
        invitationStatus: row.invitation_status || row.invitationStatus || "pending",
        userId: row.user_id,
        invitedBy: row.invited_by
      };
    });
    
    // Now check for actual repository collaborators who might not be in our database
    try {
      // Create Octokit instance
      const octokit = createOctokitInstance(token);
      
      // Get all collaborators from GitHub
      const githubCollaborators = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      // For each GitHub collaborator, check if they're already in our list
      for (const ghCollaborator of githubCollaborators.data) {
        const exists = collaborators.some(c => {
          const username = c.githubUsername;
          return typeof username === 'string' && 
                 typeof ghCollaborator.login === 'string' && 
                 username.toLowerCase() === ghCollaborator.login.toLowerCase();
        });
        
        // If not in our list, add them
        if (!exists) {
          // Try to find if they're a user in our system
          const userResult = await client.execute({
            sql: `SELECT * FROM user WHERE github_username = ? OR githubUsername = ?`,
            args: [ghCollaborator.login, ghCollaborator.login]
          });
          
          // Add with all required fields to match the type
          collaborators.push({
            id: Date.now() + collaborators.length, // Generate a temporary ID
            type: "github",
            installationId: installations[0].id,
            ownerId: installationRepos[0].owner.id,
            repoId: installationRepos[0].id,
            owner: owner,
            repo: repo,
            branch: null,
            email: null,
            githubUsername: ghCollaborator.login,
            invitationId: null,
            invitationStatus: "accepted", // They're already a collaborator
            userId: userResult.rows.length > 0 ? userResult.rows[0].id : null,
            invitedBy: null
          });
        }
      }
    } catch (error) {
      console.error("Error fetching GitHub collaborators:", error);
      // Continue with our database collaborators if GitHub API fails
    }
    
    return Response.json({
      status: "success",
      data: collaborators,
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
};
