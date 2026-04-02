# hanzi scripts

本目录为 Hanzi Workspace 的运维脚本，参考 `baby/scripts` 的结构实现，当前提供：

- `deploy_all.sh`：一键串联 GitHub 推送与 Vercel 部署（可通过环境变量跳过某一环节），内部会先在 workspace 执行 `yarn renderers:build`、`yarn demo:build` 再调用 `deploy_vercel.sh`
- `upload_to_github.sh`：初始化/校验 Git 远端，提交并推送到 `git@github.com:iunknow588/hanzi.git`
- `deploy_vercel.sh`：基于 Vercel CLI 发布静态 Demo（默认目录 `hanzi-writer-workspace/apps/hanzi-demo`，可通过环境变量覆盖）

## 快速开始

```bash
cd /home/lc/luckee_dao/hanzi

# 直接执行整体流程（GitHub + Vercel preview）
HANZI_VERCEL_SCOPE=iunknow588s-projects \
HANZI_VERCEL_PROJECT=hanzi-demo \
./scripts/deploy_all.sh preview

# 如需单独操作，可直接调用下面两个脚本：
./scripts/upload_to_github.sh "feat: update workspace"
./scripts/deploy_vercel.sh preview
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `HANZI_REMOTE_URL` | Git 远端地址 | `git@github.com:iunknow588/hanzi.git` |
| `HANZI_VERCEL_SCOPE` | Vercel 团队/空间 | *(必填，无默认)* |
| `HANZI_VERCEL_PROJECT` | Vercel 项目名 | *(必填，无默认)* |
| `HANZI_VERCEL_PROJECT_ID` | Vercel 项目 ID（可选，用于二次校验） | 空 |
| `HANZI_VERCEL_ARCHIVE` | `vercel deploy --archive` 参数 | `tgz` |
| `HANZI_VERCEL_SOURCE_DIR` | 需要部署的子目录（相对 `/home/lc/luckee_dao/hanzi`） | `hanzi-writer-workspace/apps/hanzi-demo` |

> 脚本会在首次执行时自动创建 `.vercel/project.json` 并记录 link 信息。若需重新绑定，可删除该文件或执行 `vercel logout && vercel login` 后重新运行脚本。
