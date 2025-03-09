"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { handleGithubSignIn } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "sonner";
import { Github } from "lucide-react";

export function SignIn() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "";

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] w-full space-y-6">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-center">Sign in to Pages CMS</h1>
        <form action={handleGithubSignIn}>
          <SubmitButton type="submit" className="w-full">
            <Github className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </SubmitButton>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          GitHub authentication is required for Pages CMS
        </p>
        <p className="text-sm text-muted-foreground">By clicking continue, you agree to our <a className="underline hover:decoration-muted-foreground/50" href="https://pagescms.org/terms" target="_blank">Terms of Service</a> and <a className="underline hover:decoration-muted-foreground/50" href="https://pagescms.org/privacy" target="_blank">Privacy Policy</a>.</p>
      </div>
    </div>
  );
}
