"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { useBranchEdit } from "@/contexts/branch-edit-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader, GitBranch } from "lucide-react";

export function RepoMakeChangesButton() {
  const router = useRouter();
  const { owner, repo, branches, setBranches } = useRepo();
  const { config } = useConfig();
  const { readOnly } = useBranchEdit();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchName, setBranchName] = useState("");
  
  // Only show the button in read-only mode
  if (!readOnly) {
    return null;
  }
  
  const isValidBranchName = (name: string) => {
    if (!name || name.length > 255) return false;
    const validBranchRegex = /^(?!\/|.*(?:\/\.|\/\/|\.\.|@{|\\))[^\x20\x7f ~^:?*\[\]]+(?<!\.|\/)$/;
    return validBranchRegex.test(name);
  };
  
  const handleCreateBranch = async () => {
    if (!config || !isValidBranchName(branchName) || branches?.includes(branchName)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch || '')}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create branch: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== "success") {
        throw new Error(data.message);
      }
      
      if (branches) {
        setBranches([...branches, branchName]);
      } else {
        setBranches([branchName]);
      }
      
      toast.success(`Branch "${branchName}" created successfully`);
      setIsOpen(false);
      
      // Navigate to the new branch
      router.push(`/${owner}/${repo}/${encodeURIComponent(branchName)}`);
    } catch (error: any) {
      console.error("Error creating branch:", error);
      toast.error(error.message || "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-x-2 mb-4">
          <GitBranch className="h-4 w-4" />
          Make Changes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a branch to make changes</DialogTitle>
          <DialogDescription>
            You need to create your own branch before you can edit content. 
            Changes made on your branch can later be submitted for review.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Enter a name for your branch"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBranch} 
            disabled={isSubmitting || !branchName || !isValidBranchName(branchName) || branches?.includes(branchName)}
          >
            Create branch
            {isSubmitting && <Loader className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
