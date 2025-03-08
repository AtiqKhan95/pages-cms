'use client';

import * as React from 'react';
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/components/providers/repo-provider";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function WorkingBranchControls(): React.ReactElement | null {
  const router = useRouter();
  const { config } = useConfig();
  const { owner, repo, branches, defaultBranch } = useRepo();
  const { user } = useUser();
  const [isCreatingBranch, setIsCreatingBranch] = React.useState(false);
  const [isCreatingPR, setIsCreatingPR] = React.useState(false);
  const [showBranchDialog, setShowBranchDialog] = React.useState(false);
  const [branchName, setBranchName] = React.useState("");
  const [prTitle, setPrTitle] = React.useState("");
  const [prDescription, setPrDescription] = React.useState("");
  const [targetBranch, setTargetBranch] = React.useState(defaultBranch || "");

  if (!config) {
    return null;
  }

  const handleCreateWorkingBranch = async () => {
    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }

    setIsCreatingBranch(true);
    try {
      const username = user?.githubUsername?.toLowerCase() || 'unknown';
      const timestamp = new Date().getTime();
      // Sanitize branch name: replace spaces with hyphens, remove special characters
      const sanitizedBranchName = branchName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-') // Replace any non-alphanumeric chars with hyphens
        .replace(/-+/g, '-') // Replace multiple consecutive hyphens with a single one
        .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens

      const fullBranchName = `content-changes/${username}/${sanitizedBranchName}-${timestamp}`;

      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullBranchName,
        }),
      });

      if (!response.ok) throw new Error(`Failed to create branch: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (data.status !== "success") throw new Error(data.message);

      // Navigate to the new branch
      router.push(`/${owner}/${repo}/${encodeURIComponent(fullBranchName)}`);
      toast.success("Created new working branch");
      setShowBranchDialog(false);
      setBranchName("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleCreatePullRequest = async () => {
    setIsCreatingPR(true);
    try {
      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/pull-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prTitle,
          body: prDescription,
          baseBranch: targetBranch,
        }),
      });

      if (!response.ok) throw new Error(`Failed to create pull request: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (data.status !== "success") throw new Error(data.message);

      toast.success("Created pull request successfully");
      router.push(`/${owner}/${repo}/${encodeURIComponent(targetBranch)}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsCreatingPR(false);
    }
  };

  // Only show "Submit changes for review" if we're on a working branch
  const isWorkingBranch = config.branch.startsWith("content-changes/");

  return (
    <div className="flex items-center gap-x-2">
      {!isWorkingBranch ? (
        <>
          <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
            <DialogTrigger asChild>
              <Button>Add/edit content</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Working Branch</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="branch-name">Branch Name</label>
                  <Input
                    id="branch-name"
                    value={branchName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBranchName(e.target.value)}
                    placeholder="e.g., update-blog-post"
                  />
                  <p className="text-sm text-muted-foreground">
                    Final branch name will be sanitized (spaces and special characters replaced with hyphens) and formatted as:<br />
                    content-changes/{user?.githubUsername?.toLowerCase() || 'unknown'}/{branchName ? branchName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : 'branch-name'}-timestamp
                  </p>
                </div>
                <Button
                  onClick={handleCreateWorkingBranch}
                  disabled={isCreatingBranch || !branchName.trim()}
                >
                  Create Branch
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default">Submit changes for review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Pull Request</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="pr-title">Title</label>
                <Input
                  id="pr-title"
                  value={prTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrTitle(e.target.value)}
                  placeholder="Content changes"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="pr-description">Description (optional)</label>
                <Textarea
                  id="pr-description"
                  value={prDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrDescription(e.target.value)}
                  placeholder="Describe your changes..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="target-branch">Target Branch</label>
                <Select
                  value={targetBranch}
                  onValueChange={setTargetBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.filter((b: string) => !b.startsWith("content-changes/")).map((branch: string) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreatePullRequest}
                disabled={!prTitle || !targetBranch || isCreatingPR}
              >
                Create Pull Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 