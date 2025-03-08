'use client';

import { createContext, useContext, useState } from "react";

interface RepoContextType {
  owner: string;
  repo: string;
  branches: string[];
  defaultBranch?: string;
  isPrivate: boolean;
  setBranches: (branches: string[]) => void;
  syncBranch: (branch: string) => Promise<void>;
}

const RepoContext = createContext<RepoContextType | null>(null);

export function RepoProvider({
  owner,
  repo,
  defaultBranch,
  branches: initialBranches,
  isPrivate,
  children,
}: {
  owner: string;
  repo: string;
  defaultBranch?: string;
  branches: string[];
  isPrivate: boolean;
  children: React.ReactNode;
}) {
  const [branches, setBranches] = useState<string[]>(initialBranches);

  // Function to sync a specific branch with remote
  const syncBranch = async (branch: string) => {
    try {
      const response = await fetch(`/api/${owner}/${repo}/${encodeURIComponent(branch)}/sync`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync branch');
      }

      const data = await response.json();
      if (data.status === 'success' && data.hasChanges) {
        // If there were changes, refresh the page to show the latest content
        window.location.reload();
      }
    } catch (error) {
      console.error('Error syncing branch:', error);
    }
  };

  return (
    <RepoContext.Provider value={{ owner, repo, branches, defaultBranch, isPrivate, setBranches, syncBranch }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const context = useContext(RepoContext);
  if (!context) throw new Error('useRepo must be used within RepoProvider');
  return context;
} 