'use client';

import * as React from 'react';
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
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
  const [prTitle, setPrTitle] = React.useState("");
  const [prDescription, setPrDescription] = React.useState("");
  const [targetBranch, setTargetBranch] = React.useState(defaultBranch || "");

  if (!config) {
    return null;
  }

  const handleCreateWorkingBranch = async () => {
    setIsCreatingBranch(true);
    try {
      // Generate a unique branch name with username
      const timestamp = new Date().getTime();
      const username = user?.githubUsername?.toLowerCase() || 'unknown';
      const branchName = `content-changes/${username}/${timestamp}`;

      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchName,
        }),
      });

      if (!response.ok) throw new Error(`Failed to create branch: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (data.status !== "success") throw new Error(data.message);

      // Navigate to the new branch
      router.push(`/${owner}/${repo}/${encodeURIComponent(branchName)}`);
      toast.success("Created new working branch");
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
        <Button 
          onClick={handleCreateWorkingBranch}
          disabled={isCreatingBranch}
        >
          Add/edit content
        </Button>
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