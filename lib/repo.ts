import { redirect } from "next/navigation";
import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { Repo } from "@/types/repo";

export async function getRepo(owner: string, repo: string): Promise<Repo | null> {
  const { session, user } = await getAuth();
  if (!session) {
    redirect("/sign-in");
    return null;
  }

  const token = await getToken(user, owner, repo);
  if (!token) throw new Error("Token not found");

  try {
    const octokit = createOctokitInstance(token);
    const repoResponse = await octokit.rest.repos.get({ owner, repo });
    
    let branches = [];
    let hasMore = true;
    let page = 1;

    while (hasMore) {
      const branchesResponse = await octokit.rest.repos.listBranches({ owner, repo, page: page, per_page: 100 });
      if (branchesResponse.data.length === 0) break;
      branches.push(...branchesResponse.data);
      hasMore = (branchesResponse.data.length === 100);
      page++;
    }

    const branchNames = branches.map(branch => branch.name);
    
    if (branchNames.length === 0) {
      return null;
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
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    throw error;
  }
} 