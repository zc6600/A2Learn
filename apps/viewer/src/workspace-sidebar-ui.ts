import { type Lang } from "./generation-profile";
import { T } from "./viewer-copy";
import { workspaceStore } from "./workspace-store";
import type { WorkspaceNode } from "./workspace-tree-types";

export type SidebarCallbacks = {
  onSelectLesson: (id: string) => void;
  getLang: () => Lang;
};

export function renderWorkspaceSidebar(container: HTMLElement, callbacks: SidebarCallbacks): () => void {
  let activeActionMenuNodeId: string | null = null;
  let searchTerm = "";

  const render = () => {
    const lang = callbacks.getLang();
    const copy = T[lang];
    const state = workspaceStore.getState();
    const activeId = state.activeNodeId;

    // Helper to render a node (folder or lesson)
    const renderNode = (node: WorkspaceNode, depth = 0): string => {
      const isFolder = node.type === "folder";
      const isCollapsed = state.collapsedFolderIds.includes(node.id);
      const isActive = activeId === node.id;
      const isBuiltin = Boolean(node.isBuiltin);

      // Filter check
      if (searchTerm && !isFolder) {
        if (!node.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          return "";
        }
      }

      const indentStyle = `padding-left: ${12 + depth * 14}px;`;

      const chevronHtml = isFolder
        ? `<button class="tree-chevron" data-action="toggle-folder" data-node-id="${node.id}" title="${isCollapsed ? "展开" : "折叠"}">
            ${isCollapsed ? "▶" : "▼"}
          </button>`
        : `<span class="tree-leaf-bullet"></span>`;

      const iconHtml = `<span class="tree-icon">${node.icon || (isFolder ? (isCollapsed ? "📁" : "📂") : "📄")}</span>`;
      const titleHtml = `<span class="tree-title" title="${node.title}">${node.title}</span>`;

      const actionBtnHtml = !isBuiltin
        ? `<button class="tree-action-btn" data-action="open-menu" data-node-id="${node.id}" title="更多操作">···</button>`
        : "";

      const nodeClass = `workspace-tree-item ${isFolder ? "is-folder" : "is-lesson"}${isActive ? " active" : ""}${isBuiltin ? " is-builtin" : ""}`;

      let childrenHtml = "";
      if (isFolder && !isCollapsed) {
        const children = workspaceStore.getChildren(node.id, isBuiltin ? true : undefined);
        if (children.length > 0) {
          childrenHtml = `<div class="tree-children">${children.map((c) => renderNode(c, depth + 1)).join("")}</div>`;
        } else if (!isBuiltin) {
          childrenHtml = `<div class="tree-children-empty" style="padding-left: ${28 + depth * 14}px;">${copy.emptyFolder}</div>`;
        }
      }

      return `
        <div class="workspace-tree-node-wrap">
          <div class="${nodeClass}" style="${indentStyle}" data-node-id="${node.id}" data-node-type="${node.type}">
            ${chevronHtml}
            ${iconHtml}
            ${titleHtml}
            ${actionBtnHtml}
          </div>
          ${childrenHtml}
        </div>
      `;
    };

    // Built-in curated sections
    const builtinRootFolders = workspaceStore.getChildren(null, true);
    const builtinSectionHtml = builtinRootFolders.map((f) => renderNode(f, 0)).join("");

    // User workspace section
    const userRootItems = workspaceStore.getChildren(null, false);
    let userSectionHtml = "";
    if (userRootItems.length > 0) {
      userSectionHtml = userRootItems.map((item) => renderNode(item, 0)).join("");
    } else {
      userSectionHtml = `<div class="workspace-empty-hint">${copy.noWorkspaceItems}</div>`;
    }

    container.innerHTML = `
      <aside class="workspace-sidebar" id="workspace-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <span class="sidebar-brand-icon">📚</span>
            <span class="sidebar-brand-title">${copy.workspaceTitle}</span>
          </div>
          <div class="sidebar-header-actions">
            <button id="sidebar-new-folder-btn" class="sidebar-icon-btn" title="${copy.newFolder}">
              ➕
            </button>
            <button id="sidebar-collapse-toggle" class="sidebar-icon-btn" title="${copy.collapseSidebar}">
              ◀
            </button>
          </div>
        </div>

        <div class="sidebar-search-box">
          <input
            type="text"
            id="sidebar-search-input"
            class="sidebar-search-input"
            placeholder="${lang === "zh" ? "🔍 快速过滤课程..." : "🔍 Filter lessons..."}"
            value="${searchTerm}"
          />
        </div>

        <div class="sidebar-content-scroll">
          <!-- Section 1: Curated -->
          <div class="workspace-section">
            <div class="workspace-section-header">
              <span>${copy.curatedCourses}</span>
            </div>
            <div class="workspace-tree-group">
              ${builtinSectionHtml}
            </div>
          </div>

          <!-- Section 2: User Workspace -->
          <div class="workspace-section">
            <div class="workspace-section-header user-section-header">
              <span>${copy.myWorkspace}</span>
              <button id="user-section-add-folder" class="section-action-btn" title="${copy.newFolder}">
                + 文件夹
              </button>
            </div>
            <div class="workspace-tree-group">
              ${userSectionHtml}
            </div>
          </div>
        </div>

        <!-- Floating Action Popover Modal -->
        <div id="sidebar-action-modal" class="sidebar-action-modal hidden">
          <div class="action-menu-content">
            <button class="action-menu-item" id="menu-rename-btn">✏️ ${copy.rename}</button>
            <button class="action-menu-item" id="menu-move-btn">📁 ${copy.moveTo}</button>
            <button class="action-menu-item danger" id="menu-delete-btn">🗑️ ${copy.deleteItem}</button>
          </div>
        </div>

        <!-- Move Folder Modal Dialog -->
        <div id="sidebar-move-modal" class="app-modal-backdrop hidden">
          <div class="app-modal small-modal">
            <div class="app-modal-header">
              <h3 class="app-modal-title">📁 ${copy.selectTargetFolder}</h3>
              <button id="move-modal-close" class="app-modal-close">✕</button>
            </div>
            <div class="app-modal-body">
              <p style="font-size: 13px; color: var(--app-muted); margin-bottom: 12px;">${copy.moveTo}</p>
              <select id="move-target-folder-select" class="sidebar-select-input">
                <!-- Options populated dynamically -->
              </select>
            </div>
            <div class="app-modal-footer">
              <button id="move-modal-confirm" class="app-btn-primary">${lang === "zh" ? "确认移动" : "Move"}</button>
            </div>
          </div>
        </div>
      </aside>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const lang = callbacks.getLang();
    const copy = T[lang];

    // Search input
    const searchInput = container.querySelector("#sidebar-search-input") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value;
        render();
        // Keep focus
        const nextInput = container.querySelector("#sidebar-search-input") as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    // New folder button
    const handleNewFolder = () => {
      const folderName = prompt(copy.newFolderPrompt, copy.untitledFolder);
      if (folderName && folderName.trim()) {
        workspaceStore.createFolder(folderName.trim());
      }
    };
    container.querySelector("#sidebar-new-folder-btn")?.addEventListener("click", handleNewFolder);
    container.querySelector("#user-section-add-folder")?.addEventListener("click", handleNewFolder);

    // Sidebar collapse toggle
    container.querySelector("#sidebar-collapse-toggle")?.addEventListener("click", () => {
      const rootApp = document.querySelector(".app-layout");
      if (rootApp) {
        rootApp.classList.toggle("sidebar-collapsed");
      }
    });

    // Tree item clicks
    container.querySelectorAll(".workspace-tree-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const nodeId = el.getAttribute("data-node-id");
        const nodeType = el.getAttribute("data-node-type");
        if (!nodeId) return;

        // If clicked action menu button
        if (target.closest('[data-action="open-menu"]')) {
          e.stopPropagation();
          openActionMenu(nodeId, target.closest('[data-action="open-menu"]') as HTMLElement);
          return;
        }

        // If clicked toggle chevron
        if (target.closest('[data-action="toggle-folder"]') || nodeType === "folder") {
          workspaceStore.toggleFolderCollapse(nodeId);
          return;
        }

        // Clicked a lesson -> select it
        if (nodeType === "lesson") {
          workspaceStore.setActiveNode(nodeId);
          callbacks.onSelectLesson(nodeId);
        }
      });
    });

    // Close action modal on click outside
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".sidebar-action-modal") && !target.closest('[data-action="open-menu"]')) {
        closeActionMenu();
      }
    });
  };

  const openActionMenu = (nodeId: string, anchorEl: HTMLElement) => {
    activeActionMenuNodeId = nodeId;
    const modal = container.querySelector("#sidebar-action-modal") as HTMLElement | null;
    if (!modal) return;

    const rect = anchorEl.getBoundingClientRect();
    modal.style.top = `${rect.bottom + window.scrollY + 4}px`;
    modal.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 180)}px`;
    modal.classList.remove("hidden");

    // Bind action menu buttons
    const lang = callbacks.getLang();
    const copy = T[lang];

    const renameBtn = modal.querySelector("#menu-rename-btn");
    const moveBtn = modal.querySelector("#menu-move-btn");
    const deleteBtn = modal.querySelector("#menu-delete-btn");

    renameBtn?.replaceWith(renameBtn.cloneNode(true));
    moveBtn?.replaceWith(moveBtn.cloneNode(true));
    deleteBtn?.replaceWith(deleteBtn.cloneNode(true));

    modal.querySelector("#menu-rename-btn")?.addEventListener("click", () => {
      closeActionMenu();
      const node = workspaceStore.getState().nodes[nodeId];
      if (!node) return;
      const newTitle = prompt(copy.renamePrompt, node.title);
      if (newTitle && newTitle.trim()) {
        workspaceStore.renameNode(nodeId, newTitle.trim());
      }
    });

    modal.querySelector("#menu-move-btn")?.addEventListener("click", () => {
      closeActionMenu();
      openMoveModal(nodeId);
    });

    modal.querySelector("#menu-delete-btn")?.addEventListener("click", () => {
      closeActionMenu();
      const node = workspaceStore.getState().nodes[nodeId];
      if (!node) return;
      if (confirm(`${copy.deleteConfirm} (${node.title})`)) {
        workspaceStore.deleteNode(nodeId);
      }
    });
  };

  const closeActionMenu = () => {
    activeActionMenuNodeId = null;
    const modal = container.querySelector("#sidebar-action-modal");
    modal?.classList.add("hidden");
  };

  const openMoveModal = (nodeId: string) => {
    const moveModal = container.querySelector("#sidebar-move-modal") as HTMLElement | null;
    const select = container.querySelector("#move-target-folder-select") as HTMLSelectElement | null;
    const closeBtn = container.querySelector("#move-modal-close");
    const confirmBtn = container.querySelector("#move-modal-confirm");
    if (!moveModal || !select) return;

    const lang = callbacks.getLang();
    const copy = T[lang];
    const node = workspaceStore.getState().nodes[nodeId];
    if (!node) return;

    const folderOptions = workspaceStore.getUserFolderOptions(node.type === "folder" ? nodeId : undefined);

    select.innerHTML = `
      <option value="__root__">📂 ${copy.moveToRoot}</option>
      ${folderOptions
        .map((f) => `<option value="${f.id}"${node.parentId === f.id ? " selected" : ""}>${"  ".repeat(f.depth)}📁 ${f.title}</option>`)
        .join("")}
    `;

    moveModal.classList.remove("hidden");

    const handleClose = () => {
      moveModal.classList.add("hidden");
    };

    closeBtn?.replaceWith(closeBtn.cloneNode(true));
    confirmBtn?.replaceWith(confirmBtn.cloneNode(true));

    container.querySelector("#move-modal-close")?.addEventListener("click", handleClose);
    container.querySelector("#move-modal-confirm")?.addEventListener("click", () => {
      const selectedVal = (container.querySelector("#move-target-folder-select") as HTMLSelectElement).value;
      const targetFolderId = selectedVal === "__root__" ? null : selectedVal;
      workspaceStore.moveNode(nodeId, targetFolderId);
      handleClose();
    });
  };

  // Subscribe to store updates
  const unsubscribe = workspaceStore.subscribe(() => {
    render();
  });

  // Initial render
  render();

  return () => {
    unsubscribe();
  };
}
