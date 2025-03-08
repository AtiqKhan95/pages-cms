"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils";
import { Check, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RepoBranches() {
  const router = useRouter();
  const { owner, repo, branches, setBranches } = useRepo();
  const { config } = useConfig();

  const [search, setSearch] = useState("");
  const [filteredBranches, setFilteredBranches] = useState<string[] | undefined>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingBranch, setPendingBranch] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Listen for form changes
  useEffect(() => {
    const forms = document.querySelectorAll('form');
    const handleChange = () => setHasUnsavedChanges(true);
    
    forms.forEach(form => {
      form.addEventListener('change', handleChange);
    });

    return () => {
      forms.forEach(form => {
        form.removeEventListener('change', handleChange);
      });
    };
  }, []);

  useEffect(() => {
    setFilteredBranches(
      branches?.filter((branch) =>
        branch.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, branches]);

  const handleBranchClick = (branch: string) => {
    if (hasUnsavedChanges) {
      setPendingBranch(branch);
      setShowUnsavedDialog(true);
    } else {
      router.push(`/${owner}/${repo}/${encodeURIComponent(branch)}`);
    }
  };

  const handleConfirmSwitch = () => {
    if (pendingBranch) {
      setHasUnsavedChanges(false);
      router.push(`/${owner}/${repo}/${encodeURIComponent(pendingBranch)}`);
      setShowUnsavedDialog(false);
      setPendingBranch(null);
    }
  };

  const isValidBranchName = useCallback((name: string) => {
    if (!name || name.length > 255) return false;
    const validBranchRegex = /^(?!\/|.*(?:\/\.|\/\/|\.\.|@{|\\))[^\x20\x7f ~^:?*\[\]]+(?<!\.|\/)$/;
    return validBranchRegex.test(name);
  }, []);

  const handleCreateBranch = async () => {
    if (config) {
      if (search && isValidBranchName(search)) {
        setIsSubmitting(true);
        try {
          const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/branches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: search
            }),
          });
          if (!response.ok) throw new Error(`Failed to create branch: ${response.status} ${response.statusText}`);
          
          const data: any = await response.json();
      
          if (data.status !== "success") throw new Error(data.message);

          if (branches) {
            setBranches([...branches, search]);
          } else {
            setBranches([search]);
          }
        } catch (error) {
          console.error("Error creating branch:", error);
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const userBranches = filteredBranches?.filter(b => b.startsWith("content-changes/")) || [];
  const mainBranches = filteredBranches?.filter(b => !b.startsWith("content-changes/")) || [];

  if (!branches || branches.length === 0) {
    return <div className="text-muted-foreground p-4">No branches.</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <header className="flex gap-x-2">
          <Input
            placeholder="Search branches by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            disabled={!search || !isValidBranchName(search) || branches.includes(search) || isSubmitting}
            onClick={handleCreateBranch}>
            Create
            {isSubmitting && (<Loader className="ml-2 h-4 w-4 animate-spin" />)}
          </Button>
        </header>
        <main className="flex flex-col gap-y-1 overflow-auto max-h-[calc(100vh-9rem)] scrollbar">
          {userBranches.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">Your Working Branches</h3>
              {userBranches.map(branch => (
                <button
                  key={branch}
                  className={cn(
                    branch === config?.branch
                      ? "bg-accent cursor-default"
                      : "hover:bg-accent",
                    "inline-flex items-center rounded-lg px-3 py-2 transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-left"
                  )}
                  onClick={() => handleBranchClick(branch)}
                >
                  <span className="truncate">{branch}</span>
                  {branch === config?.branch && <Check className="h-4 w-4 ml-auto opacity-50" />}
                </button>
              ))}
              <div className="border-t my-2" />
            </>
          )}
          {mainBranches.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">Main Branches</h3>
              {mainBranches.map(branch => (
                <button
                  key={branch}
                  className={cn(
                    branch === config?.branch
                      ? "bg-accent cursor-default"
                      : "hover:bg-accent",
                    "inline-flex items-center rounded-lg px-3 py-2 transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-left"
                  )}
                  onClick={() => handleBranchClick(branch)}
                >
                  <span className="truncate">{branch}</span>
                  {branch === config?.branch && <Check className="h-4 w-4 ml-auto opacity-50" />}
                </button>
              ))}
            </>
          )}
          {filteredBranches?.length === 0 && (
            <div className="text-muted-foreground py-6 text-center">No branches found.</div>
          )}
        </main>
      </div>

      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to discard them and switch branches?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmSwitch}>
              Discard Changes & Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}