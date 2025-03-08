"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";
import { FileStack, FileText, Image as ImageIcon, Settings, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

const RepoNavItem = ({
  children,
  href,
  icon,
  active,
  onClick
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    className={cn(
      active ? "bg-accent" : "hover:bg-accent",
      "flex items-center rounded-lg px-3 py-2 font-medium focus:bg-accent outline-none"
    )}
    href={href}
    onClick={onClick}
  >
    {icon}
    <span className="truncate">{children}</span>
  </Link>
);

export function RepoNav() {
  const { config } = useConfig();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const isWorkingBranch = config?.branch.startsWith("content-changes/");

  const items = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    const contentItems = configObject.content?.map((item: any) => ({
      key: item.name,
      icon: item.type === "collection"
        ? <FileStack className="h-5 w-5 mr-2" />
        : <FileText className="h-5 w-5 mr-2" />
      ,
      href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${item.type}/${encodeURIComponent(item.name)}`,
      label: item.label || item.name,
    })) || [];

    const mediaItem = configObject.media?.input && configObject.media?.output
      ? {
          key: "media",
          icon: <ImageIcon className="h-5 w-5 mr-2" />,
          href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media`,
          label: "Media"
        }
      : null;

    const settingsItem = configObject.settings !== false
      ? {
          key: "settings",
          icon: <Settings className="h-5 w-5 mr-2" />,
          href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/settings`,
          label: "Settings"
        }
      : null;

    const collaboratorsItem = configObject && Object.keys(configObject).length !== 0 && user?.githubId
      ? {
          key: "collaborators",
          icon: <Users className="h-5 w-5 mr-2" />,
          href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collaborators`,
          label: "Collaborators"
        }
      : null;

    return [
      ...contentItems,
      mediaItem,
      settingsItem,
      collaboratorsItem
    ].filter(Boolean);
  }, [config, user?.githubId]);

  if (!items.length) return null;

  return (
    <nav className="flex items-center gap-x-2">
      {isWorkingBranch && items.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Add an entry
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onClick={() => router.push(item.href)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {items.map(item => (
        <RepoNavItem
          key={item.key}
          icon={item.icon}
          href={item.href}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
        >
          {item.label}
        </RepoNavItem>
      ))}
    </nav>
  );
}