import { type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getUserToken } from "@/lib/token";
import { and, eq } from "drizzle-orm";
import { db, client } from "@/db";
import { collaboratorTable } from "@/db/schema";
import { getInstallations, getInstallationRepos } from "@/lib/githubApp";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getUserToken();
    if (!token) throw new Error("Token not found");

    // TODO: support for branches and account collaborators
    if (!params.slug || params.slug.length !== 2) throw new Error("Invalid slug: owner and repo are mandatory");

    const owner = params.slug[0];
		const repo = params.slug[1];

    const installations = await getInstallations(token, [owner]);
		if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);

		const installationRepos =  await getInstallationRepos(token, installations[0].id, [repo]);
		if (installationRepos.length !== 1) throw new Error(`"${owner}/${repo}" is not part of your GitHub App installations`);
    
    // Use raw SQL to avoid column name issues
    const result = await client.execute({
      sql: `SELECT * FROM collaborator WHERE owner_id = ? AND repo_id = ?`,
      args: [installationRepos[0].owner.id, installationRepos[0].id]
    });
    
    return Response.json({
      status: "success",
      data: result.rows,
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({
      status: "error",
      message: error.message,
    });
  }
};
