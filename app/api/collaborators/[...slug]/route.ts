import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getUserToken } from "@/lib/token";
import { db } from "@/db";
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

    // Validate slug parameters
    if (!params.slug || params.slug.length !== 2) throw new Error("Invalid slug: owner and repo are mandatory");

    const owner = params.slug[0];
    const repo = params.slug[1];

    // Get GitHub installation info
    const installations = await getInstallations(token, [owner]);
    if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

    const installationRepos = await getInstallationRepos(token, installations[0].id, [repo]);
    if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);
    
    // Get collaborators from database
    const dbCollaborators = await db.query.collaboratorTable.findMany({
      where: (collaborator, { eq, and }) => and(
        eq(collaborator.owner, owner),
        eq(collaborator.repo, repo)
      )
    });
    
    // Create Octokit instance
    const octokit = createOctokitInstance(token);
    
    // Get collaborators from GitHub
    const githubCollaborators = [];
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      
      githubCollaborators.push(...response.data);
    } catch (error) {
      console.error("Error fetching GitHub collaborators:", error);
      // Continue with database collaborators if GitHub API fails
    }
    
    // Merge database and GitHub collaborators
    const collaborators = [];
    
    // First add all database collaborators
    for (const dbCollab of dbCollaborators) {
      collaborators.push({
        id: dbCollab.id,
        type: dbCollab.type,
        installationId: dbCollab.installationId,
        ownerId: dbCollab.ownerId,
        repoId: dbCollab.repoId,
        owner: dbCollab.owner,
        repo: dbCollab.repo,
        githubUsername: dbCollab.githubUsername,
        invitationId: dbCollab.invitationId,
        invitationStatus: dbCollab.invitationStatus || "pending",
        userId: dbCollab.userId,
        invitedBy: dbCollab.invitedBy
      });
    }
    
    // Then add GitHub collaborators that aren't in the database
    for (const ghCollab of githubCollaborators) {
      const exists = collaborators.some(c => 
        c.githubUsername && c.githubUsername.toLowerCase() === ghCollab.login.toLowerCase()
      );
      
      if (!exists) {
        collaborators.push({
          id: Date.now() + collaborators.length, // Generate a temporary ID
          type: "github",
          installationId: installations[0].id,
          ownerId: installationRepos[0].owner.id,
          repoId: installationRepos[0].id,
          owner: owner,
          repo: repo,
          githubUsername: ghCollab.login,
          invitationStatus: "accepted", // They're already a collaborator
          invitedBy: null
        });
      }
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
