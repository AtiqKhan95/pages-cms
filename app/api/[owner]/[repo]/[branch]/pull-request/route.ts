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
    
    // Default to merging into the default branch
    // In Phase 2, we'll add support for specifying the target branch
    const targetBranch = data.targetBranch || "main";
    
    const octokit = createOctokitInstance(token);
    
    // Create the pull request
    const response = await octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: data.title,
      body: description,
      head: params.branch,
      base: targetBranch,
    });

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
