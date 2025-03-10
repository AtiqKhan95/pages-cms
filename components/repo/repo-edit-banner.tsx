"use client";

import { useBranchEdit } from "@/contexts/branch-edit-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function RepoEditBanner() {
  const { selectedRepository, isUserBranch, readOnly } = useBranchEdit();
  
  // Only show the banner when the user is in edit mode (not read-only)
  if (readOnly || !isUserBranch || !selectedRepository) {
    return null;
  }
  
  return (
    <Alert variant="default" className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>Editing {selectedRepository.name}</AlertTitle>
      <AlertDescription>
        Your branch is configured to edit content in <strong>{selectedRepository.name}</strong>.
        You can only edit files within this repository. To edit files in other repositories, create a new branch.
      </AlertDescription>
    </Alert>
  );
}
