import { Octokit } from "@octokit/rest";
import { GitHub } from "arctic";
import { cookies } from "next/headers";
import { lucia } from "./auth";

// GitHub App configuration
export const github = new GitHub(process.env.GITHUB_APP_CLIENT_ID!, process.env.GITHUB_APP_CLIENT_SECRET!);

// Get GitHub client from session token
export async function getGitHubClient() {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    throw new Error("No session found");
  }

  const session = await lucia.validateSession(sessionId);
  if (!session.user?.accessToken) {
    throw new Error("No GitHub token found");
  }

  return new Octokit({
    auth: session.user.accessToken,
  });
}

// Get authenticated user data
export async function getAuthenticatedUser() {
  try {
    const github = await getGitHubClient();
    const { data } = await github.rest.users.getAuthenticated();
    return { user: data };
  } catch (error) {
    return null;
  }
} 