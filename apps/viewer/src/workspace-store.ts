export type Lang = "zh" | "en";
import type {
  NodeType,
  WorkspaceFolderOption,
  WorkspaceNode,
  WorkspaceTreeState,
} from "./workspace-tree-types.ts";

const STORAGE_KEY = "a2learn.workspace.tree.v2";
const LEGACY_STORAGE_KEY = "a2learn.recent-projects.v1";

type Listener = (state: WorkspaceTreeState) => void;
const listeners: Set<Listener> = new Set();

/**
 * Builds the initial curated / built-in series nodes mapped to real LOCAL_EXAMPLES.
 */
function getBuiltinNodes(lang: Lang): Record<string, WorkspaceNode> {
  const nodes: Record<string, WorkspaceNode> = {};
  const now = new Date().toISOString();

  // 1. AI 核心与前沿系列 (AI & Frontiers)
  const aiFolderId = "curated_ai_series";
  nodes[aiFolderId] = {
    id: aiFolderId,
    title: lang === "zh" ? "🤖 现代 AI 核心前沿" : "🤖 Modern AI & Frontiers",
    type: "folder",
    parentId: null,
    icon: "🤖",
    isBuiltin: true,
    category: "ai",
    createdAt: now,
    updatedAt: now,
    order: 1,
  };

  const aiLessons = [
    {
      id: "paper-attention",
      title: lang === "zh" ? "01. Transformer 注意力机制" : "01. Transformer Attention",
      icon: "🔍",
    },
    {
      id: "agent-react",
      title: lang === "zh" ? "02. ReAct Agent 智能体架构" : "02. ReAct Agent Architecture",
      icon: "🤖",
    },
    {
      id: "biophysics-ai",
      title: lang === "zh" ? "03. AlphaFold 生物物理 AI" : "03. AlphaFold Biophysics AI",
      icon: "🧬",
    },
  ];

  aiLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: aiFolderId,
      icon: lesson.icon,
      isBuiltin: true,
      category: "ai",
      createdAt: now,
      updatedAt: now,
      order: index + 1,
    };
  });

  // 2. 计算机与核心算法 (Computing & Systems)
  const compFolderId = "curated_computing";
  nodes[compFolderId] = {
    id: compFolderId,
    title: lang === "zh" ? "💻 计算机与核心算法" : "💻 Computer Systems & Web",
    type: "folder",
    parentId: null,
    icon: "💻",
    isBuiltin: true,
    category: "computing",
    createdAt: now,
    updatedAt: now,
    order: 2,
  };

  const compLessons = [
    {
      id: "hash-table",
      title: lang === "zh" ? "Hash Table 哈希冲突机制" : "Hash Table & Collisions",
      icon: "⚡",
    },
    {
      id: "js-async",
      title: lang === "zh" ? "JS 异步机制与事件循环" : "JS Async & Event Loop",
      icon: "⏱️",
    },
    {
      id: "conversational",
      title: lang === "zh" ? "JS 闭包与作用域模块化" : "JS Closures & Scope",
      icon: "📦",
    },
    {
      id: "non-linear",
      title: lang === "zh" ? "CSS Grid 二维响应式布局" : "CSS Grid 2D Layout",
      icon: "🎨",
    },
  ];

  compLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: compFolderId,
      icon: lesson.icon,
      isBuiltin: true,
      category: "computing",
      createdAt: now,
      updatedAt: now,
      order: index + 1,
    };
  });

  // 3. 诗词意境与文学赏析 (Poetry & Literature)
  const humFolderId = "curated_humanities";
  nodes[humFolderId] = {
    id: humFolderId,
    title: lang === "zh" ? "🏮 经典诗词与文学赏析" : "🏮 Classical Poetry Reading",
    type: "folder",
    parentId: null,
    icon: "🏮",
    isBuiltin: true,
    category: "poetry",
    createdAt: now,
    updatedAt: now,
    order: 3,
  };

  const humLessons = [
    {
      id: "deng-gao",
      title: lang === "zh" ? "杜甫《登高》· 七律与镜头解码" : "Du Fu: Climbing the Height",
      icon: "🏔️",
    },
    {
      id: "poetry-social",
      title: lang === "zh" ? "《春江花月夜》· 词境重现" : "Spring River Moon Night",
      icon: "🌙",
    },
  ];

  humLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: humFolderId,
      icon: lesson.icon,
      isBuiltin: true,
      category: "poetry",
      createdAt: now,
      updatedAt: now,
      order: index + 1,
    };
  });

  return nodes;
}

/**
 * Migrates legacy recent-projects entries into workspace user lessons.
 */
function getMigratedLegacyNodes(): Record<string, WorkspaceNode> {
  const nodes: Record<string, WorkspaceNode> = {};
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          if (item && item.id && item.title) {
            nodes[item.id] = {
              id: item.id,
              title: item.title,
              type: "lesson",
              parentId: null,
              icon: "📄",
              isBuiltin: false,
              createdAt: item.openedAt || new Date().toISOString(),
              updatedAt: item.openedAt || new Date().toISOString(),
              order: idx + 1,
            };
          }
        });
      }
    }
  } catch {
    // Ignore migration parse errors
  }
  return nodes;
}

class WorkspaceStore {
  private state: WorkspaceTreeState;
  private currentLang: Lang = "zh";

  constructor() {
    this.state = this.loadState();
  }

  public setLang(lang: Lang): void {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    // Refresh built-in node titles in-place
    const builtins = getBuiltinNodes(lang);
    Object.keys(builtins).forEach((id) => {
      if (this.state.nodes[id] && this.state.nodes[id].isBuiltin) {
        this.state.nodes[id].title = builtins[id].title;
      }
    });
    this.notify();
  }

  public getState(): WorkspaceTreeState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  private notify(): void {
    this.saveState();
    listeners.forEach((l) => l(this.state));
  }

  private loadState(): WorkspaceTreeState {
    const now = new Date().toISOString();
    const defaultBuiltins = getBuiltinNodes(this.currentLang);
    const legacyNodes = getMigratedLegacyNodes();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2 && typeof parsed.nodes === "object") {
          // Merge builtins to ensure updated metadata
          const mergedNodes: Record<string, WorkspaceNode> = {
            ...defaultBuiltins,
            ...parsed.nodes,
          };
          // Ensure all built-in nodes always keep isBuiltin: true
          Object.keys(defaultBuiltins).forEach((id) => {
            if (mergedNodes[id]) {
              mergedNodes[id].isBuiltin = true;
              mergedNodes[id].parentId = defaultBuiltins[id].parentId;
              mergedNodes[id].icon = defaultBuiltins[id].icon;
            }
          });
          return {
            version: 2,
            nodes: mergedNodes,
            collapsedFolderIds: Array.isArray(parsed.collapsedFolderIds) ? parsed.collapsedFolderIds : [],
            activeNodeId: typeof parsed.activeNodeId === "string" ? parsed.activeNodeId : null,
          };
        }
      }
    } catch {
      // Fallback
    }

    return {
      version: 2,
      nodes: {
        ...defaultBuiltins,
        ...legacyNodes,
      },
      collapsedFolderIds: [],
      activeNodeId: null,
    };
  }

  private saveState(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage quota or private mode protection
    }
  }

  // --- CRUD Operations ---

  public createFolder(title: string, icon = "📁", parentId: string | null = null): string {
    const id = "folder_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    const now = new Date().toISOString();
    this.state.nodes[id] = {
      id,
      title: title.trim() || (this.currentLang === "zh" ? "新建文件夹" : "New Folder"),
      type: "folder",
      parentId,
      icon,
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    };
    // Ensure parent is expanded so the new folder is immediately visible
    if (parentId) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((fId) => fId !== parentId);
    }
    this.notify();
    return id;
  }

  public renameNode(nodeId: string, newTitle: string): boolean {
    const node = this.state.nodes[nodeId];
    if (!node || node.isBuiltin) return false;
    const trimmed = newTitle.trim();
    if (!trimmed) return false;
    node.title = trimmed;
    node.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  public moveNode(nodeId: string, targetFolderId: string | null): boolean {
    const node = this.state.nodes[nodeId];
    if (!node || node.isBuiltin) return false;

    // Check if targetFolder is valid
    if (targetFolderId !== null) {
      const targetFolder = this.state.nodes[targetFolderId];
      if (!targetFolder || targetFolder.type !== "folder") return false;

      // Prevent moving a folder into itself or its own descendants (Cycle detection)
      if (node.type === "folder") {
        if (nodeId === targetFolderId) return false;
        let currentParent: string | null = targetFolder.parentId;
        while (currentParent) {
          if (currentParent === nodeId) return false; // Cycle detected!
          currentParent = this.state.nodes[currentParent]?.parentId || null;
        }
      }
    }

    node.parentId = targetFolderId;
    node.updatedAt = new Date().toISOString();
    // Expand the target folder so the moved item is visible
    if (targetFolderId) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((fId) => fId !== targetFolderId);
    }
    this.notify();
    return true;
  }

  public deleteNode(nodeId: string): boolean {
    const node = this.state.nodes[nodeId];
    if (!node || node.isBuiltin) return false;

    // If it's a folder, re-parent its children to this folder's parent (prevent losing lessons)
    if (node.type === "folder") {
      Object.values(this.state.nodes).forEach((child) => {
        if (child.parentId === nodeId) {
          child.parentId = node.parentId;
          child.updatedAt = new Date().toISOString();
        }
      });
    }

    delete this.state.nodes[nodeId];
    this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((fId) => fId !== nodeId);
    if (this.state.activeNodeId === nodeId) {
      this.state.activeNodeId = null;
    }
    this.notify();
    return true;
  }

  public toggleFolderCollapse(folderId: string): void {
    const isCollapsed = this.state.collapsedFolderIds.includes(folderId);
    if (isCollapsed) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((id) => id !== folderId);
    } else {
      this.state.collapsedFolderIds.push(folderId);
    }
    this.notify();
  }

  public setActiveNode(nodeId: string | null): void {
    this.state.activeNodeId = nodeId;
    // Automatically expand ancestor folders of the active node
    if (nodeId && this.state.nodes[nodeId]) {
      let pId = this.state.nodes[nodeId].parentId;
      while (pId) {
        this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((id) => id !== pId);
        pId = this.state.nodes[pId]?.parentId || null;
      }
    }
    this.notify();
  }

  public recordNewGeneration(projectId: string, title: string, parentFolderId: string | null = null): void {
    const now = new Date().toISOString();
    this.state.nodes[projectId] = {
      id: projectId,
      title: title.trim() || (this.currentLang === "zh" ? "AI 生成课程" : "Generated Course"),
      type: "lesson",
      parentId: parentFolderId,
      icon: "✨",
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    };
    this.state.activeNodeId = projectId;
    if (parentFolderId) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((id) => id !== parentFolderId);
    }
    this.notify();
  }

  // --- Tree Queries ---

  public getChildren(parentId: string | null, isBuiltinOnly?: boolean): WorkspaceNode[] {
    return Object.values(this.state.nodes)
      .filter((n) => {
        if (n.parentId !== parentId) return false;
        if (isBuiltinOnly !== undefined && Boolean(n.isBuiltin) !== isBuiltinOnly) return false;
        return true;
      })
      .sort((a, b) => {
        // Folders first, then lessons
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title);
      });
  }

  /**
   * Returns a flattened list of user-created folders for select dropdowns.
   */
  public getUserFolderOptions(excludeSubtreeOf?: string): WorkspaceFolderOption[] {
    const options: WorkspaceFolderOption[] = [];

    const traverse = (parentId: string | null, depth: number) => {
      const folders = Object.values(this.state.nodes).filter(
        (n) => n.type === "folder" && !n.isBuiltin && n.parentId === parentId,
      );
      for (const folder of folders) {
        if (excludeSubtreeOf && folder.id === excludeSubtreeOf) continue;
        options.push({
          id: folder.id,
          title: folder.title,
          icon: folder.icon || "📁",
          depth,
        });
        traverse(folder.id, depth + 1);
      }
    };

    traverse(null, 0);
    return options;
  }
}

export const workspaceStore = new WorkspaceStore();
