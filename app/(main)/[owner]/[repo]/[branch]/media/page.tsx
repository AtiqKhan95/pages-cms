"use client";

import { useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { MediaView} from "@/components/media/media-view";
import { Message } from "@/components/message";

export default function Page({
  params,
  searchParams
}: {
  params: {
    owner: string;
    repo: string;
    branch: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const path = typeof searchParams.path === "string"
    ? searchParams.path
    : undefined;

  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  return (
    <div className="max-w-screen-xl mx-auto flex-1 flex flex-col h-full">
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b">
        <h1 className="font-semibold text-lg">Media</h1>
      </header>
      <div className="flex flex-col relative flex-1">
        <MediaView path={path}/>
      </div>
    </div>
  );
}