"use client";

import { useState, useEffect } from "react";
import { getRawUrl } from "@/lib/githubImage";
import { useRepo } from "@/components/providers/repo-provider";
import { useConfig } from "@/contexts/config-context";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/loader";
import { Ban, ImageOff } from "lucide-react";

export function Thumbnail({
  path,
  className
}: {
  path: string | null;
  className?: string;
}) {
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [error, setError] = useState(null);

  const { owner, repo, isPrivate } = useRepo();
  
  const { config } = useConfig();
  const branch = config?.branch!;
  
  useEffect(() => {
    const fetchRawUrl = async () => {
      if (path) {
        setError(null);
        setRawUrl(null);
        try {
          const url = await getRawUrl(owner, repo, branch, path, isPrivate);
          setRawUrl(url);
        } catch (error: any) {
          setError(error.message);
        }
      }
    };

    fetchRawUrl();
  }, [path, owner, repo, branch, isPrivate]);

  // if (!path) return null;

  return (
    <div
      className={cn(
        "bg-muted w-full aspect-square overflow-hidden relative",
        className
      )}
    >
      {path
        ? rawUrl
          ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${rawUrl}")` }} title={path}></div>
          : error
            ? <div className="flex justify-center items-center absolute inset-0 text-muted-foreground" title={error}>
                <Ban className="h-4 w-4"/>
              </div>
            : <Loader className="absolute inset-0 text-muted-foreground"/>
        : <div className="flex justify-center items-center absolute inset-0 text-muted-foreground" title="No image">
            <ImageOff className="h-4 w-4"/>
          </div>
      }
    </div>
  );
};