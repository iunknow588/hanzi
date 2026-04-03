# Hanzi Demo (Vite)

基于 Vite 的最小前端示例，用于本地验证 `hanzi-writer` + `hanzi-writer-data-client`。

## 使用
```bash
cd /home/lc/luckee_dao/hanzi/hanzi-writer-workspace
yarn install
yarn demo:dev      # http://localhost:4173
```

构建静态产物（供 Vercel 等使用）：
```bash
yarn demo:build
```

## 特性
- 默认字帖内容为 `天地玄黄`，首页会自动加载这组字并从首字开始练习
- `hanzi-writer-data-client` 以 Hybrid 模式工作：若输入其他字符则回退到 CDN（需要网络）
- 可作为 Vercel 部署的基础，也可自定义 UI/交互
- 内置实时评分面板：开启 `enableLocalScoring` 后，右侧 Hanzi Writer 组件会在写完每一笔后回调分数，左侧面板展示综合分与“起止/走向/形态”细分指标。参考实现位于 `src/main.ts`。
- 新增“整页上传”面板，可向 `services/coze-bridge` 的 HTTP API 上传稿纸、查看任务进度、失败重试及下载 `hanzi-task-result.json`。
- 上传表单支持选择执行模式（`pipeline` 或 `skills`），便于在单体插件流程与“切分 Skill + 评分 Skill”占位实现之间切换。
- 任务列表新增“查看详情”按钮，可实时拉取 `hanzi-task-result.json`，在前端查看综合平均分与前 50 条格子评分，方便快速验收。

## 与 Hanzi ⇄ Coze Bridge 协同

默认情况下前端会请求同域的 `/api/jobs`。如需指向本地桥接服务，可在构建或开发时设置：

```bash
VITE_HANZI_API_BASE=http://localhost:8787 yarn demo:dev
```

启动服务：

```bash
cd /home/lc/luckee_dao/hanzi/services/coze-bridge
npm install
node server.js
```

> 若要接入外部评分或自定义权重，可在创建实例时传入 `strokeScoreWeights`、`onScoreUpdate` 等参数，详见 `packages/hanzi-writer/src/typings/types.ts`。
