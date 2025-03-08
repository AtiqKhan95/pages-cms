import { redirect } from "next/navigation";
import { getGitHubClient } from "./github";
import { Repo } from "@/types/repo";

export async function getRepo(owner: string, repo: string): Promise<Repo | null> {
  try {
    const github = await getGitHubClient();
    const repoResponse = await github.rest.repos.get({ owner, repo });
    
    let branches = [];
    let hasMore = true;
    let page = 1;

    while (hasMore) {
      const branchesResponse = await github.rest.repos.listBranches({ owner, repo, page: page, per_page: 100 });
      if (branchesResponse.data.length === 0) break;
      branches.push(...branchesResponse.data);
      hasMore = (branchesResponse.data.length === 100);
      page++;
    }

    const branchNames = branches.map(branch => branch.name);
    
    // Always return at least the default branch if no branches are found
    if (branchNames.length === 0) {
      if (repoResponse.data.default_branch) {
        branchNames.push(repoResponse.data.default_branch);
      } else {
        return null;
      }
    }

    return {
      id: repoResponse.data.id,
      owner: repoResponse.data.owner.login,
      ownerId: repoResponse.data.owner.id,
      repo: repoResponse.data.name,
      defaultBranch: repoResponse.data.default_branch,
      branches: branchNames,
      isPrivate: repoResponse.data.private
    };
  } catch (error: any) {
    if (error.message === "No session found" || error.message === "No GitHub token found") {
      redirect("/sign-in");
    }
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    console.error("Error fetching repo:", error);
    return null;
  }
} 