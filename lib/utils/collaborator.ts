import { createOctokitInstance } from "@/lib/utils/octokit";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { collaboratorTable } from "@/db/schema";

/**
 * Invites a GitHub user to collaborate on a repository
 * @param token GitHub token
 * @param owner Repository owner
 * @param repo Repository name
 * @param username GitHub username to invite
 * @param permission Permission level (pull, push, admin)
 * @returns Object containing status and invitation ID
 */
export async function inviteGitHubCollaborator(
  token: string, 
  owner: string, 
  repo: string, 
  username: string, 
  permission: "pull" | "push" | "admin" = "push"
) {
  const octokit = createOctokitInstance(token);
  
  try {
    const response = await octokit.request(
      'PUT /repos/{owner}/{repo}/collaborators/{username}', {
        owner,
        repo,
        username,
        permission,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    return {
      status: response.status,
      invitationId: response.data.id
    };
  } catch (error: any) {
    console.error("Error inviting GitHub collaborator:", error);
    throw new Error(error.message || "Failed to invite collaborator");
  }
}

/**
 * Checks the status of a GitHub invitation
 * @param token GitHub token
 * @param owner Repository owner
 * @param repo Repository name
 * @param invitationId GitHub invitation ID
 * @returns Object containing status and data
 */
export async function checkInvitationStatus(
  token: string, 
  owner: string, 
  repo: string, 
  invitationId: number
) {
  const octokit = createOctokitInstance(token);
  
  try {
    // Try to get the invitation - if it exists, it's still pending
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/invitations/{invitation_id}', {
        owner,
        repo,
        invitation_id: invitationId,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    return {
      status: "pending",
      data: response.data
    };
  } catch (error: any) {
    // If we get a 404, the invitation was likely accepted or declined
    if (error.status === 404) {
      // Check if user is now a collaborator
      const collaborator = await db.query.collaboratorTable.findFirst({
        where: eq(collaboratorTable.invitationId, invitationId)
      });
      
      if (!collaborator) return { status: "unknown" };
      
      try {
        // Check if the user is now a collaborator on the repo
        if (!collaborator.githubUsername) {
          return { status: "unknown" };
        }
        
        const checkResponse = await octokit.request(
          'GET /repos/{owner}/{repo}/collaborators/{username}', {
            owner,
            repo,
            username: collaborator.githubUsername,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          }
        );
        
        if (checkResponse.status === 204) {
          // User is a collaborator, invitation was accepted
          await db.update(collaboratorTable)
            .set({ invitationStatus: "accepted" })
            .where(eq(collaboratorTable.id, collaborator.id));
            
          return { status: "accepted" };
        }
      } catch (checkError: any) {
        if (checkError.status === 404) {
          // User is not a collaborator, invitation was declined or expired
          await db.update(collaboratorTable)
            .set({ invitationStatus: "declined" })
            .where(eq(collaboratorTable.id, collaborator.id));
            
          return { status: "declined" };
        }
      }
    }
    
    return { 
      status: "error", 
      message: error.message || "Failed to check invitation status" 
    };
  }
}

/**
 * Cancels a pending GitHub invitation
 * @param token GitHub token
 * @param owner Repository owner
 * @param repo Repository name
 * @param invitationId GitHub invitation ID
 * @returns Object containing status
 */
export async function cancelInvitation(
  token: string, 
  owner: string, 
  repo: string, 
  invitationId: number
) {
  const octokit = createOctokitInstance(token);
  
  try {
    await octokit.request(
      'DELETE /repos/{owner}/{repo}/invitations/{invitation_id}', {
        owner,
        repo,
        invitation_id: invitationId,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    return { status: "success" };
  } catch (error: any) {
    console.error("Error canceling GitHub invitation:", error);
    return { 
      status: "error", 
      message: error.message || "Failed to cancel invitation" 
    };
  }
}

/**
 * Validates if a GitHub username exists
 * @param username GitHub username to validate
 * @returns Boolean indicating if the username exists
 */
export async function validateGitHubUsername(username: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    return response.ok;
  } catch (error) {
    console.error("Error validating GitHub username:", error);
    return false;
  }
}

/**
 * Removes a collaborator from a repository
 * @param token GitHub token
 * @param owner Repository owner
 * @param repo Repository name
 * @param username GitHub username to remove
 * @returns Object containing status
 */
export async function removeCollaborator(
  token: string, 
  owner: string, 
  repo: string, 
  username: string
) {
  const octokit = createOctokitInstance(token);
  
  try {
    await octokit.request(
      'DELETE /repos/{owner}/{repo}/collaborators/{username}', {
        owner,
        repo,
        username,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    return { status: "success" };
  } catch (error: any) {
    console.error("Error removing GitHub collaborator:", error);
    return { 
      status: "error", 
      message: error.message || "Failed to remove collaborator" 
    };
  }
}
