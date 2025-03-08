import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { getConfig } from "@/lib/utils/config";

export async function GET(
  request: Request,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const octokit = createOctokitInstance(token);
    
    // Get the current config to check the last known SHA
    const config = await getConfig(params.owner, params.repo, params.branch);
    if (!config) {
      throw new Error("Configuration not found");
    }
    
    // Get the latest commit for the branch
    const branchResponse = await octokit.rest.repos.getBranch({
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
    });
    
    const latestCommitSha = branchResponse.data.commit.sha;
    
    // Check if the SHA has changed since the last time we checked
    const hasChanges = config.sha !== latestCommitSha;
    
    // Get the latest commit info
    const commitResponse = await octokit.rest.repos.getCommit({
      owner: params.owner,
      repo: params.repo,
      ref: latestCommitSha,
    });
    
    const lastCommit = {
      sha: commitResponse.data.sha,
      message: commitResponse.data.commit.message,
      date: commitResponse.data.commit.author?.date || new Date().toISOString(),
      author: {
        name: commitResponse.data.commit.author?.name || "Unknown",
        email: commitResponse.data.commit.author?.email || "",
      }
    };
    
    return Response.json({
      status: "success",
      hasChanges,
      lastCommit,
      lastKnownSha: config.sha,
      currentSha: latestCommitSha
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    }, { status: 500 });
  }
}
