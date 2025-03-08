"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";

interface BranchEditContextType {
  canEdit: boolean;
  isUserBranch: boolean;
  readOnly: boolean;
  hasPendingChanges: boolean;
  setPendingChanges: (hasPending: boolean) => void;
  createPullRequest: (title?: string, description?: string) => Promise<any>;
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
  const { owner, repo } = useRepo();
  
  const [isUserBranch, setIsUserBranch] = useState<boolean>(false);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  
  // Check if the current branch was created by the user
  useEffect(() => {
    const checkBranchOwnership = async () => {
      if (!config || !user) {
        setIsUserBranch(false);
        return;
      }
      
      try {
        // For now, we'll consider the default branch as not editable
        // and any other branch as editable. In a future update, we'll
        // implement proper branch ownership tracking.
        const isDefaultBranch = config.branch === 'main' || config.branch === 'master';
        setIsUserBranch(!isDefaultBranch);
      } catch (error) {
        console.error("Error checking branch ownership:", error);
        setIsUserBranch(false);
      }
    };
    
    checkBranchOwnership();
  }, [config, user]);
  
  // Function to create a pull request
  const createPullRequest = async (title?: string, description?: string) => {
    if (!config) {
      throw new Error("Configuration not found");
    }
    
    try {
      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch || '')}/pull-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Update content in ${config.branch}`,
          description: description || '',
          targetBranch: 'main', // Default to main, will be configurable in Phase 2
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
  
  // Determine if the user can edit content
  const canEdit = isUserBranch;
  // Read-only mode is when the user is not on their branch
  const readOnly = !isUserBranch;
  
  return (
    <BranchEditContext.Provider 
      value={{ 
        canEdit, 
        isUserBranch,
        readOnly,
        hasPendingChanges, 
        setPendingChanges: setHasPendingChanges,
        createPullRequest
      }}
    >
      {children}
    </BranchEditContext.Provider>
  );
};
