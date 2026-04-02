# Hanzi ⇄ Coze Bridge

该目录用于在 Hanzi 应用与 `/baby/coze/插件` 算法流水线之间建立桥梁，职责包括：

1. 接收前端上传的整页稿纸并写入任务目录；
2. 调用 `/baby/coze/插件/run_pipeline.sh` 执行 00~08 阶段；
3. 解析 `pipeline_result.json` 等产物，生成 Hanzi 需要的瘦身 JSON（`hanzi-task-result.json`）；
4. 将任务状态与结果回传给前端或写入数据库。

## 运行方式

### 1. 本地命令行

`run-local.js` 仍可用于直接触发一次流水线，示例：

```bash
cd /home/lc/luckee_dao/hanzi/services/coze-bridge
node run-local.js \
  --input /path/to/sample.jpg \
  --job 20260402-0001 \
  --plugin-root /home/lc/luckee_dao/baby/coze/插件 \
  --output ./tmp
```

### 2. 常驻 HTTP 服务

`server.js` 会启动一个最小 API，供 Vercel 前端或其它客户端通过 HTTP 投递任务：

```bash
cd /home/lc/luckee_dao/hanzi/services/coze-bridge
export HANZI_PLUGIN_ROOT=/home/lc/luckee_dao/baby/coze/插件
node server.js
```

默认监听 `http://localhost:8787`，主要接口：

- `POST /api/jobs`：`multipart/form-data`，字段 `file` 为上传稿纸，可选 `artifactLevel`、`scoreArtifactLevel`;
  - 可额外指定 `executionMode=pipeline|skills`，覆盖全局 `HANZI_EXECUTION_MODE`；
- `GET /api/jobs`：返回任务列表；
- `GET /api/jobs/:jobId`：查看任务状态，可通过 `?includeResult=1` 携带瘦身结果；
- `GET /api/jobs/:jobId/result`：直接下载 `hanzi-task-result.json`；
- `POST /api/jobs/:jobId/retry`：复用原始稿纸重新排队。

关键环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HANZI_BRIDGE_PORT` | 8787 | HTTP 端口 |
| `HANZI_PLUGIN_ROOT` | `../../../baby/coze/插件` | 插件根路径 |
| `HANZI_PIPELINE_SCRIPT` | `run_pipeline.sh` | 插件入口脚本 |
| `HANZI_JOBS_ROOT` | `./jobs` | 任务缓存目录 |
| `HANZI_ARTIFACT_LEVEL` | `standard` | 默认 artifact 级别 |
| `HANZI_SCORE_ARTIFACT_LEVEL` | `standard` | 默认评分 artifact 级别 |
| `HANZI_EXECUTION_MODE` | `pipeline` | `pipeline`（旧模式）或 `skills`（切分 Skill + 评分 Skill） |
| `HANZI_SEGMENT_COMMAND` | *(空)* | `skills` 模式下调用的切分 Skill 命令（缺省仍使用 `run_pipeline.sh`） |
| `HANZI_SCORE_SCRIPT` | `skills/score-standard.js` | 评分 Skill 脚本路径（Node，基于 `hanzi-writer-data`，如需使用 `/baby/coze/插件/skills/hanzi-score/bin/hanzi-score-skill.js` 可覆盖） |
| `HANZI_REPO_ROOT` | `hanzi 仓库根目录` | 供评分脚本等定位 `hanzi-writer-data`、`hanzi-scoring-core` 和其它资源的根目录 |
| `HANZI_SCORING_CORE` | `<HANZI_REPO_ROOT>/hanzi-writer-workspace/.../index.cjs` | 指定评分核心模块文件路径，必要时可覆盖 |
| `HANZI_DATA_ROOT` | `<HANZI_REPO_ROOT>/hanzi-writer-data-master/data` | 标准笔画数据目录，供评分脚本使用 |

### 执行流程

1. 将输入文件复制到 `<输出目录>/<jobId>/input/`；
2. 调用插件脚本 `run_pipeline.sh --cases <file>`（可通过 `--pipeline-script` 覆盖），并透传其他参数；
3. 查找 `test/out/<timestamp>/pipeline_result.json`，提取每个单格的关键信息（字符、评分、归一化 SVG/掩膜路径）；
4. 生成 `hanzi-task-result.json`，供 Hanzi 前端消费。

## Skill 模式

为匹配“切分 Skill + 评分 Skill”的目标架构，Bridge 新增 `HANZI_EXECUTION_MODE=skills`：

1. **切分阶段**：调用 `HANZI_SEGMENT_COMMAND`（默认仍是 `/baby/coze/插件/run_pipeline.sh`）生成 `pipeline_result.json` 或 `seg_result.json`；
2. **评分阶段**：调用 `HANZI_SCORE_SCRIPT`（默认 `skills/score-standard.js`），该脚本会读取切分输出，并通过 `packages/hanzi-scoring-core` 的公共函数计算 `averageScore` 等指标，最终生成 `hanzi-task-result.json`。

实际部署时，可将 `HANZI_SEGMENT_COMMAND`/`HANZI_SCORE_SCRIPT` 替换为对应的 Coze Skill 或远程 CLI，Bridge 只负责调度与结果汇总。
