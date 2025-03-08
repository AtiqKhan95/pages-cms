import { Octokit } from "@octokit/rest";
import { cookies } from "next/headers";

export async function getGitHubClient() {
  const cookieStore = cookies();
  const token = cookieStore.get("github_token")?.value;

  if (!token) {
    throw new Error("No GitHub token found");
  }

  return new Octokit({
    auth: token,
  });
} 