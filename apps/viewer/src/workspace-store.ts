export type Lang = "zh" | "en";
import type {
  WorkspaceFolderOption,
  WorkspaceNode,
  WorkspaceTreeState,
} from "./workspace-tree-types.ts";

const STORAGE_KEY = "a2learn.workspace.tree.v2";
const LEGACY_STORAGE_KEY = "a2learn.recent-projects.v1";

type Listener = (state: WorkspaceTreeState) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createNodeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

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
    title: lang === "zh" ? "人工智能" : "Artificial Intelligence",
    type: "folder",
    parentId: null,
    isBuiltin: true,
    category: "ai",
    createdAt: now,
    updatedAt: now,
    order: 1,
  };

  const aiLessons = [
    {
      id: "paper-attention",
      title: lang === "zh" ? "Transformer 注意力机制" : "Transformer Attention",
    },
    {
      id: "agent-react",
      title: lang === "zh" ? "ReAct 智能体架构" : "ReAct Agent Architecture",
    },
    {
      id: "biophysics-ai",
      title: lang === "zh" ? "AlphaFold 蛋白质预测" : "AlphaFold Structure Prediction",
    },
  ];

  aiLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: aiFolderId,
      isBuiltin: true,
      category: "ai",
      createdAt: now,
      updatedAt: now,
      order: index + 1,
    };
  });

  // 2. 计算机体系 (Computing & Systems)
  const compFolderId = "curated_computing";
  nodes[compFolderId] = {
    id: compFolderId,
    title: lang === "zh" ? "计算机系统" : "Computer Systems",
    type: "folder",
    parentId: null,
    isBuiltin: true,
    category: "computing",
    createdAt: now,
    updatedAt: now,
    order: 2,
  };

  const compLessons = [
    {
      id: "hash-table",
      title: lang === "zh" ? "Hash Table 哈希表" : "Hash Table & Collisions",
      order: 1,
    },
    {
      id: "js-async",
      title: lang === "zh" ? "JS 异步与事件循环" : "JS Async & Event Loop",
      order: 3,
    },
    {
      id: "conversational",
      title: lang === "zh" ? "JS 闭包与作用域" : "JS Closures & Scope",
      order: 4,
    },
    {
      id: "non-linear",
      title: lang === "zh" ? "CSS Grid 网格布局" : "CSS Grid Layout",
      order: 5,
    },
  ];

  compLessons.forEach((lesson) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: compFolderId,
      isBuiltin: true,
      category: "computing",
      createdAt: now,
      updatedAt: now,
      order: lesson.order,
    };
  });

  // 数据库基础
  const databaseFolderId = "curated_database_basics";
  nodes[databaseFolderId] = {
    id: databaseFolderId,
    title: lang === "zh" ? "数据库基础" : "Database Basics",
    type: "folder",
    parentId: compFolderId,
    isBuiltin: true,
    category: "computing-database",
    createdAt: now,
    updatedAt: now,
    order: 2,
  };

  const databaseLessons = [
    { id: "database-basics-lesson-1", title: lang === "zh" ? "1. 什么是数据库" : "Lesson 1: What Is a Database" },
    { id: "database-basics-lesson-2", title: lang === "zh" ? "2. 数据查询基础" : "Lesson 2: Querying Data" },
    { id: "database-basics-lesson-3", title: lang === "zh" ? "3. 数据的增删改" : "Lesson 3: Modifying Data" },
    { id: "database-basics-lesson-4", title: lang === "zh" ? "4. 数据表结构设计" : "Lesson 4: Designing Tables" },
    { id: "database-basics-lesson-5", title: lang === "zh" ? "5. 多表连接查询" : "Lesson 5: Joining Tables" },
    { id: "database-basics-lesson-6", title: lang === "zh" ? "6. 综合实战项目" : "Lesson 6: Hands-on Project" },
  ];

  databaseLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: databaseFolderId,
      isBuiltin: true,
      category: "computing-database",
      createdAt: now,
      updatedAt: now,
      order: index + 1,
    };
  });

  // 3. 文学赏析 (Literature)
  const humFolderId = "curated_humanities";
  nodes[humFolderId] = {
    id: humFolderId,
    title: lang === "zh" ? "文学赏析" : "Literature",
    type: "folder",
    parentId: null,
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
    },
    {
      id: "poetry-social",
      title: lang === "zh" ? "《春江花月夜》· 词境重现" : "Spring River Moon Night",
    },
  ];

  humLessons.forEach((lesson, index) => {
    nodes[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      type: "lesson",
      parentId: humFolderId,
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
            const id = typeof item.id === "string" ? item.id : "";
            const title = typeof item.title === "string" ? item.title : "";
            if (!id || !title) return;
            nodes[id] = {
              id,
              title,
              type: "lesson",
              parentId: null,
              isBuiltin: false,
              createdAt: typeof item.openedAt === "string" ? item.openedAt : new Date().toISOString(),
              updatedAt: typeof item.openedAt === "string" ? item.openedAt : new Date().toISOString(),
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

export class WorkspaceStore {
  private state: WorkspaceTreeState;
  private currentLang: Lang = "zh";
  private readonly listeners = new Set<Listener>();

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
    return {
      version: this.state.version,
      nodes: Object.fromEntries(
        Object.entries(this.state.nodes).map(([id, node]) => [id, { ...node }]),
      ),
      collapsedFolderIds: [...this.state.collapsedFolderIds],
      activeNodeId: this.state.activeNodeId,
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.saveState();
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private loadState(): WorkspaceTreeState {
    const now = new Date().toISOString();
    const defaultBuiltins = getBuiltinNodes(this.currentLang);
    const legacyNodes = getMigratedLegacyNodes();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isRecord(parsed) && parsed.version === 2 && isRecord(parsed.nodes)) {
          const userNodes: Record<string, WorkspaceNode> = {};
          Object.entries(parsed.nodes).forEach(([id, rawNode]) => {
            // Remove the old flat database example from localStorage after it
            // becomes the nested curated series below.
            if (defaultBuiltins[id] || id === "database-basics") return;
            const node = this.normalizeUserNode(id, rawNode, now);
            if (node) userNodes[id] = node;
          });
          const mergedNodes = { ...defaultBuiltins, ...userNodes };
          this.repairParentLinks(mergedNodes);
          return {
            version: 2,
            nodes: mergedNodes,
            collapsedFolderIds: this.normalizeCollapsedFolders(parsed.collapsedFolderIds, mergedNodes),
            activeNodeId: this.normalizeActiveNode(parsed.activeNodeId, mergedNodes),
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
        ...Object.fromEntries(
          Object.entries(legacyNodes).filter(([id]) => !defaultBuiltins[id]),
        ),
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

  private normalizeUserNode(id: string, rawNode: unknown, now: string): WorkspaceNode | null {
    if (!isRecord(rawNode)) return null;
    const title = typeof rawNode.title === "string" ? rawNode.title.trim() : "";
    const type = rawNode.type === "folder" || rawNode.type === "lesson" ? rawNode.type : null;
    if (!title || !type) return null;
    const parentId = rawNode.parentId === null || typeof rawNode.parentId === "string"
      ? rawNode.parentId
      : null;
    return {
      id,
      title,
      type,
      parentId,
      isBuiltin: false,
      category: typeof rawNode.category === "string" ? rawNode.category : undefined,
      description: typeof rawNode.description === "string" ? rawNode.description : undefined,
      createdAt: typeof rawNode.createdAt === "string" ? rawNode.createdAt : now,
      updatedAt: typeof rawNode.updatedAt === "string" ? rawNode.updatedAt : now,
      order: typeof rawNode.order === "number" && Number.isFinite(rawNode.order) ? rawNode.order : Date.now(),
    };
  }

  private repairParentLinks(nodes: Record<string, WorkspaceNode>): void {
    Object.values(nodes).forEach((node) => {
      if (node.isBuiltin || node.parentId === null) return;
      const visited = new Set<string>();
      let parentId: string | null = node.parentId;
      while (parentId) {
        if (visited.has(parentId)) {
          node.parentId = null;
          return;
        }
        visited.add(parentId);
        const parent: WorkspaceNode | undefined = nodes[parentId];
        if (!parent || parent.type !== "folder" || parent.isBuiltin) {
          node.parentId = null;
          return;
        }
        parentId = parent.parentId;
      }
    });
  }

  private normalizeCollapsedFolders(raw: unknown, nodes: Record<string, WorkspaceNode>): string[] {
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((id): id is string => typeof id === "string" && nodes[id]?.type === "folder"))];
  }

  private normalizeActiveNode(raw: unknown, nodes: Record<string, WorkspaceNode>): string | null {
    return typeof raw === "string" && nodes[raw]?.type === "lesson" ? raw : null;
  }

  private isValidUserFolder(folderId: string | null): boolean {
    if (folderId === null) return true;
    const folder = this.state.nodes[folderId];
    return Boolean(folder && folder.type === "folder" && !folder.isBuiltin);
  }

  // --- CRUD Operations ---

  public createFolder(title: string, parentId: string | null = null): string | null {
    if (!this.isValidUserFolder(parentId)) return null;
    const id = createNodeId("folder");
    const now = new Date().toISOString();
    this.state.nodes[id] = {
      id,
      title: title.trim() || (this.currentLang === "zh" ? "新建文件夹" : "New Folder"),
      type: "folder",
      parentId,
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
      if (!targetFolder || targetFolder.type !== "folder" || targetFolder.isBuiltin) return false;

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

  public toggleFolderCollapse(folderId: string): boolean {
    if (this.state.nodes[folderId]?.type !== "folder") return false;
    const isCollapsed = this.state.collapsedFolderIds.includes(folderId);
    if (isCollapsed) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((id) => id !== folderId);
    } else {
      this.state.collapsedFolderIds.push(folderId);
    }
    this.notify();
    return true;
  }

  public setActiveNode(nodeId: string | null): boolean {
    if (nodeId !== null && this.state.nodes[nodeId]?.type !== "lesson") return false;
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
    return true;
  }

  public recordNewGeneration(
    projectId: string,
    title: string,
    parentFolderId?: string | null,
  ): boolean {
    const existing = this.state.nodes[projectId];
    if (existing?.isBuiltin || existing?.type === "folder") return false;
    const nextParentId = parentFolderId === undefined ? existing?.parentId ?? null : parentFolderId;
    if (!projectId || !this.isValidUserFolder(nextParentId)) return false;
    const now = new Date().toISOString();
    this.state.nodes[projectId] = {
      id: projectId,
      title: title.trim() || (this.currentLang === "zh" ? "AI 生成课程" : "Generated Course"),
      type: "lesson",
      parentId: nextParentId,
      isBuiltin: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      order: existing?.order ?? Date.now(),
    };
    this.state.activeNodeId = projectId;
    if (nextParentId) {
      this.state.collapsedFolderIds = this.state.collapsedFolderIds.filter((id) => id !== nextParentId);
    }
    this.notify();
    return true;
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

  public getChildCount(folderId: string): number {
    return Object.values(this.state.nodes).filter((n) => n.parentId === folderId).length;
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
