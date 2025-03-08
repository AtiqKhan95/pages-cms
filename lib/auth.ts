import { cache } from "react";
import { Session, User, Lucia } from "lucia";
import { DrizzleSQLiteAdapter, SQLiteSessionTable, SQLiteUserTable } from "@lucia-auth/adapter-drizzle";
import { db } from "@/db";
import { userTable, sessionTable } from "@/db/schema";
import { cookies } from "next/headers";

// TODO: why do I have to cast sessions and users???
const adapter = new DrizzleSQLiteAdapter(db, sessionTable as unknown as SQLiteSessionTable, userTable as unknown as SQLiteUserTable);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			secure: process.env.NODE_ENV === "production"
		}
	},
	getUserAttributes: (attributes) => {
		return {
			githubId: attributes.githubId,
			githubUsername: attributes.githubUsername,
			githubEmail: attributes.githubEmail,
			githubName: attributes.githubName,
			email: attributes.email,
			accessToken: attributes.accessToken
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

export interface DatabaseUserAttributes {
	id: string;
	githubId: number;
	githubUsername: string;
	githubEmail: string;
	githubName: string;
	email: string;
	accessToken: string;
}

export type AuthResult = {
	user: DatabaseUserAttributes | null;
	session: Session | null;
};

export const validateSession = async (sessionId: string | null): Promise<AuthResult> => {
	if (!sessionId) {
		return {
			user: null,
			session: null
		};
	}

	try {
		const { session, user } = await lucia.validateSession(sessionId);
		return { session, user: user as DatabaseUserAttributes | null };
	} catch (error) {
		return {
			user: null,
			session: null
		};
	}
};

export const getAuth = cache(
	async (): Promise<AuthResult> => {
		const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
		const result = await validateSession(sessionId);

		// next.js throws when you attempt to set cookie when rendering page
		try {
			if (result.session && result.session.fresh) {
				const sessionCookie = lucia.createSessionCookie(result.session.id);
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
			if (!result.session) {
				const sessionCookie = lucia.createBlankSessionCookie();
				cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
			}
		} catch {}
		return result;
	}
);