# hanzi-writer-renderers

Standalone workspace package存放 Hanzi Writer 的 SVG/Canvas 渲染实现，后续可以被不同宿主（Web、Mini Program、离线引擎）复用。

当前内容直接迁移自原 `hanzi-writer/src/renderers` 目录；core 包通过 `import 'hanzi-writer-renderers/svg'` 等方式引用。

## 下一步
- 暴露独立的构建产物（`dist/`）供第三方直接消费
- 支持自定义渲染目标（WebGL、OffscreenCanvas、Native）
