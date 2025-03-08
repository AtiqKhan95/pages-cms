import { Octokit } from "@octokit/rest";
import { GitHub } from "arctic";
import { cookies } from "next/headers";
import { lucia } from "./auth";
import type { DatabaseUserAttributes } from "./auth";

// GitHub App configuration
export const github = new GitHub(process.env.GITHUB_APP_CLIENT_ID!, process.env.GITHUB_APP_CLIENT_SECRET!);

// Get GitHub client from session token
export async function getGitHubClient() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get(lucia.sessionCookieName)?.value;
    if (!sessionId) {
      throw new Error("No session found");
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user?.accessToken) {
      throw new Error("No GitHub token found");
    }

    return new Octokit({
      auth: user.accessToken,
    });
  } catch (error) {
    throw new Error("No session found");
  }
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