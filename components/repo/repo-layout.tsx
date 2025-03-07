"use client";

import { useEffect, useState } from "react";
import { RepoSidebar } from "@/components/repo/repo-sidebar";
import {Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepoDropdown } from "@/components/repo/repo-dropdown";
import { WorkingBranchControls } from "@/components/repo/working-branch-controls";

export function RepoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const handleMenuClose = () => setMenuOpen(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    if (isMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <RepoDropdown />
        <WorkingBranchControls />
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}