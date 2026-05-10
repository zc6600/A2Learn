# 发布指南（@a2learn/embed）

本仓库使用 npm workspaces。`@a2learn/embed` 的发布建议在仓库根目录执行。

## 0. 准备

- 确认你有 npm 账号，并且对 `@a2learn` scope 有发布权限
- 确认当前分支已通过构建与测试

## 1. 确定版本号

按语义化版本（SemVer）选择：

- `patch`：修复 bug
- `minor`：新增向后兼容功能
- `major`：Breaking Change

发布前请先更新 `packages/embed/CHANGELOG.md`。

## 2. 更新版本号（会写入 git tag）

在仓库根目录运行：

```bash
npm version patch --workspace @a2learn/embed
```

也可以把 `patch` 换成 `minor` / `major`。

## 3. 构建

```bash
npm run embed:build
```

说明：发布会包含 `dist/` 产物（见 `packages/embed/package.json` 的 `files` 字段）。

## 4. 发布到 npm

```bash
npm publish --workspace @a2learn/embed --access public
```

## 5. 校验

在任意空目录验证安装与导入：

```bash
npm i @a2learn/embed
```

## 6. 失败回滚（常见场景）

- 如果只是本地 `npm version` 做错了但还没发布：
  - 回退提交与 tag（按你们团队的 git 流程处理）
- 如果已发布：
  - npm 不允许覆盖已发布版本号，请发布一个更高版本进行修复

