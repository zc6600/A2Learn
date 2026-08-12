import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node.js environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.window = {
  localStorage: new LocalStorageMock(),
};

describe("Workspace Tree & Store Unit Tests", async () => {
  // Dynamic import after mocking window.localStorage
  const { workspaceStore } = await import("../apps/viewer/src/workspace-store.js").catch(async () => {
    // If running in TypeScript direct mode, import ts
    return await import("../apps/viewer/src/workspace-store.ts");
  });

  beforeEach(() => {
    window.localStorage.clear();
    // Re-initialize state
    workspaceStore.setLang("zh");
  });

  test("Initializes built-in curated series nodes", () => {
    const state = workspaceStore.getState();
    assert.ok(state.nodes["curated_ai_series"], "AI series folder should exist");
    assert.equal(state.nodes["curated_ai_series"].type, "folder");
    assert.equal(state.nodes["curated_ai_series"].isBuiltin, true);

    const aiLessons = workspaceStore.getChildren("curated_ai_series");
    assert.ok(aiLessons.length >= 2, "AI series should have at least 2 curated lessons");
    assert.ok(aiLessons.some((l) => l.id === "paper-attention"), "Attention lesson should exist");
    assert.ok(aiLessons.some((l) => l.id === "transformer"), "Transformer lesson should exist");
  });

  test("Creates and nests user folders", () => {
    const folderId = workspaceStore.createFolder("深度学习笔记", "🧠");
    const state = workspaceStore.getState();

    assert.ok(state.nodes[folderId], "New folder should exist in state");
    assert.equal(state.nodes[folderId].title, "深度学习笔记");
    assert.equal(state.nodes[folderId].icon, "🧠");
    assert.equal(state.nodes[folderId].parentId, null);
    assert.equal(state.nodes[folderId].isBuiltin, false);

    // Create subfolder
    const subFolderId = workspaceStore.createFolder("注意力专题", "🔍", folderId);
    const subNode = workspaceStore.getState().nodes[subFolderId];
    assert.equal(subNode.parentId, folderId, "Subfolder should have parent folderId");
  });

  test("Renames user nodes and prevents renaming built-in nodes", () => {
    const folderId = workspaceStore.createFolder("旧名称");
    const ok = workspaceStore.renameNode(folderId, "新名称");
    assert.equal(ok, true, "Renaming user folder should succeed");
    assert.equal(workspaceStore.getState().nodes[folderId].title, "新名称");

    // Empty title should fail
    const emptyFail = workspaceStore.renameNode(folderId, "   ");
    assert.equal(emptyFail, false, "Empty title rename should fail");

    // Builtin node rename should fail
    const builtinFail = workspaceStore.renameNode("curated_ai_series", "修改内置标题");
    assert.equal(builtinFail, false, "Renaming built-in node should fail");
  });

  test("Moves nodes and prevents circular reference cycles", () => {
    const folderA = workspaceStore.createFolder("Folder A");
    const folderB = workspaceStore.createFolder("Folder B");
    const lessonId = "lesson_123";

    workspaceStore.recordNewGeneration(lessonId, "测试课程");

    // 1. Move lesson into Folder A
    const moveLessonOk = workspaceStore.moveNode(lessonId, folderA);
    assert.equal(moveLessonOk, true);
    assert.equal(workspaceStore.getState().nodes[lessonId].parentId, folderA);

    // 2. Move Folder B into Folder A
    const moveFolderOk = workspaceStore.moveNode(folderB, folderA);
    assert.equal(moveFolderOk, true);
    assert.equal(workspaceStore.getState().nodes[folderB].parentId, folderA);

    // 3. Attempt cycle: Move Folder A into Folder B (which is inside Folder A) -> Should fail!
    const cycleFail = workspaceStore.moveNode(folderA, folderB);
    assert.equal(cycleFail, false, "Moving folder into its own child should fail with cycle protection");

    // 4. Attempt self-move: Move Folder A into Folder A -> Should fail!
    const selfFail = workspaceStore.moveNode(folderA, folderA);
    assert.equal(selfFail, false, "Moving folder into itself should fail");
  });

  test("Deletes node and safely reparents child lessons", () => {
    const folderId = workspaceStore.createFolder("临时分类");
    const lessonId = "proj_test_delete";
    workspaceStore.recordNewGeneration(lessonId, "待分类课程", folderId);

    assert.equal(workspaceStore.getState().nodes[lessonId].parentId, folderId);

    // Delete the folder
    const deleteOk = workspaceStore.deleteNode(folderId);
    assert.equal(deleteOk, true);
    assert.equal(workspaceStore.getState().nodes[folderId], undefined, "Folder should be deleted");

    // Child lesson should be safely reparented to null (root), NOT deleted or orphaned!
    assert.ok(workspaceStore.getState().nodes[lessonId], "Child lesson should not be lost");
    assert.equal(workspaceStore.getState().nodes[lessonId].parentId, null, "Child lesson should be moved to root");
  });

  test("Auto-expands ancestor folders when setting active node", () => {
    const parentFolder = workspaceStore.createFolder("Parent");
    const childFolder = workspaceStore.createFolder("Child", "📁", parentFolder);
    const lessonId = "proj_deep_lesson";
    workspaceStore.recordNewGeneration(lessonId, "深层课件", childFolder);

    // Collapse parent and child
    workspaceStore.toggleFolderCollapse(parentFolder);
    workspaceStore.toggleFolderCollapse(childFolder);
    assert.ok(workspaceStore.getState().collapsedFolderIds.includes(parentFolder));
    assert.ok(workspaceStore.getState().collapsedFolderIds.includes(childFolder));

    // Set active node
    workspaceStore.setActiveNode(lessonId);

    // Both ancestors should now be expanded automatically!
    assert.ok(!workspaceStore.getState().collapsedFolderIds.includes(parentFolder), "Parent folder should be auto-expanded");
    assert.ok(!workspaceStore.getState().collapsedFolderIds.includes(childFolder), "Child folder should be auto-expanded");
    assert.equal(workspaceStore.getState().activeNodeId, lessonId);
  });
});
