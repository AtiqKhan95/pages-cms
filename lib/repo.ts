import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Octokit } from "@octokit/rest";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { Repo } from "@/types/repo";

interface CustomSession extends Session {
  accessToken?: string;
}

export async function getRepo(owner: string, repo: string): Promise<Repo | null> {
  const session = await getServerSession() as CustomSession;
  if (!session?.accessToken) {
    redirect("/sign-in");
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken });
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
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    throw error;
  }
} 