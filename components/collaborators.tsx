"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { handleRemoveCollaborator, handleAddCollaborator, checkInvitationStatus } from "@/lib/actions/collaborator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { Message } from "@/components/message";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Ban, Loader, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react";

export function Collaborators({
  owner,
  repo,
  branch
}: {
  owner: string,
  repo: string,
  branch?: string
}) {
  // TODO: add support for branches and accounts collaborators
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [addCollaboratorState, addCollaboratorAction] = useFormState(handleAddCollaborator, { message: "", data: [] });
  const [username, setUsername] = useState<string>("");
  const [removing, setRemoving] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // TODO: remove this, we can probably let error.tsx catch that
  const [error, setError] = useState<string | undefined | null>(null);

  const isUsernameInList = useMemo(() => 
    collaborators.some(collaborator => 
      collaborator.githubUsername?.toLowerCase() === username.toLowerCase()
    ), 
    [username, collaborators]
  );

  const addNewCollaborator = useCallback((newCollaborator: any) => {
    setCollaborators(prevCollaborators => [...prevCollaborators, ...newCollaborator]);
  }, []);

  useEffect(() => {
    async function fetchCollaborators() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/collaborators/${owner}/${repo}`);

        if (!response.ok) throw new Error(`Failed to fetch collection: ${response.status} ${response.statusText}`);

        const data: any = await response.json();

        if (data.status !== "success") throw new Error(data.message);

        setCollaborators(data.data);

        if (data.data.errors && data.data.errors.length > 0) {
          data.data.errors.forEach((error: any) => toast.error(error));
        }
      } catch (error: any) {
        console.error(error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCollaborators();
  }, [owner, repo, branch]);

  const handleConfirmRemove = async (collaboratorId: number) => {
    setRemoving([...removing, collaboratorId]);
    
    try {
      const removed = await handleRemoveCollaborator(collaboratorId, owner, repo);
      
      if (removed.error) {
        toast.error(removed.error);
      } else {
        setCollaborators(collaborators.filter((collaborator) => collaborator.id !== collaboratorId));
        toast.success(removed.message);
      }
    } catch(error: any) {
      toast.error(error.message);
    } finally {
      setRemoving(removing.filter((id) => id !== collaboratorId));
    }
  }

  const handleRefreshStatus = async (collaboratorId: number) => {
    setRefreshing([...refreshing, collaboratorId]);
    
    try {
      const result = await checkInvitationStatus(owner, repo, collaboratorId);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.status) {
        // Update the collaborator status in the local state
        setCollaborators(collaborators.map(collaborator => 
          collaborator.id === collaboratorId 
            ? { ...collaborator, invitationStatus: result.status } 
            : collaborator
        ));
        
        toast.success(`Invitation status: ${result.status}`);
      }
    } catch(error: any) {
      toast.error(error.message);
    } finally {
      setRefreshing(refreshing.filter((id) => id !== collaboratorId));
    }
  }

  useEffect(() => {
    if (addCollaboratorState?.message) {
      if (addCollaboratorState.data && addCollaboratorState.data.length > 0) {
        addNewCollaborator(addCollaboratorState.data);
      }
      
      toast.success(addCollaboratorState.message, { duration: 10000});
      setUsername("");
    }
  }, [addCollaboratorState, addNewCollaborator]);

  const loadingSkeleton = useMemo(() => (
    <ul>
      <li className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-5 w-24 text-left rounded" />
        <Button variant="outline" size="xs" className="ml-auto" disabled>
          Remove
        </Button>
      </li>
    </ul>
  ), []);

  if (error) {
    return (
      <Message
        title="Something's wrong"
        description={`We could not fetch the list of collaborators.`}
        className="absolute inset-0"
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {/* <pre>{JSON.stringify(collaborators, null, 2)}</pre> */}
      {isLoading
        ? loadingSkeleton
        : collaborators.length > 0
          ? <ul>
              {collaborators.map((collaborator: any) => (
                <li key={collaborator.id} className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage 
                      src={collaborator.githubUsername 
                        ? `https://github.com/${collaborator.githubUsername}.png` 
                        : `https://unavatar.io/${collaborator.email}?fallback=false`} 
                      alt={`${collaborator.githubUsername || collaborator.email}'s avatar`} 
                    />
                    <AvatarFallback className="font-medium text-muted-foreground uppercase text-xs">
                      {collaborator.githubUsername 
                        ? collaborator.githubUsername.substring(0, 2) 
                        : collaborator.email 
                          ? collaborator.email.split('@')[0].substring(0, 2)
                          : "??"
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="font-medium text-left truncate">
                      {collaborator.githubUsername || collaborator.email}
                    </div>
                    {collaborator.invitationStatus && (
                      <div className="text-xs flex items-center gap-1">
                        {collaborator.invitationStatus === "pending" && (
                          <>
                            <Clock className="h-3 w-3 text-yellow-500" />
                            <span className="text-muted-foreground">Pending</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 ml-1" 
                              onClick={() => handleRefreshStatus(collaborator.id)}
                              disabled={refreshing.includes(collaborator.id)}
                            >
                              <RefreshCw className={`h-3 w-3 ${refreshing.includes(collaborator.id) ? 'animate-spin' : ''}`} />
                            </Button>
                          </>
                        )}
                        {collaborator.invitationStatus === "accepted" && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground">Accepted</span>
                          </>
                        )}
                        {collaborator.invitationStatus === "declined" && (
                          <>
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span className="text-muted-foreground">Declined</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="xs" className="ml-auto" disabled={removing.includes(collaborator.id)}>
                        Remove
                        {removing.includes(collaborator.id) && (<Loader className="ml-2 h-4 w-4 animate-spin" />)}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove access to &quot;{owner}/{repo}&quot; for &quot;{collaborator.githubUsername || collaborator.email}&quot;.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConfirmRemove(collaborator.id)}>Remove collaborator</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          : <div className="bg-accent text-muted-foreground text-sm px-3 py-2 rounded-md flex items-center justify-center h-[50px]">
              <Ban className="h-4 w-4 mr-2"/>
              No collaborators
            </div>
      }
      <form action={addCollaboratorAction} className="flex gap-x-2">
        <div className="w-full">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="repo" value={repo} />
          <Input
            type="text"
            name="username"
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {addCollaboratorState?.error &&
            <div className="text-sm font-medium text-destructive mt-2 ">{addCollaboratorState.error}</div>
          }
        </div>
        <SubmitButton type="submit" disabled={isUsernameInList}>
          Invite collaborator
        </SubmitButton>
      </form>
    </div>
  )
}
