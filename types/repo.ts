export interface Repo {
  id: number;
  owner: string;
  ownerId: number;
  repo: string;
  defaultBranch: string;
  branches: string[];
  isPrivate: boolean;
};