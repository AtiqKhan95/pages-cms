import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";

interface Submodule {
  name: string;
  path: string;
  url: string;
  owner: string;
  repo: string;
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
    
    // Try to get the .gitmodules file from the repository
    try {
      const response = await octokit.rest.repos.getContent({
        owner: params.owner,
        repo: params.repo,
        path: ".gitmodules",
      });
      
      if (Array.isArray(response.data)) {
        throw new Error("Expected a file but found a directory");
      } else if (response.data.type !== "file") {
        throw new Error("Invalid response type");
      }
      
      // Parse the .gitmodules file content
      const content = Buffer.from(response.data.content, "base64").toString();
      
      // Extract submodule information using regex
      const submodules: Submodule[] = [];
      const submoduleRegex = /\[submodule "([^"]+)"\]\s+path = ([^\n]+)\s+url = ([^\n]+)/g;
      
      let match;
      while ((match = submoduleRegex.exec(content)) !== null) {
        const name = match[1];
        const path = match[2].trim();
        const url = match[3].trim();
        
        // Extract owner and repo from the URL
        // Handle different URL formats:
        // - https://github.com/owner/repo.git
        // - git@github.com:owner/repo.git
        // - ../relative/path
        
        let owner = "";
        let repo = "";
        
        if (url.includes("github.com")) {
          if (url.startsWith("https://")) {
            const urlParts = url.replace("https://github.com/", "").replace(".git", "").split("/");
            owner = urlParts[0];
            repo = urlParts[1];
          } else if (url.includes("git@github.com:")) {
            const urlParts = url.replace("git@github.com:", "").replace(".git", "").split("/");
            owner = urlParts[0];
            repo = urlParts[1];
          }
        } else if (url.startsWith("../") || url.startsWith("./")) {
          // For relative paths, assume it's in the same organization
          owner = params.owner;
          repo = url.split("/").pop()?.replace(".git", "") || "";
        }
        
        if (owner && repo) {
          submodules.push({
            name,
            path,
            url,
            owner,
            repo
          });
        }
      }
      
      return Response.json({
        status: "success",
        data: submodules
      });
    } catch (error: any) {
      // If the .gitmodules file doesn't exist, return an empty array
      if (error.status === 404) {
        return Response.json({
          status: "success",
          data: []
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    }, { status: 500 });
  }
}
