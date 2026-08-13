import type { Lang } from "./generation-profile";

export type NodeType = "folder" | "lesson";

export interface WorkspaceNode {
  id: string; // Unique ID (project_id or example_id or folder uuid)
  title: string; // Display title, editable by user
  type: NodeType;
  parentId: string | null; // null for top-level root items
  isBuiltin?: boolean; // If true, this is a read-only curated example/series
  isGenerating?: boolean; // If true, this lesson is currently being generated
  category?: string; // Optional group or category key for built-in items
  description?: string;
  createdAt: string;
  updatedAt: string;
  order?: number; // Sorting order within same parent
}

export interface WorkspaceTreeState {
  version: 2;
  nodes: Record<string, WorkspaceNode>;
  collapsedFolderIds: string[];
  activeNodeId: string | null;
}

export interface WorkspaceFolderOption {
  id: string;
  title: string;
  depth: number;
}
