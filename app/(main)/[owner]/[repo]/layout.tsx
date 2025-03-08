'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { RepoProvider } from "@/contexts/repo-context";
import { getRepo } from "@/lib/repo";
import { Message } from "@/components/message";
import { Repo } from "@/types/repo";

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { owner: string; repo: string };
}) {
  const repoInfo = await getRepo(params.owner, params.repo);

  if (!repoInfo) {
    return (
      <Message
        title="Repository not accessible"
        description={<>This repository may not exist, be empty, or you may not have permission to access it.</>}
        className="absolute inset-0"
        cta="Select another repository"
        href="/"
      />
    );
  }

  return (
    <RepoProvider 
      owner={repoInfo.owner} 
      repo={repoInfo.repo} 
      defaultBranch={repoInfo.defaultBranch}
    >
      {children}
    </RepoProvider>
  );
}
