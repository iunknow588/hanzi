# hanzi-scoring-core

共享的评分核心工具，封装了笔画/格子级别的公共指标计算，目前包含：

- `averageScores(cells)`：根据格子数组计算 `scoredCount` 与 `averageScore`；
- TypeScript 类型：`StrokeScoreComponents`、`CellScore`、`ScoreMetrics` 等。

构建：
```bash
yarn workspace hanzi-scoring-core build
```

产物位于 `dist/`（cjs + esm + d.ts）。`services/coze-bridge/skills/score-standard.js` 已经引用 cjs 入口，后续也可在 Hanzi 前端或 Coze Skill 中直接 `import { averageScores } from 'hanzi-scoring-core'`。
