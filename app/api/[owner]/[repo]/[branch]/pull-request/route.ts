import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

export async function POST(
  request: Request,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const data: any = await request.json();
    if (!data.title) throw new Error(`"title" is required.`);
    
    // Optional description
    const description = data.description || "";
    
    // Target branch (default or specified)
    const targetBranch = data.targetBranch || "main";
    
    // Target repository (for submodule support)
    // If targetOwner and targetRepo are provided, use them
    // Otherwise, use the current repository
    const targetOwner = data.targetOwner || params.owner;
    const targetRepo = data.targetRepo || params.repo;
    
    const octokit = createOctokitInstance(token);
    
    // Check if we're creating a PR to a different repository (submodule)
    const isSubmodulePR = targetOwner !== params.owner || targetRepo !== params.repo;
    
    let response;
    
    if (isSubmodulePR) {
      // For submodule PRs, we need to ensure the branch exists in the target repo
      // First, get the commit SHA from the source branch
      const sourceCommit = await octokit.rest.repos.getBranch({
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
      });
      
      // Create a branch in the target repo with the same name if it doesn't exist
      try {
        await octokit.rest.git.createRef({
          owner: targetOwner,
          repo: targetRepo,
          ref: `refs/heads/${params.branch}`,
          sha: sourceCommit.data.commit.sha,
        });
      } catch (error: any) {
        // If the branch already exists, that's fine
        if (!error.message.includes('Reference already exists')) {
          throw error;
        }
      }
      
      // Create the pull request in the target repo
      response = await octokit.rest.pulls.create({
        owner: targetOwner,
        repo: targetRepo,
        title: data.title,
        body: description,
        head: `${params.owner}:${params.branch}`,
        base: targetBranch,
      });
    } else {
      // Regular PR within the same repository
      response = await octokit.rest.pulls.create({
        owner: params.owner,
        repo: params.repo,
        title: data.title,
        body: description,
        head: params.branch,
        base: targetBranch,
      });
    }

    return Response.json({
      status: "success",
      message: `Pull request created successfully.`,
      data: {
        number: response.data.number,
        url: response.data.html_url,
      }
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
}
