"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Repo } from "@/types/repo";
import { BranchStatus } from "@/app/api/[owner]/[repo]/branches/status/route";

interface RepoContextType extends Repo {
  setBranches: (branches: string[]) => void;
  branchStatuses: BranchStatus[];
  refreshBranchStatuses: () => Promise<void>;
  isBranchStatusLoading: boolean;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
};

export const RepoProvider = ({
  repo,
  children
}: {
  repo: Repo;
  children: React.ReactNode;
}) => {
  const [branches, setBranches] = useState<string[]>(repo?.branches || []);
  const [branchStatuses, setBranchStatuses] = useState<BranchStatus[]>([]);
  const [isBranchStatusLoading, setIsBranchStatusLoading] = useState<boolean>(false);

  const refreshBranchStatuses = async () => {
    if (!repo.owner || !repo.repo) return;
    
    setIsBranchStatusLoading(true);
    try {
      const response = await fetch(`/api/${repo.owner}/${repo.repo}/branches/status`);
      if (!response.ok) {
        throw new Error(`Failed to fetch branch statuses: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === "success") {
        setBranchStatuses(data.data);
      } else {
        console.error("Error fetching branch statuses:", data.message);
      }
    } catch (error) {
      console.error("Error fetching branch statuses:", error);
    } finally {
      setIsBranchStatusLoading(false);
    }
  };

  // Fetch branch statuses when the component mounts or when branches change
  useEffect(() => {
    if (repo.owner && repo.repo) {
      refreshBranchStatuses();
    }
  }, [repo.owner, repo.repo, branches]);

  return (
    <RepoContext.Provider value={{ 
      ...repo, 
      branches, 
      setBranches, 
      branchStatuses, 
      refreshBranchStatuses,
      isBranchStatusLoading
    }}>
      {children}
    </RepoContext.Provider>
  );
};
