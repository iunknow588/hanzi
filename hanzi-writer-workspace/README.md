# Hanzi Writer Workspace

This workspace co-locates the `hanzi-writer` core库与 `hanzi-writer-data` 数据集，使得 Yarn Workspaces 可以在本地联调：

```
/hanzi-writer-workspace
├─ package.json          # 声明 Yarn workspace
├─ packages/
│  ├─ hanzi-writer             # 核心库
│  ├─ hanzi-writer-data        # 原始数据集
│  ├─ hanzi-writer-data-client # 数据加载器（Hybrid/CDN/本地）
│  └─ hanzi-writer-renderers   # SVG/Canvas 渲染实现
└─ apps/
   └─ hanzi-demo               # Vite 示例应用
```

在该目录运行 `yarn install` 后，`packages/hanzi-writer` 会自动以 `workspace:*` 的方式引用本地的数据包，便于：
- 修改数据集后立即在核心库中验证；
- 通过 `hanzi-writer-data-client` 统一管理 CDN/本地/混合加载策略；
- 构建自带离线数据的 Demo，并继续拆分更多子包（renderers、quiz 等）。

## Demo

```
cd /home/lc/luckee_dao/hanzi/hanzi-writer-workspace
yarn install
yarn demo:dev
```

访问 http://localhost:4173 即可体验新的 Vite Demo，并验证 data-client 加载策略。生产构建可运行 `yarn demo:build`。

## Renderers 构建

`hanzi-writer-renderers` 已拆分为独立 workspace 包，如需产出可发布的 `dist/`：

```
yarn renderers:build
```

会生成 `dist/svg/*`、`dist/canvas/*` 等文件，并通过 package `exports` 提供 `hanzi-writer-renderers/svg` 等子路径。

## 数据子集工具

使用 `tools/extract-subset.mjs` 按需生成本地字形数据：

```
yarn subset 我你汉 --out apps/hanzi-demo/src/local-data.json
```

也可以用 `--list` 从文本文件读取字符（按空白或逗号分隔）。例如 demo 默认使用 `apps/hanzi-demo/local-list.txt`，你还可以使用 `presets/hsk1.txt` 快速生成 HSK1 级别的全部汉字：

```
yarn subset --list apps/hanzi-demo/local-list.txt --out apps/hanzi-demo/src/local-data.json
yarn subset --list presets/hsk1.txt --out ./hsk1.json
```

省略 `--out` 将直接打印 JSON，可结合任意应用进行离线打包。
