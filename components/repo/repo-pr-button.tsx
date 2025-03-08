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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader, GitPullRequest } from "lucide-react";

export function RepoPrButton() {
  const router = useRouter();
  const { owner, repo, defaultBranch } = useRepo();
  const { config } = useConfig();
  const { isUserBranch, hasPendingChanges, createPullRequest } = useBranchEdit();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(`Update content in ${config?.branch || ''}`);
  const [description, setDescription] = useState("");
  
  // Only show the button if this is a user branch and there are pending changes
  if (!isUserBranch || !hasPendingChanges) {
    return null;
  }
  
  const handleCreatePR = async () => {
    setIsSubmitting(true);
    
    try {
      await createPullRequest(title, description);
      
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
