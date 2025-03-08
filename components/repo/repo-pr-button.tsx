"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader, GitPullRequest, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Submodule {
  name: string;
  path: string;
  url: string;
  owner: string;
  repo: string;
}

export function RepoPrButton() {
  const router = useRouter();
  const { owner, repo, defaultBranch } = useRepo();
  const { config } = useConfig();
  const { isUserBranch, hasPendingChanges, createPullRequest, hasPullRequest, branchStatus } = useBranchEdit();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(`Update content in ${config?.branch || ''}`);
  const [description, setDescription] = useState("");
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [selectedTargetRepo, setSelectedTargetRepo] = useState<string>("");
  const [isLoadingSubmodules, setIsLoadingSubmodules] = useState(false);
  
  // Fetch submodules when the dialog opens
  useEffect(() => {
    const fetchSubmodules = async () => {
      if (!isOpen || !config) return;
      
      setIsLoadingSubmodules(true);
      try {
        const response = await fetch(`/api/${config.owner}/${config.repo}/submodules`);
        if (!response.ok) {
          throw new Error(`Failed to fetch submodules: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.status === "success") {
          setSubmodules(data.data);
        } else {
          console.error("Error fetching submodules:", data.message);
        }
      } catch (error) {
        console.error("Error fetching submodules:", error);
      } finally {
        setIsLoadingSubmodules(false);
      }
    };
    
    fetchSubmodules();
  }, [isOpen, config]);
  
  // Only show the button if this is a user branch and there are pending changes
  // and the branch doesn't already have a PR
  if (!isUserBranch || !hasPendingChanges || hasPullRequest) {
    return null;
  }
  
  // If the branch already has a PR, show a message instead of the button
  if (hasPullRequest && branchStatus?.prUrl) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pull Request Already Created</AlertTitle>
        <AlertDescription>
          This branch already has an open pull request.{" "}
          <a 
            href={branchStatus.prUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            View PR #{branchStatus.prNumber}
          </a>
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleCreatePR = async () => {
    setIsSubmitting(true);
    
    try {
      await createPullRequest(title, description, selectedTargetRepo || undefined);
      
      toast.success("Pull request created successfully");
      setIsOpen(false);
      
      // Redirect to the default branch after PR creation
      router.push(`/${owner}/${repo}/${encodeURIComponent(defaultBranch || '')}`);
    } catch (error) {
      console.error("Error creating PR:", error);
      toast.error("Failed to create pull request");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-x-2">
          <GitPullRequest className="h-4 w-4" />
          Send changes for review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a pull request</DialogTitle>
          <DialogDescription>
            This will create a pull request to merge your changes from <strong>{config?.branch}</strong> into <strong>{defaultBranch}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your pull request"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="pr-description">Description (optional)</Label>
            <Textarea
              id="pr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the changes you've made"
              rows={4}
            />
          </div>
          
          {submodules.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="target-repo">Target Repository (optional)</Label>
              <Select value={selectedTargetRepo} onValueChange={setSelectedTargetRepo}>
                <SelectTrigger id="target-repo">
                  <SelectValue placeholder="Select target repository" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Current repository ({owner}/{repo})</SelectItem>
                  {submodules.map((submodule) => (
                    <SelectItem key={submodule.path} value={`${submodule.owner}/${submodule.repo}`}>
                      {submodule.name} ({submodule.owner}/{submodule.repo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                If your changes should be submitted to a submodule repository, select it here.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreatePR} disabled={isSubmitting || !title.trim()}>
            Create pull request
            {isSubmitting && <Loader className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
