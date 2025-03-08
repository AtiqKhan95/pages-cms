import { createOctokitInstance } from "@/lib/utils/octokit";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { getConfig, updateConfig } from "@/lib/utils/config";
import { configVersion, parseConfig, normalizeConfig } from "@/lib/config";

export async function POST(
  request: Request,
  { params }: { params: { owner: string, repo: string, branch: string } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, params.owner, params.repo);
    if (!token) throw new Error("Token not found");

    const octokit = createOctokitInstance(token);
    
    // Get the current config
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
    
    // Get the latest config file content
    const configResponse = await octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: ".pages.yml",
      ref: params.branch,
    });
    
    if (Array.isArray(configResponse.data)) {
      throw new Error("Expected a file but found a directory");
    } else if (configResponse.data.type !== "file") {
      throw new Error("Invalid response type");
    }
    
    // Parse the config file content
    const configFile = Buffer.from(configResponse.data.content, "base64").toString();
    const parsedConfig = parseConfig(configFile);
    const configObject = normalizeConfig(parsedConfig.document.toJSON());
    
    // Update the config with the latest SHA and content
    const updatedConfig = {
      ...config,
      sha: latestCommitSha,
      version: configVersion,
      object: configObject
    };
    
    // Save the updated config
    await updateConfig(updatedConfig);
    
    return Response.json({
      status: "success",
      message: "Changes synchronized successfully",
      previousSha: config.sha,
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
