import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getAccounts } from "@/lib/utils/accounts";
import { Providers } from "@/components/providers";
import { User } from "@/types/user";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, user } = await getAuth();
  if (!session || !user) return redirect("/sign-in");

  // Cast the user to the expected User type since we know it has all required properties
  const accounts = await getAccounts(user as User);
  const userWithAccounts = { ...user, accounts };
  
	return (
    <Providers user={userWithAccounts}>
      {children}
    </Providers>
  );
}