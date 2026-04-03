# hanzi scripts

本目录为 Hanzi Workspace 的运维脚本，参考 `baby/scripts` 的结构实现，当前提供：

- `deploy_all.sh`：一键串联 GitHub 推送与 Vercel 部署（可通过环境变量跳过某一环节），内部会先在 workspace 执行 `yarn renderers:build`、`yarn demo:build` 再调用 `deploy_vercel.sh`
- `upload_to_github.sh`：初始化/校验 Git 远端，提交并推送到 `git@github.com:iunknow588/hanzi.git`
- `deploy_vercel.sh`：基于 Vercel CLI 发布静态 Demo（默认目录 `hanzi-writer-workspace/apps/hanzi-demo`，可通过环境变量覆盖）
- `start_bridge.sh`：启动 `services/coze-bridge` HTTP 服务，供上传模式访问 `/api/jobs`
- `run_cozepy_checks.sh`：自动执行 `check_cozepy.py`，验证 Python 3.10 + cozepy SDK 是否就绪，必要时可读取 `COZE_API_TOKEN` / `COZE_API_BASE` 尝试初始化 Coze 客户端

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

# 启动上传桥接服务（默认 8787）
./scripts/start_bridge.sh

# 体检 Coze Python SDK（需要 Python 3.10+）
./scripts/run_cozepy_checks.sh
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

> 推荐在仓库根目录创建 `.env.vercel`（例如 `HANZI_VERCEL_SCOPE=cdao` 等），脚本会自动加载该文件。首次 link 成功后会生成 `.vercel/project.json`，若需重新绑定，可删除该文件或执行 `vercel logout && vercel login` 后重新运行脚本。

## 上传模式说明

生产环境下，上传模式需要一个可公网访问的 Hanzi Bridge 服务：

```bash
cd /home/lc/luckee_dao/hanzi

# 1. 在可运行 /baby/coze/插件 的主机上启动桥接服务
cat > .env.bridge <<'EOF'
HANZI_BRIDGE_PORT=8787
HANZI_PLUGIN_ROOT=/home/lc/luckee_dao/baby/coze/插件
EOF
./scripts/start_bridge.sh

# 2. 给前端配置桥接服务地址后重新发布
cd /home/lc/luckee_dao/hanzi/hanzi-writer-workspace/apps/hanzi-demo
echo "VITE_HANZI_API_BASE=https://your-bridge.example.com" > .env.production.local
```

如果桥接服务尚未公网暴露，前端会明确提示需要配置 `VITE_HANZI_API_BASE`，而不会再盲目请求同域 `/api/jobs` 导致 404。
