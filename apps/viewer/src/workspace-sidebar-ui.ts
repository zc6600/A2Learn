import { type Lang } from "./generation-profile";
import { T } from "./viewer-copy";
import { workspaceStore } from "./workspace-store";
import type { WorkspaceNode } from "./workspace-tree-types";

export type SidebarCallbacks = {
  onSelectLesson: (id: string) => void;
  onSelectGenerating?: (id: string) => void;
  getLang: () => Lang;
};

export function renderWorkspaceSidebar(container: HTMLElement, callbacks: SidebarCallbacks): () => void {
  let activeActionMenuNodeId: string | null = null;
  let editingNodeId: string | null = null;
  let creatingFolderParentId: string | null | undefined = undefined; // undefined: idle, null: root, string: inside parent
  let searchTerm = "";
  let draggedNodeId: string | null = null;
  let hoverExpandTimer: ReturnType<typeof setTimeout> | null = null;

  const clearHoverExpandTimer = () => {
    if (hoverExpandTimer) {
      clearTimeout(hoverExpandTimer);
      hoverExpandTimer = null;
    }
  };

  const render = () => {
    const lang = callbacks.getLang();
    const copy = T[lang];
    const state = workspaceStore.getState();
    const activeId = state.activeNodeId;

    // Helper to render inline new folder input row
    const renderInlineFolderInput = (parentId: string | null, depth = 0): string => {
      const indentStyle = `padding-left: ${10 + depth * 14}px;`;
      return `
        <div class="workspace-tree-node-wrap">
          <div class="workspace-tree-item is-folder is-editing" style="${indentStyle}">
            <span class="tree-leaf-bullet"></span>
            <span class="tree-icon">📁</span>
            <input
              type="text"
              class="tree-inline-input"
              id="tree-new-folder-input"
              placeholder="${parentId ? copy.newSubfolderPrompt : copy.newFolderPrompt}"
              autocomplete="off"
            />
          </div>
        </div>
      `;
    };

    // Helper to render a node (folder or lesson)
    const renderNode = (node: WorkspaceNode, depth = 0): string => {
      const isFolder = node.type === "folder";
      const isCollapsed = state.collapsedFolderIds.includes(node.id);
      const isActive = activeId === node.id;
      const isBuiltin = Boolean(node.isBuiltin);
      const isEditing = editingNodeId === node.id;
      const isMenuOpen = activeActionMenuNodeId === node.id;
      const childCount = isFolder ? workspaceStore.getChildCount(node.id) : 0;

      const isGenerating = Boolean(node.isGenerating);

      // Filter check
      if (searchTerm && !isFolder) {
        if (!node.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          return "";
        }
      }

      const indentStyle = `padding-left: ${10 + depth * 14}px;`;

      const chevronHtml = isFolder
        ? `<button class="tree-chevron" data-action="toggle-folder" data-node-id="${node.id}" title="${isCollapsed ? (lang === "zh" ? "展开" : "Expand") : (lang === "zh" ? "折叠" : "Collapse")}">
            ${isCollapsed ? "▶" : "▼"}
          </button>`
        : `<span class="tree-leaf-bullet"></span>`;

      const iconHtml = isGenerating
        ? `<span class="tree-icon tree-generating-spinner" title="${lang === "zh" ? "正在生成中..." : "Generating..."}"></span>`
        : `<span class="tree-icon">${isFolder ? (isCollapsed ? "📁" : "📂") : "📄"}</span>`;

      const countBadgeHtml = isFolder && childCount > 0
        ? `<span class="tree-count-badge" title="${childCount}">${childCount}</span>`
        : "";

      const titleOrInputHtml = isEditing
        ? `<input
            type="text"
            class="tree-inline-input"
            id="tree-rename-input-${node.id}"
            value="${node.title.replace(/"/g, "&quot;")}"
            autocomplete="off"
          />`
        : isGenerating
        ? `<span class="tree-title is-generating-title" title="${node.title}">${node.title} <span class="tree-generating-tag">${lang === "zh" ? "生成中" : "Generating"}</span></span>`
        : `<span class="tree-title" data-action="rename-title" title="${node.title}">${node.title}</span>`;

      const actionBtnHtml = !isBuiltin && !isEditing && !isGenerating
        ? `<button class="tree-action-btn" data-action="toggle-menu" data-node-id="${node.id}" title="${lang === "zh" ? "更多操作" : "More actions"}">···</button>`
        : "";

      const menuDropdownHtml = isMenuOpen
        ? `
          <div class="tree-action-menu-dropdown" id="dropdown-${node.id}">
            ${isFolder ? `<button class="action-menu-item" data-action="new-subfolder" data-node-id="${node.id}">${copy.newSubfolder}</button>` : ""}
            <button class="action-menu-item" data-action="start-rename" data-node-id="${node.id}">${copy.rename}</button>
            <button class="action-menu-item" data-action="open-move" data-node-id="${node.id}">${copy.moveTo}</button>
            <button class="action-menu-item danger" data-action="confirm-delete" data-node-id="${node.id}">${copy.deleteItem}</button>
          </div>
        `
        : "";

      const nodeClass = `workspace-tree-item ${isFolder ? "is-folder" : "is-lesson"}${isActive ? " active" : ""}${isBuiltin ? " is-builtin" : ""}${isEditing ? " is-editing" : ""}${isGenerating ? " is-generating" : ""}`;

      let childrenHtml = "";
      if (isFolder && !isCollapsed) {
        const children = workspaceStore.getChildren(node.id, isBuiltin ? true : undefined);
        const isCreatingSubfolderHere = creatingFolderParentId === node.id;
        const subfolderInputHtml = isCreatingSubfolderHere ? renderInlineFolderInput(node.id, depth + 1) : "";

        if (children.length > 0 || isCreatingSubfolderHere) {
          childrenHtml = `
            <div class="tree-children" data-parent-id="${node.id}">
              ${subfolderInputHtml}
              ${children.map((c) => renderNode(c, depth + 1)).join("")}
            </div>
          `;
        } else if (!isBuiltin) {
          childrenHtml = `
            <div class="tree-children-empty" data-parent-id="${node.id}" style="padding-left: ${26 + depth * 14}px;">
              ${copy.emptyFolder}
            </div>
          `;
        }
      }

      return `
        <div class="workspace-tree-node-wrap">
          <div
            class="${nodeClass}"
            style="${indentStyle}"
            data-node-id="${node.id}"
            data-node-type="${node.type}"
            ${!isBuiltin && !isEditing && !isGenerating ? 'draggable="true"' : ""}
          >
            ${chevronHtml}
            ${iconHtml}
            ${titleOrInputHtml}
            ${countBadgeHtml}
            ${actionBtnHtml}
            ${menuDropdownHtml}
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

    // Inline new folder row at top of user workspace if active at root
    const inlineCreateFolderHtml = creatingFolderParentId === null
      ? renderInlineFolderInput(null, 0)
      : "";

    if (userRootItems.length > 0 || creatingFolderParentId === null) {
      userSectionHtml = inlineCreateFolderHtml + userRootItems.map((item) => renderNode(item, 0)).join("");
    } else {
      userSectionHtml = `<div class="workspace-empty-hint">${copy.noWorkspaceItems}</div>`;
    }

    container.innerHTML = `
      <aside class="workspace-sidebar" id="workspace-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <span class="sidebar-brand-title">${copy.workspaceTitle}</span>
          </div>
          <div class="sidebar-header-actions">
            <button id="sidebar-new-folder-btn" class="sidebar-icon-btn" title="${copy.newFolder}">
              +
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
            placeholder="${lang === "zh" ? "快速过滤课程..." : "Filter lessons..."}"
            value="${searchTerm.replace(/"/g, "&quot;")}"
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
                + ${copy.newFolder}
              </button>
            </div>
            <div class="workspace-tree-group user-tree-group" id="user-tree-group">
              ${userSectionHtml}
            </div>
          </div>
        </div>

        <!-- Move Folder Modal Dialog -->
        <div id="sidebar-move-modal" class="app-modal-backdrop hidden">
          <div class="app-modal small-modal">
            <div class="app-modal-header">
              <h3 class="app-modal-title">${copy.selectTargetFolder}</h3>
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

    // Auto-focus inline rename input if present
    if (editingNodeId) {
      const renameInput = container.querySelector(`#tree-rename-input-${editingNodeId}`) as HTMLInputElement | null;
      if (renameInput) {
        renameInput.focus();
        renameInput.select();

        let isHandled = false;
        const commitRename = () => {
          if (isHandled) return;
          isHandled = true;
          const targetId = editingNodeId;
          editingNodeId = null;
          if (targetId) {
            const newTitle = renameInput.value.trim();
            if (newTitle) {
              workspaceStore.renameNode(targetId, newTitle);
            }
          }
          render();
        };

        renameInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitRename();
          } else if (e.key === "Escape") {
            e.preventDefault();
            isHandled = true;
            editingNodeId = null;
            render();
          }
        });
        renameInput.addEventListener("blur", () => {
          commitRename();
        });
      }
    }

    // Auto-focus inline new folder input if creating folder
    if (creatingFolderParentId !== undefined) {
      const folderInput = container.querySelector("#tree-new-folder-input") as HTMLInputElement | null;
      if (folderInput) {
        folderInput.focus();

        let isHandled = false;
        const commitFolder = () => {
          if (isHandled) return;
          isHandled = true;
          const folderName = folderInput.value.trim();
          const pId = creatingFolderParentId;
          creatingFolderParentId = undefined;
          if (folderName) {
            workspaceStore.createFolder(folderName, pId);
          }
          render();
        };

        folderInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitFolder();
          } else if (e.key === "Escape") {
            e.preventDefault();
            isHandled = true;
            creatingFolderParentId = undefined;
            render();
          }
        });
        folderInput.addEventListener("blur", () => {
          commitFolder();
        });
      }
    }

    // Search input
    const searchInput = container.querySelector("#sidebar-search-input") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value;
        render();
        const nextInput = container.querySelector("#sidebar-search-input") as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    // New folder buttons
    const triggerNewFolder = (parentId: string | null = null) => {
      creatingFolderParentId = parentId;
      editingNodeId = null;
      activeActionMenuNodeId = null;
      if (parentId) {
        // Expand target parent
        const state = workspaceStore.getState();
        if (state.collapsedFolderIds.includes(parentId)) {
          workspaceStore.toggleFolderCollapse(parentId);
        }
      }
      render();
    };
    container.querySelector("#sidebar-new-folder-btn")?.addEventListener("click", () => triggerNewFolder(null));
    container.querySelector("#user-section-add-folder")?.addEventListener("click", () => triggerNewFolder(null));

    // Sidebar collapse toggle
    container.querySelector("#sidebar-collapse-toggle")?.addEventListener("click", () => {
      const rootApp = document.querySelector(".app-layout");
      if (rootApp) {
        rootApp.classList.toggle("sidebar-collapsed");
      }
    });

    // Double-clicking a user lesson/folder title renames it
    container.querySelectorAll(".workspace-tree-item:not(.is-builtin) .tree-title").forEach((titleEl) => {
      titleEl.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = titleEl.closest<HTMLElement>(".workspace-tree-item")?.dataset.nodeId;
        if (!nodeId) return;
        activeActionMenuNodeId = null;
        editingNodeId = nodeId;
        render();
      });
    });

    // Right-click Context Menu
    container.querySelectorAll(".workspace-tree-item:not(.is-builtin)").forEach((el) => {
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = el.getAttribute("data-node-id");
        if (!nodeId) return;
        activeActionMenuNodeId = nodeId;
        render();
      });
    });

    // Right-click empty user section area to create folder
    container.querySelector("#user-tree-group")?.addEventListener("contextmenu", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".workspace-tree-item")) {
        e.preventDefault();
        triggerNewFolder(null);
      }
    });

    // Tree item clicks
    container.querySelectorAll(".workspace-tree-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const nodeId = el.getAttribute("data-node-id");
        const nodeType = el.getAttribute("data-node-type");
        if (!nodeId) return;

        // If clicking inside input or inline editing, do not propagate
        if (target.closest(".tree-inline-input")) {
          return;
        }

        // Toggle action menu button
        if (target.closest('[data-action="toggle-menu"]')) {
          e.stopPropagation();
          activeActionMenuNodeId = activeActionMenuNodeId === nodeId ? null : nodeId;
          render();
          return;
        }

        // Action menu item clicks
        const actionItem = target.closest(".action-menu-item") as HTMLElement | null;
        if (actionItem) {
          e.stopPropagation();
          const action = actionItem.getAttribute("data-action");
          const targetNodeId = actionItem.getAttribute("data-node-id");
          if (!targetNodeId) return;

          if (action === "new-subfolder") {
            activeActionMenuNodeId = null;
            triggerNewFolder(targetNodeId);
          } else if (action === "start-rename") {
            activeActionMenuNodeId = null;
            editingNodeId = targetNodeId;
            render();
          } else if (action === "open-move") {
            activeActionMenuNodeId = null;
            openMoveModal(targetNodeId);
          } else if (action === "confirm-delete") {
            activeActionMenuNodeId = null;
            const node = workspaceStore.getState().nodes[targetNodeId];
            if (node && confirm(`${copy.deleteConfirm} (${node.title})`)) {
              workspaceStore.deleteNode(targetNodeId);
            }
          }
          return;
        }

        // Toggle folder chevron
        if (target.closest('[data-action="toggle-folder"]') || nodeType === "folder") {
          activeActionMenuNodeId = null;
          workspaceStore.toggleFolderCollapse(nodeId);
          return;
        }

        // Clicked a lesson -> select it
        if (nodeType === "lesson") {
          activeActionMenuNodeId = null;
          const node = workspaceStore.getState().nodes[nodeId];
          if (node?.isGenerating) {
            workspaceStore.setActiveNode(nodeId);
            callbacks.onSelectGenerating?.(nodeId);
            return;
          }
          workspaceStore.setActiveNode(nodeId);
          callbacks.onSelectLesson(nodeId);
        }
      });
    });

    // ----------------------------------------------------
    // Drag & Drop Handling
    // ----------------------------------------------------
    const userTreeGroup = container.querySelector("#user-tree-group") as HTMLElement | null;

    // 1. Draggable items
    container.querySelectorAll<HTMLElement>('.workspace-tree-item[draggable="true"]').forEach((itemEl) => {
      itemEl.addEventListener("dragstart", (e) => {
        const nodeId = itemEl.getAttribute("data-node-id");
        if (!nodeId) return;
        draggedNodeId = nodeId;
        itemEl.classList.add("is-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", nodeId);
        }
      });

      itemEl.addEventListener("dragend", () => {
        clearHoverExpandTimer();
        draggedNodeId = null;
        itemEl.classList.remove("is-dragging");
        container.querySelectorAll(".drag-over-folder, .drag-over-root").forEach((el) => {
          el.classList.remove("drag-over-folder", "drag-over-root");
        });
      });
    });

    // 2. Folder drop targets
    container.querySelectorAll<HTMLElement>(".workspace-tree-item.is-folder:not(.is-builtin)").forEach((folderEl) => {
      const folderId = folderEl.getAttribute("data-node-id");
      if (!folderId) return;

      folderEl.addEventListener("dragover", (e) => {
        if (!draggedNodeId || draggedNodeId === folderId) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        folderEl.classList.add("drag-over-folder");

        // Hover expand timer: if hovering over a collapsed folder, auto-expand it after 500ms
        if (!hoverExpandTimer) {
          const state = workspaceStore.getState();
          if (state.collapsedFolderIds.includes(folderId)) {
            hoverExpandTimer = setTimeout(() => {
              workspaceStore.toggleFolderCollapse(folderId);
              hoverExpandTimer = null;
            }, 500);
          }
        }
      });

      folderEl.addEventListener("dragleave", (e) => {
        // Only remove if leaving element itself
        if (!folderEl.contains(e.relatedTarget as Node)) {
          clearHoverExpandTimer();
          folderEl.classList.remove("drag-over-folder");
        }
      });

      folderEl.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearHoverExpandTimer();
        folderEl.classList.remove("drag-over-folder");
        const sourceId = e.dataTransfer?.getData("text/plain") || draggedNodeId;
        if (sourceId && sourceId !== folderId) {
          workspaceStore.moveNode(sourceId, folderId);
        }
      });
    });

    // 3. Empty folder drop targets
    container.querySelectorAll<HTMLElement>(".tree-children-empty").forEach((emptySlot) => {
      const parentId = emptySlot.getAttribute("data-parent-id");
      if (!parentId) return;

      emptySlot.addEventListener("dragover", (e) => {
        if (!draggedNodeId || draggedNodeId === parentId) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        emptySlot.classList.add("drag-over-folder");
      });

      emptySlot.addEventListener("dragleave", () => {
        emptySlot.classList.remove("drag-over-folder");
      });

      emptySlot.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        emptySlot.classList.remove("drag-over-folder");
        const sourceId = e.dataTransfer?.getData("text/plain") || draggedNodeId;
        if (sourceId && sourceId !== parentId) {
          workspaceStore.moveNode(sourceId, parentId);
        }
      });
    });

    // 4. Root workspace drop target (drop item to top-level)
    if (userTreeGroup) {
      userTreeGroup.addEventListener("dragover", (e) => {
        const target = e.target as HTMLElement;
        // Only trigger root drop if dragging over container or between root elements, not on an inner folder
        if (!target.closest(".workspace-tree-item.is-folder") && !target.closest(".tree-children-empty")) {
          if (!draggedNodeId) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          userTreeGroup.classList.add("drag-over-root");
        }
      });

      userTreeGroup.addEventListener("dragleave", (e) => {
        if (!userTreeGroup.contains(e.relatedTarget as Node)) {
          userTreeGroup.classList.remove("drag-over-root");
        }
      });

      userTreeGroup.addEventListener("drop", (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest(".workspace-tree-item.is-folder") && !target.closest(".tree-children-empty")) {
          e.preventDefault();
          userTreeGroup.classList.remove("drag-over-root");
          const sourceId = e.dataTransfer?.getData("text/plain") || draggedNodeId;
          if (sourceId) {
            workspaceStore.moveNode(sourceId, null);
          }
        }
      });
    }

    // Close action menu on click outside
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (activeActionMenuNodeId && !target.closest(".tree-action-menu-dropdown") && !target.closest('[data-action="toggle-menu"]')) {
        activeActionMenuNodeId = null;
        render();
      }
    });
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
      <option value="__root__">${copy.moveToRoot}</option>
      ${folderOptions
        .map((f) => `<option value="${f.id}"${node.parentId === f.id ? " selected" : ""}>${"  ".repeat(f.depth)}${f.title}</option>`)
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
    clearHoverExpandTimer();
    unsubscribe();
  };
}
