"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { useBranchEdit } from "@/contexts/branch-edit-context";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, GitCompare, AlertCircle } from "lucide-react";

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: {
    name: string;
    email: string;
  };
}

export function RepoSyncChanges() {
  const router = useRouter();
  const { owner, repo } = useRepo();
  const { config } = useConfig();
  const { isUserBranch, hasPendingChanges } = useBranchEdit();
  
  const [hasExternalChanges, setHasExternalChanges] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCommit, setLastCommit] = useState<CommitInfo | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Check for external changes when the component mounts and periodically
  useEffect(() => {
    if (!config) return;
    
    const checkForChanges = async () => {
      if (isChecking || !config) return;
      
      setIsChecking(true);
      try {
        const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/changes`);
        if (!response.ok) {
          throw new Error(`Failed to check for changes: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.status === "success") {
          setHasExternalChanges(data.hasChanges);
          if (data.lastCommit) {
            setLastCommit(data.lastCommit);
          }
        } else {
          console.error("Error checking for changes:", data.message);
        }
      } catch (error) {
        console.error("Error checking for changes:", error);
      } finally {
        setIsChecking(false);
        setLastChecked(new Date());
      }
    };
    
    // Check immediately on mount
    checkForChanges();
    
    // Then check every 5 minutes
    const interval = setInterval(checkForChanges, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [config]);
  
  // Don't show anything if this isn't a user branch or if there are no external changes
  if (!isUserBranch || !hasExternalChanges) {
    return null;
  }
  
  const handleSync = async () => {
    if (!config) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/sync`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync changes: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Changes synchronized successfully");
        setHasExternalChanges(false);
        
        // Refresh the page to show the updated content
        router.refresh();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error("Error syncing changes:", error);
      toast.error(error.message || "Failed to sync changes");
    } finally {
      setIsSyncing(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>External Changes Detected</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          There are changes to this branch that were made outside of the CMS.
          {lastCommit && (
            <>
              {" "}Last commit: <strong>{lastCommit.message}</strong> by {lastCommit.author.name} on {formatDate(lastCommit.date)}.
            </>
          )}
        </p>
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setHasExternalChanges(false)}
            disabled={isChecking || isSyncing}
          >
            Dismiss
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsChecking(true);
              setLastChecked(new Date());
              fetch(`/api/${config?.owner}/${config?.repo}/${encodeURIComponent(config?.branch || '')}/changes`)
                .then(res => res.json())
                .then(data => {
                  if (data.status === "success") {
                    setHasExternalChanges(data.hasChanges);
                    if (data.lastCommit) {
                      setLastCommit(data.lastCommit);
                    }
                  }
                })
                .catch(err => console.error(err))
                .finally(() => setIsChecking(false));
            }}
            disabled={isChecking || isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Again
          </Button>
          <Button 
            onClick={handleSync}
            disabled={isChecking || isSyncing || hasPendingChanges}
          >
            <GitCompare className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Changes
          </Button>
        </div>
        {hasPendingChanges && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
            You have unsaved changes. Save or discard them before syncing external changes.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
