import { NextResponse } from "next/server";
import { getGitHubClient } from "@/lib/github";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: { owner: string; repo: string; branch: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.login) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const github = await getGitHubClient();
    
    // Get the latest commit SHA for the branch
    const { data: branchData } = await github.rest.repos.getBranch({
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
    });

    // Compare with the current commit SHA in cookies
    const cookieStore = cookies();
    const shaKey = `${params.owner}/${params.repo}/${params.branch}/sha`;
    const currentSHA = cookieStore.get(shaKey)?.value;
    const hasChanges = currentSHA !== branchData.commit.sha;

    // Store the new SHA in cookies
    if (hasChanges) {
      // Set cookie to expire in 30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      cookieStore.set(shaKey, branchData.commit.sha, {
        expires: new Date(Date.now() + thirtyDays),
        path: '/',
      });
    }

    return NextResponse.json({
      status: "success",
      hasChanges,
      sha: branchData.commit.sha,
    });
  } catch (error: any) {
    console.error("Error syncing branch:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
} 