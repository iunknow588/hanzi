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
- 默认预置三个本地字符数据（我/你/汉），由 `hanzi-writer-data` 提供，并以 Chip 形式快速切换
- `hanzi-writer-data-client` 以 Hybrid 模式工作：若输入其他字符则回退到 CDN（需要网络）
- 可作为 Vercel 部署的基础，也可自定义 UI/交互
