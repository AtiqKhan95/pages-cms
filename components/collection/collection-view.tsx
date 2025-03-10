"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useBranchEdit } from "@/contexts/branch-edit-context";
import { RepoMakeChangesButton } from "@/components/repo/repo-make-changes-button";
import {
  getParentPath,
  getFileName,
  normalizePath,
  sortFiles
} from "@/lib/utils/file";
import { viewComponents } from "@/fields/registry";
import { getSchemaByName, getPrimaryField, getFieldByPath, safeAccess } from "@/lib/schema";
import { EmptyCreate } from "@/components/empty-create";
import { FileOptions } from "@/components/file-options";
import { CollectionTable } from "./collection-table";
import { FolderCreate} from "@/components/folder-create";
import { Message } from "@/components/message";
import { PathBreadcrumb } from "@/components/path-breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CornerLeftUp,
  Ellipsis,
  Folder,
  FolderPlus,
  GitBranch,
  Plus,
  Search
} from "lucide-react";

export function CollectionView({
  name,
  path,
}: {
  name: string;
  path?: string;
}) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { config } = useConfig();
  const { canEdit, isContentEditable, selectedRepository } = useBranchEdit();
  if (!config) throw new Error(`Configuration not found.`);

  const schema = useMemo(() => getSchemaByName(config?.object, name), [config, name]);
  if (!schema) throw new Error(`Schema not found for "${name}".`);
  if (schema.type !== "collection") throw new Error(`"${name}" is not a collection.`);

  const viewFields = useMemo(() => {
    let pathAndFieldArray: any[] = [];
    if (schema.fields) {
      if (schema.view?.fields && schema.view?.fields.length > 0) {
        // If we have a list of fields defined for the view
        schema.view.fields.forEach((path: string) => {
          const field = getFieldByPath(schema.fields, path);
          if (field && field.type !== "object") pathAndFieldArray.push({ path: path, field: field });
        });
      } else {
        pathAndFieldArray = schema.fields
          .filter((field: any) => field?.type !== 'object')
          .map((field: any) => ({ path: field.name, field: field }));
      }
    } else {
      pathAndFieldArray.push({
        path: "name",
        field: {
          label: "Name",
          name: "name",
          type: "string"
        }
      });
      if (schema.filename.startsWith("{year}-{month}-{day}")) {
        pathAndFieldArray.push({
          path: "date",
          field: {
            label: "Date",
            name: "date",
            type: "date"
          }
        });
      }
    }

    return pathAndFieldArray;
  }, [schema]);

  const primaryField = useMemo(() => getPrimaryField(schema) ?? "name", [schema]);

  const handleDelete = useCallback((path: string) => {
    setData((prevData) => prevData?.filter((item: any) => item.path !== path));
  }, []);

  // TODO: use proper type (File ?) Same for handleDelete
  const handleRename = useCallback((path: string, newPath: string) => {
    setData((prevData: any) => {
      if (!prevData) return;
      if (getParentPath(normalizePath(path)) === getParentPath(normalizePath(newPath))) {
        const newData = prevData?.map((item: any) => {
          return item.path === path ? { ...item, path: newPath, name: getFileName(newPath) } : item;
        });
        return sortFiles(newData);
      }
      return prevData?.filter((item: any) => item.path !== path);
    });
  }, []);

  const handleFolderCreate = useCallback((entry: any) => {
    const parentPath = getParentPath(entry.path);
    const parent = {
      type: "dir",
      name: getFileName(parentPath),
      path: parentPath,
      size: 0,
      url: null,
    }
    
    setData((prevData) => {
      if (!prevData) return [parent];
      return sortFiles([...prevData, parent]);
    });
  }, []);

  const columns = useMemo(() => {
    let tableColumns: any;
    tableColumns = viewFields.map((pathAndField: any) => {
      const path = pathAndField.path;
      const field = pathAndField.field;
      if (!field) return null;
      
      return {
        accessorKey: path,
        accessorFn: (originalRow: any) => safeAccess(originalRow.object, path),
        header: field?.label ?? field.name,
        meta: { className: field.name === primaryField ? "truncate w-full min-w-[12rem] max-w-[1px]" : "" },
        cell: ({ cell, row }: { cell: any, row: any }) => {
          const cellValue = cell.getValue();
          const FieldComponent = viewComponents?.[field.type];
          const CellView = FieldComponent 
            ? <FieldComponent value={cellValue} field={field}/>
            : Array.isArray(cellValue)
              ? cellValue.join(', ')
              : cellValue;
          if (field.name === primaryField) {
            return (
              <Link
                className={cn(
                  "font-medium truncate",
                  !canEdit || !isContentEditable(row.original.path) ? "pointer-events-none opacity-70" : ""
                )}
                href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(row.original.path)}`}
              >
                {CellView}
              </Link>
            );
          }
          return (
            <div className="truncate w-full max-w-[12rem]">
              {CellView}
            </div>
          );
        },
        sortUndefined: "last"
      };
    }) || [];

    tableColumns.push({
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => {
        // Check if the content is editable based on the selected repository
        const contentIsEditable = isContentEditable(row.original.path);
        
        return (
          <div className="flex gap-1">
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }), 
                "h-8",
                !canEdit || !contentIsEditable ? "pointer-events-none opacity-50" : ""
              )}
              href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${name}/edit/${encodeURIComponent(row.original.path)}`}
              aria-disabled={!canEdit || !contentIsEditable}
              tabIndex={!canEdit || !contentIsEditable ? -1 : undefined}
            >
              Edit
            </Link>
            {canEdit && contentIsEditable && (
              <FileOptions path={row.original.path} sha={row.original.sha} type="collection" name={name} onDelete={handleDelete} onRename={handleRename}>
                <Button variant="outline" size="icon-sm" className="h-8">
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </FileOptions>
            )}
            {canEdit && !contentIsEditable && (
              <Button variant="outline" size="icon-sm" className="h-8 opacity-50" disabled>
                <Ellipsis className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false
    });

    return tableColumns;
  }, [config.owner, config.repo, config.branch, name, viewFields, primaryField, handleDelete, handleRename, canEdit]);

  const initialState = useMemo(() => {
    const sortId = viewFields == null
      ? "name"
      : (
          schema.view?.default?.sort
          || (viewFields.find((item: any) => item.field.name === "date") && "date")
          || primaryField
        );

    return {
      sorting: [{
        id: sortId,
        desc: sortId === "date"
          ? true
          : schema.view?.default?.order === "desc"
            ? true
            : false,
      }],
      pagination: {
        pageSize: 25,
      },
    };
  }, [schema, primaryField, viewFields]);

  const filesData = useMemo(() => data.filter((item: any) => item.type === "file"), [data]);
  
  const foldersData = useMemo(() => data.filter((item: any) => item.type === "dir"), [data]);

  useEffect(() => {
    async function fetchCollection() {
      if (config) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?path=${encodeURIComponent(path || schema.path)}`);
          if (!response.ok) throw new Error(`Failed to fetch collection: ${response.status} ${response.statusText}`);

          const data: any = await response.json();

          if (data.status !== "success") throw new Error(data.message);

          setData(data.data.contents);

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
    }

    fetchCollection();
  }, [config, name, path, schema.path]);

  const handleNavigate = (newPath: string) => {
    // setPath(newPath);
    // Optionally update the URL to reflect the state
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("path", newPath || schema.path);
    router.push(`${pathname}?${params.toString()}`);
  }

  const handleNavigateParent = () => {
    if (!path || path === schema.path) return;
    handleNavigate(getParentPath(path));
  }

  const loadingSkeleton = useMemo(() => (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="pr-3 align-middle h-12">
            <Skeleton className="w-8 h-4 rounded" />
          </th>
          <th className="px-3 align-middle h-12">
            <Skeleton className="w-16 h-4 rounded" />
          </th>
          <th className="px-3 align-middle h-12">
            <Skeleton className="w-12 h-4 rounded" />
          </th>
          <th className="pl-3 align-middle h-12">
            <Skeleton className="w-12 h-4 rounded" />
          </th>
        </tr>
      </thead>
      <tbody>
        {[...Array(5)].map((_, index) => (
          <tr className="border-b" key={index}>
            <td className="p-3 pl-0 align-middle">
              <Skeleton className="h-8 w-8 rounded-md" />
            </td>
            <th className="p-3 align-middle w-full min-w-[12rem] max-w-[1px]">
              <Skeleton className="w-full h-5 rounded" />
            </th>
            <th className="p-3 align-middle">
              <Skeleton className="w-24 h-5 rounded" />
            </th>
            <th className="p-3 pr-0 align-middle">
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8" disabled>Edit</Button>
                <Button variant="outline" size="icon-sm" className="h-8" disabled>
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </div>
            </th>
          </tr>
        ))}
      </tbody>
    </table>
  ), []);
  
  if (error) {
    if (error === "Not found") {
      return (
        <Message
            title="Folder missing"
            description={`The collection folder "${schema.path}" has not been created yet.`}
            className="absolute inset-0"
          >
          <EmptyCreate type="content" name={schema.name}>Create folder</EmptyCreate>
        </Message>
      );
    } else {
      <Message
        title="Something's wrong"
        description={error}
        className="absolute inset-0"
        cta="Go to settings"
        href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/settings`}
      />
    }
  }

  // We no longer block access to the collection view in read-only mode

  return (
    <>
      <div className="flex-1 flex flex-col space-y-6">
        {/* Show Make Changes button in read-only mode */}
        <RepoMakeChangesButton />
        
        {/* Show read-only indicator when not on a user branch */}
        {!canEdit && (
          <div className="bg-muted text-muted-foreground px-4 py-2 rounded-md mb-4 flex items-center">
            <GitBranch className="h-4 w-4 mr-2" />
            <span>You are in read-only mode. Create a branch to make changes.</span>
          </div>
        )}
        
        {/* Show repository selection indicator when on a user branch */}
        {canEdit && selectedRepository && (
          <div className="bg-muted text-muted-foreground px-4 py-2 rounded-md mb-4 flex items-center">
            <GitBranch className="h-4 w-4 mr-2" />
            <span>You are editing content in <strong>{selectedRepository.name}</strong>. Content outside this repository is disabled.</span>
          </div>
        )}
        <header className="flex items-center gap-x-2">
          <div className="sm:flex-1">
            <PathBreadcrumb path={path || schema.path} rootPath={schema.path} handleNavigate={handleNavigate} className="hidden sm:block"/>
            <Button onClick={handleNavigateParent} size="icon-sm" variant="outline" className="shrink-0 sm:hidden" disabled={!path || path === schema.path}>
              <CornerLeftUp className="w-4 h-4"/>
            </Button>
          </div>
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"/>
            <Input className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canEdit && (
            <>
              {/* Only show folder creation and add entry buttons if the current path is editable */}
              {isContentEditable(path || schema.path) ? (
                <>
                  <FolderCreate path={path || schema.path} type="content" name={name} onCreate={handleFolderCreate}>
                    <Button type="button" variant="outline" className="ml-auto shrink-0" size="icon-sm">
                      <FolderPlus className="h-3.5 w-3.5"/>
                    </Button>
                  </FolderCreate>
                  <Link
                    className={cn(buttonVariants({size: "sm"}), "hidden sm:flex")}
                    href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new${path && path !== schema.path ? `?parent=${encodeURIComponent(path)}` : ""}`}
                  >
                      Add an entry
                  </Link>
                  <Link
                    className={cn(buttonVariants({size: "icon-sm"}), "sm:hidden shrink-0")}
                    href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new`}
                  >
                      <Plus className="h-4 w-4"/>
                  </Link>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" className="ml-auto shrink-0" size="icon-sm" disabled>
                    <FolderPlus className="h-3.5 w-3.5"/>
                  </Button>
                  <Button variant="default" size="sm" className="hidden sm:flex opacity-50" disabled>
                    Add an entry
                  </Button>
                  <Button variant="default" size="icon-sm" className="sm:hidden shrink-0 opacity-50" disabled>
                    <Plus className="h-4 w-4"/>
                  </Button>
                </>
              )}
            </>
          )}
        </header>
        {isLoading
          ? loadingSkeleton
          : (
            <>
              <CollectionTable columns={columns} data={filesData} search={search} setSearch={setSearch} initialState={initialState} />
              {foldersData && foldersData.length > 0
                ? <div className="space-y-4">
                    <h2 className="font-medium text-md">Folders</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {foldersData.map((item, index) => 
                        <li key={item.path}>
                          <Link
                            className={cn(buttonVariants({variant: "outline"}), "w-full justify-start gap-x-2")}
                            href={`${pathname}?path=${encodeURIComponent(item.path)}`}
                          >
                            <Folder className="h-4 w-4 shrink-0"/>
                            <span className="truncate">{item.name}</span>
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                : null
              }
            </>
          )
        }
      </div>
    </>
  );
}
