import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

export interface BranchStatus {
  name: string;
  status: 'open' | 'has_pr' | 'merged' | 'deleted';
  prNumber?: number;
  prUrl?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { owner: string, repo: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const octokit = createOctokitInstance(token);
    
    // Get all branches
    const branchesResponse = await octokit.rest.repos.listBranches({
      owner: params.owner,
      repo: params.repo,
      per_page: 100, // Adjust as needed
    });
    
    // Get all pull requests
    const pullsResponse = await octokit.rest.pulls.list({
      owner: params.owner,
      repo: params.repo,
      state: 'all', // Get both open and closed PRs
      per_page: 100, // Adjust as needed
    });
    
    // Map branches to their status
    const branchStatuses: BranchStatus[] = branchesResponse.data.map(branch => {
      // Find PRs associated with this branch
      const associatedPRs = pullsResponse.data.filter(pr => pr.head.ref === branch.name);
      
      if (associatedPRs.length === 0) {
        // No PRs, branch is open
        return {
          name: branch.name,
          status: 'open'
        };
      }
      
      // Sort PRs by creation date (newest first)
      const sortedPRs = associatedPRs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const latestPR = sortedPRs[0];
      
      if (latestPR.merged_at) {
        // PR was merged
        return {
          name: branch.name,
          status: 'merged',
          prNumber: latestPR.number,
          prUrl: latestPR.html_url
        };
      } else if (latestPR.state === 'open') {
        // PR is open
        return {
          name: branch.name,
          status: 'has_pr',
          prNumber: latestPR.number,
          prUrl: latestPR.html_url
        };
      } else {
        // PR was closed without merging
        return {
          name: branch.name,
          status: 'open',
          prNumber: latestPR.number,
          prUrl: latestPR.html_url
        };
      }
    });
    
    return Response.json({
      status: "success",
      data: branchStatuses
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    }, { status: 500 });
  }
}
