"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { Message } from "@/components/message";
import { useRepo } from '@/contexts/repo-context';
import { RepoSidebar } from '@/components/repo/repo-sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

// Sheet components
const Sheet = ({ children }: { children: React.ReactNode }) => (
  <div className="md:hidden">{children}</div>
);

const SheetTrigger = ({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) => (
  <div data-trigger>{children}</div>
);

const SheetContent = ({ 
  side, 
  className, 
  children 
}: { 
  side?: string; 
  className?: string; 
  children: React.ReactNode 
}) => (
  <div className={className}>{children}</div>
);

export default function BranchPage() {
  const { config } = useConfig();
  const router = useRouter();
  const [error, setError] = useState(false);
  const { syncBranch } = useRepo();

  useEffect(() => {
    if (config) {
      if (!config.object) {
        setError(true);
      }
    }
  }, [config]);

  // Set up branch syncing
  useEffect(() => {
    if (config?.branch) {
      // Initial sync when page loads
      syncBranch(config.branch);

      // Set up polling every 30 seconds
      const pollInterval = setInterval(() => {
        syncBranch(config.branch);
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  }, [config?.branch, syncBranch]);

  if (error) {
    return (
      <Message
        title="Nothing to see here."
        description={<>This branch and/or repository has no configuration. Edit on GitHub if you think this is a mistake.</>}
        className="absolute inset-0"
        cta="Edit configuration on GitHub"
        href={`https://github.com/${config?.owner}/${config?.repo}/edit/${encodeURIComponent(config!.branch)}/.pages.yml`}
      />
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="hidden md:flex md:w-64 md:flex-col border-r">
        <RepoSidebar />
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden absolute left-4 top-4 z-30"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <RepoSidebar onClick={() => {
            const trigger = document.querySelector('[data-trigger]') as HTMLElement;
            trigger?.click();
          }} />
        </SheetContent>
      </Sheet>
      <main className="flex-1 overflow-auto">
        {config?.object && <div className="p-6">Content goes here</div>}
      </main>
    </div>
  );
}