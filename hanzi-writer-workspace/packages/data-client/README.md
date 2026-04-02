# hanzi-writer-data-client

提供统一的汉字笔画数据加载器，可绑定本地预置 JSON、CDN、或自动回退的混合策略。

## 特性
- `createCharDataLoader`：生成与 Hanzi Writer 兼容的 `charDataLoader`
- 支持本地 `localData`（直接内嵌 JSON）
- 支持自定义 CDN base URL、fetch 实现、请求钩子
- Hybrid 模式可先读本地，未命中再回落到远程

## 使用
```ts
import { createCharDataLoader } from 'hanzi-writer-data-client';

const loader = createCharDataLoader({
  source: 'hybrid',
  localData: {
    '我': require('hanzi-writer-data/我'),
  },
  cdnBaseUrl: 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest',
});

HanziWriter.create('#target', '我', {
  charDataLoader: loader,
});
```

`createCharDataLoader` 返回的 loader 同时兼容 callback + Promise：
```ts
loader('汉', (data) => console.log(data), console.error);
await loader('字');
```

查看 `index.d.ts` 了解完整参数列表。
