"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { BranchStatus } from "@/app/api/[owner]/[repo]/branches/status/route";

interface BranchEditContextType {
  canEdit: boolean;
  isUserBranch: boolean;
  readOnly: boolean;
  hasPendingChanges: boolean;
  setPendingChanges: (hasPending: boolean) => void;
  createPullRequest: (title?: string, description?: string, targetRepo?: string) => Promise<any>;
  branchStatus: BranchStatus | undefined;
  hasPullRequest: boolean;
  isMerged: boolean;
}

const BranchEditContext = createContext<BranchEditContextType | undefined>(undefined);

export const useBranchEdit = () => {
  const context = useContext(BranchEditContext);
  if (!context) {
    throw new Error("useBranchEdit must be used within a BranchEditProvider");
  }
  return context;
};

export const BranchEditProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const { config } = useConfig();
  const { owner, repo, defaultBranch, branchStatuses } = useRepo();
  
  const [isUserBranch, setIsUserBranch] = useState<boolean>(false);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [branchStatus, setBranchStatus] = useState<BranchStatus | undefined>(undefined);
  
  // Check if the current branch was created by the user and get its status
  useEffect(() => {
    const checkBranchOwnership = async () => {
      if (!config || !user) {
        setIsUserBranch(false);
        return;
      }
      
      try {
        // Check if this is the default branch (not editable)
        const isDefaultBranch = config.branch === defaultBranch;
        
        // Find the status of the current branch
        const currentBranchStatus = branchStatuses.find(
          status => status.name === config.branch
        );
        
        setBranchStatus(currentBranchStatus);
        
        // A branch is considered a user branch if:
        // 1. It's not the default branch
        // 2. It doesn't have a merged PR
        const isMerged = currentBranchStatus?.status === 'merged';
        
        setIsUserBranch(!isDefaultBranch && !isMerged);
      } catch (error) {
        console.error("Error checking branch ownership:", error);
        setIsUserBranch(false);
      }
    };
    
    checkBranchOwnership();
  }, [config, user, defaultBranch, branchStatuses]);
  
  // Function to create a pull request
  const createPullRequest = async (title?: string, description?: string, targetRepo?: string) => {
    if (!config) {
      throw new Error("Configuration not found");
    }
    
    try {
      // Determine the target repository (for submodule support)
      const targetOwnerRepo = targetRepo ? targetRepo.split('/') : [config.owner, config.repo];
      const targetOwner = targetOwnerRepo[0];
      const targetRepoName = targetOwnerRepo[1];
      
      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch || '')}/pull-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Update content in ${config.branch}`,
          description: description || '',
          targetBranch: defaultBranch || 'main',
          targetOwner: targetOwner,
          targetRepo: targetRepoName,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create pull request: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== "success") {
        throw new Error(data.message);
      }
      
      // Reset pending changes after successful PR creation
      setHasPendingChanges(false);
      
      return data.data;
    } catch (error) {
      console.error("Error creating pull request:", error);
      throw error;
    }
  };
  
  // Determine if the branch has a pull request
  const hasPullRequest = branchStatus?.status === 'has_pr';
  
  // Determine if the branch is merged
  const isMerged = branchStatus?.status === 'merged';
  
  // Determine if the user can edit content
  const canEdit = isUserBranch && !hasPullRequest && !isMerged;
  
  // Read-only mode is when the user is not on their branch or the branch has a PR or is merged
  const readOnly = !canEdit;
  
  return (
    <BranchEditContext.Provider 
      value={{ 
        canEdit, 
        isUserBranch,
        readOnly,
        hasPendingChanges, 
        setPendingChanges: setHasPendingChanges,
        createPullRequest,
        branchStatus,
        hasPullRequest,
        isMerged
      }}
    >
      {children}
    </BranchEditContext.Provider>
  );
};
