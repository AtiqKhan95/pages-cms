import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

export async function POST(
  request: Request,
  { params }: { params: { owner: string; repo: string; branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const data: any = await request.json();
    if (!data.title) throw new Error("Title is required");
    if (!data.baseBranch) throw new Error("Base branch is required");

    const octokit = createOctokitInstance(token);

    // Create pull request
    const response = await octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: data.title,
      head: params.branch,
      base: data.baseBranch,
      body: data.body || `Content changes submitted via Pages CMS`,
      maintainer_can_modify: true,
    });

    return Response.json({
      status: "success",
      message: "Pull request created successfully",
      data: response.data,
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
} 