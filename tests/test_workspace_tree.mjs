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
  const { workspaceStore, WorkspaceStore } = await import("../apps/viewer/src/workspace-store.js").catch(async () => {
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
    assert.ok(aiLessons.some((l) => l.id === "agent-react"), "ReAct Agent lesson should exist");

    const computingChildren = workspaceStore.getChildren("curated_computing");
    const databaseFolder = computingChildren.find((node) => node.id === "curated_database_basics");
    assert.ok(databaseFolder, "Database Basics should be a nested folder in Computing");
    assert.equal(databaseFolder.type, "folder");
    assert.equal(databaseFolder.isBuiltin, true);
    const databaseLessons = workspaceStore.getChildren("curated_database_basics");
    assert.equal(databaseLessons.length, 6, "Database Basics should contain six lessons");
    assert.equal(databaseLessons[0].id, "database-basics-lesson-1");
    assert.equal(databaseLessons[5].id, "database-basics-lesson-6");
  });

  test("Creates and nests user folders", () => {
    const folderId = workspaceStore.createFolder("深度学习笔记");
    const state = workspaceStore.getState();

    assert.ok(state.nodes[folderId], "New folder should exist in state");
    assert.equal(state.nodes[folderId].title, "深度学习笔记");
    assert.equal(state.nodes[folderId].parentId, null);
    assert.equal(state.nodes[folderId].isBuiltin, false);

    // Create subfolder
    const subFolderId = workspaceStore.createFolder("注意力专题", folderId);
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

    const generatedId = "project-generated-rename";
    workspaceStore.recordNewGeneration(generatedId, "数据库基础知识");
    assert.equal(workspaceStore.renameNode(generatedId, "数据库入门课"), true);
    assert.equal(workspaceStore.getState().nodes[generatedId].title, "数据库入门课");
  });

  test("Does not persist or expose icon metadata", () => {
    const folderId = workspaceStore.createFolder("无图标文件夹");
    const node = workspaceStore.getState().nodes[folderId];
    assert.equal("icon" in node, false);

    node.title = "不应修改内部状态";
    assert.equal(workspaceStore.getState().nodes[folderId].title, "无图标文件夹");
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

    const builtinMoveFail = workspaceStore.moveNode(lessonId, "curated_ai_series");
    assert.equal(builtinMoveFail, false, "User nodes should not move into built-in folders");
  });

  test("Rejects invalid active nodes and invalid parents", () => {
    const invalidFolder = workspaceStore.createFolder("不应创建", "curated_ai_series");
    assert.equal(invalidFolder, null);
    assert.equal(workspaceStore.setActiveNode("curated_ai_series"), false);
    assert.equal(workspaceStore.setActiveNode("missing-node"), false);
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
    const childFolder = workspaceStore.createFolder("Child", parentFolder);
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

  test("Preserves and explicitly clears a regenerated lesson parent", () => {
    const folderId = workspaceStore.createFolder("课程文件夹");
    const lessonId = "proj_upsert";
    workspaceStore.recordNewGeneration(lessonId, "第一次生成", folderId);
    const createdAt = workspaceStore.getState().nodes[lessonId].createdAt;

    workspaceStore.recordNewGeneration(lessonId, "第二次生成");
    assert.equal(workspaceStore.getState().nodes[lessonId].parentId, folderId);
    assert.equal(workspaceStore.getState().nodes[lessonId].createdAt, createdAt);

    workspaceStore.recordNewGeneration(lessonId, "移到根目录", null);
    assert.equal(workspaceStore.getState().nodes[lessonId].parentId, null);
  });

  test("Repairs malformed persisted trees and protects built-ins", () => {
    window.localStorage.setItem(
      "a2learn.workspace.tree.v2",
      JSON.stringify({
        version: 2,
        nodes: {
          curated_ai_series: {
            id: "curated_ai_series",
            title: "被篡改的内置节点",
            type: "lesson",
            parentId: "bad-parent",
            isBuiltin: false,
          },
          invalid: { id: "invalid", title: "", type: "lesson" },
          folderA: { id: "folderA", title: "A", type: "folder", parentId: "folderB" },
          folderB: { id: "folderB", title: "B", type: "folder", parentId: "folderA" },
          orphan: { id: "orphan", title: "孤儿", type: "lesson", parentId: "missing" },
        },
        collapsedFolderIds: ["invalid", "folderA", "folderA"],
        activeNodeId: "folderA",
      }),
    );

    const repairedStore = new WorkspaceStore();
    const state = repairedStore.getState();
    assert.equal(state.nodes.curated_ai_series.title, "人工智能");
    assert.equal(state.nodes.invalid, undefined);
    assert.equal(state.nodes.folderA.parentId, null);
    assert.equal(state.nodes.folderB.parentId, "folderA");
    assert.equal(state.nodes.orphan.parentId, null);
    assert.deepEqual(state.collapsedFolderIds, ["folderA"]);
    assert.equal(state.activeNodeId, null);
  });

  test("Keeps listeners isolated between store instances", () => {
    const first = new WorkspaceStore();
    const second = new WorkspaceStore();
    let firstCalls = 0;
    first.subscribe(() => { firstCalls += 1; });

    second.createFolder("只影响第二个 store");
    assert.equal(firstCalls, 0);
  });

  test("Accurately tracks child count and moves items across nested folders", () => {
    const rootFolder = workspaceStore.createFolder("主分类");
    assert.equal(workspaceStore.getChildCount(rootFolder), 0);

    const subFolder = workspaceStore.createFolder("子分类", rootFolder);
    assert.equal(workspaceStore.getChildCount(rootFolder), 1);

    const lessonA = "lesson_child_1";
    const lessonB = "lesson_child_2";
    workspaceStore.recordNewGeneration(lessonA, "课程 1", subFolder);
    workspaceStore.recordNewGeneration(lessonB, "课程 2", rootFolder);

    assert.equal(workspaceStore.getChildCount(rootFolder), 2); // subFolder and lessonB
    assert.equal(workspaceStore.getChildCount(subFolder), 1); // lessonA

    // Move lessonA to root
    workspaceStore.moveNode(lessonA, null);
    assert.equal(workspaceStore.getChildCount(subFolder), 0);
    assert.equal(workspaceStore.getState().nodes[lessonA].parentId, null);
  });

  test("Tracks in-flight pending generation and smoothly promotes to permanent project", () => {
    const tempId = "pending-123";
    const source = {
      apiBaseUrl: "https://api.example.test",
      resourceText: "机器学习",
      language: "zh",
    };
    const ok = workspaceStore.startPendingGeneration(
      tempId,
      "正在生成中的机器学习课程",
      undefined,
      source,
      "sess_refresh123",
    );
    assert.equal(ok, true);

    const pendingState = workspaceStore.getState();
    assert.ok(pendingState.nodes[tempId]);
    assert.equal(pendingState.nodes[tempId].isGenerating, true);
    assert.equal(pendingState.activeNodeId, tempId);
    assert.equal(pendingState.nodes[tempId].generationSessionId, "sess_refresh123");

    const reloadedStore = new WorkspaceStore();
    const restored = reloadedStore.getPendingGenerations();
    assert.equal(restored.length, 1);
    assert.equal(restored[0].id, tempId);
    assert.deepEqual(restored[0].generationSource, source);

    // Generation finishes and promotes to permanent project
    const realProjectId = "project-real-456";
    const completeOk = workspaceStore.completePendingGeneration(tempId, realProjectId, "机器学习实战精要");
    assert.equal(completeOk, true);

    const completedState = workspaceStore.getState();
    assert.equal(completedState.nodes[tempId], undefined);
    assert.ok(completedState.nodes[realProjectId]);
    assert.equal(completedState.nodes[realProjectId].isGenerating, undefined);
    assert.equal(completedState.nodes[realProjectId].title, "机器学习实战精要");
    assert.equal(completedState.activeNodeId, realProjectId);

    // Test failing a pending generation
    const failTempId = "pending-fail-789";
    workspaceStore.startPendingGeneration(failTempId, "即将失败的任务");
    assert.equal(workspaceStore.getState().activeNodeId, failTempId);

    workspaceStore.failPendingGeneration(failTempId);
    assert.equal(workspaceStore.getState().nodes[failTempId], undefined);
    assert.equal(workspaceStore.getState().activeNodeId, null);
  });
});
