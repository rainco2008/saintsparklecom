# Payload Cloudflare Directory 开发计划 v1.2

## 版本信息

- 版本：`v1.2`
- 日期：`2026-06-13`
- 项目：`saintsparklecom`
- 基于：Payload CMS v3 `with-cloudflare-d1` 宿主模板
- 目标形态：先作为当前宿主项目内的目录插件能力落地，稳定后再评估是否抽离为独立 `payload-plugin-cloudflare-directory` 包。

## 当前项目状态分析

当前项目仍处于 Payload Cloudflare D1/R2 starter 模板状态，具备基础 Payload Admin、D1 数据库适配、R2 媒体存储和 OpenNext Cloudflare 部署结构。

已具备：

- Payload CMS v3 基础配置。
- `Users` collection，用于 Payload Admin 后台管理员认证。
- `Media` collection，用于媒体上传。
- Cloudflare D1 binding：`D1`。
- Cloudflare R2 binding：`R2`。
- Cloudflare assets binding：`ASSETS`。
- OpenNext Cloudflare 配置。
- 基础集成测试和 Playwright e2e 模板测试。

当前缺少：

- KV namespace 和 Worker binding。
- Vectorize index 和 Worker binding。
- Cloudflare Queues 绑定。
- Workers AI 绑定。
- Auth.js 前台用户体系。
- Stripe checkout / webhook 能力。
- 目录插件代码。
- `directory-settings` global。
- 目录 collections、jobs、audit logs。
- Public Runtime helpers。
- Queue producer / consumer。
- KV stale-while-revalidate 缓存层。
- Vectorize embedding upsert / query / delete。
- sitemap index / shards 异步生成能力。

## 硬性平台要求

本项目必须使用 **Cloudflare Workers Paid**。

Free 计划不作为支持目标，也不作为 preview、deploy 或生产验收标准。

原因：

- Payload CMS + Next.js + OpenNext Cloudflare 的 Worker bundle 体积容易超过 Free 计划限制。
- 当前 Payload Cloudflare 模板本身也提示该模板需要 Paid Workers。
- 后续会引入 KV、Vectorize、Queues、Workers AI、Stripe webhook、异步任务和更复杂的公开运行面，必须按 Paid Workers 能力边界设计和验收。

验收规则：

- 如果 Cloudflare 账户未启用 Workers Paid，则项目状态标记为平台阻塞。
- Paid Workers 未启用时，不进入 Cloudflare preview/workerd 生产可用验收。
- 不以 `next dev` 成功作为 Cloudflare 兼容性的最终依据。

## Cloudflare 手工资源准备

当前默认宿主模板只包含 D1/R2/ASSETS，不包含目录插件所需的 KV 和 Vectorize。进入缓存、语义搜索、推荐和 embedding 阶段前，必须先在 Cloudflare 控制台手工创建并绑定资源。

### KV 手工创建与绑定

用途：

- Public Runtime 的 KV stale-while-revalidate 缓存。
- 首页、分类页、详情页、sitemap 等公开读取缓存。
- D1 fallback 的结果缓存。

推荐命名：

- KV namespace：`saintsparkle-directory-cache`
- Worker binding variable：`DIRECTORY_CACHE_KV`

Cloudflare 控制台步骤：

1. 登录 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 进入 `Workers KV`。
4. 创建 KV namespace。
5. Namespace 名称填写 `saintsparkle-directory-cache`。
6. 打开当前 Worker：`saintsparklecom`。
7. 进入 `Settings` -> `Bindings`。
8. 添加 `KV namespace` binding。
9. Variable name 填写 `DIRECTORY_CACHE_KV`。
10. Namespace 选择 `saintsparkle-directory-cache`。
11. 保存绑定。
12. 后续部署时确认 Worker 环境中可通过 `env.DIRECTORY_CACHE_KV` 访问。

后续代码阶段需要同步到 `wrangler.jsonc`：

```jsonc
"kv_namespaces": [
  {
    "binding": "DIRECTORY_CACHE_KV",
    "id": "<cloudflare-kv-namespace-id>"
  }
]
```

注意事项：

- KV 是缓存和派生摘要存储，不是主事实数据库。
- D1 仍然是目录数据的主事实来源。
- KV key 需要带版本号或 namespace prefix，便于后续批量失效和 schema 升级。
- KV 未绑定前，不实现 KV SWR cache，不进入公开缓存验收。

### Vectorize 手工创建与绑定

用途：

- 目录条目的 embedding 检索。
- 相关推荐。
- 语义搜索。
- AI 生成内容的相似度匹配。

推荐命名：

- Vectorize index：`saintsparkle-directory`
- Worker binding variable：`DIRECTORY_VECTORIZE`

创建前置条件：

- 必须先确认最终使用的 embedding 模型。
- 必须确认该 embedding 模型的输出维度。
- Vectorize index 创建时需要指定 `dimensions` 和 `metric`，不要在模型维度未确认前创建生产 index。

默认建议：

- Metric：`cosine`
- Dimensions：以最终 embedding 模型输出维度为准。

Cloudflare 控制台步骤：

1. 登录 Cloudflare Dashboard。
2. 进入 `Workers AI` 或 `Vectorize`。
3. 创建 Vectorize index。
4. Index name 填写 `saintsparkle-directory`。
5. Dimensions 填写最终 embedding 模型的输出维度。
6. Metric 选择 `cosine`。
7. 保存 index。
8. 打开当前 Worker：`saintsparklecom`。
9. 进入 `Settings` -> `Bindings`。
10. 添加 `Vectorize` binding。
11. Variable name 填写 `DIRECTORY_VECTORIZE`。
12. Index 选择 `saintsparkle-directory`。
13. 保存绑定。
14. 后续部署时确认 Worker 环境中可通过 `env.DIRECTORY_VECTORIZE` 访问。

如果控制台没有暴露 Vectorize 创建入口，可使用 Wrangler 创建：

```bash
npx wrangler vectorize create saintsparkle-directory --dimensions=<MODEL_DIMENSIONS> --metric=cosine
```

后续代码阶段需要同步到 `wrangler.jsonc`：

```jsonc
"vectorize": [
  {
    "binding": "DIRECTORY_VECTORIZE",
    "index_name": "saintsparkle-directory"
  }
]
```

注意事项：

- Vectorize 不作为目录主数据来源。
- Vectorize 只存 embedding 和检索所需 metadata。
- 发布、更新、下架、删除目录条目时，通过 queue 异步 upsert/delete embedding。
- 公开请求不得现场生成 embedding。
- Vectorize 未绑定前，不实现语义搜索、推荐和 embedding 队列验收。

## 优化后的阶段计划

### Phase 0：当前项目审计

目标：

- 确认当前项目是否仍是 Payload CMS v3 `with-cloudflare-d1` 宿主模板。
- 确认当前配置是否适合作为目录插件宿主。
- 不写代码、不安装依赖、不创建文件、不修改配置。

检查内容：

- Payload 配置。
- Next/OpenNext Cloudflare 配置。
- D1/R2/ASSETS bindings。
- collections。
- migrations。
- tests。
- package scripts。
- Cloudflare generated env types。

输出：

- 当前项目状态。
- 已有能力。
- 缺失能力。
- 是否阻塞进入下一阶段。

### Phase 0.5：运行基线验证

目标：

- 在任何插件功能开发前，先证明当前宿主模板可以安装、测试、构建并在 Cloudflare workerd/preview 中运行。

操作：

- 使用 `pnpm` 作为唯一包管理器。
- 安装依赖并生成 `pnpm-lock.yaml`。
- 执行 Payload 类型生成。
- 执行 Cloudflare env 类型生成。
- 执行集成测试。
- 执行 Next/OpenNext build。
- 执行 `pnpm run preview` 或等价 workerd 验证。

验收：

- `pnpm-lock.yaml` 存在。
- `pnpm run generate:types` 成功。
- `pnpm run test:int` 成功。
- `pnpm run build` 成功。
- `pnpm run preview` 或等价 workerd 验证成功。
- Cloudflare Workers Paid 已启用。
- `D1`、`R2`、`ASSETS`、`DIRECTORY_CACHE_KV`、`DIRECTORY_VECTORIZE` 已完成绑定。

阻塞规则：

- 如果 preview/workerd 失败，先修模板兼容问题，不进入插件功能开发。
- 如果 Paid Workers 未启用，标记为平台阻塞。
- 如果 KV 或 Vectorize 未创建绑定，不进入缓存、语义搜索和 embedding 开发。

### Phase 1：插件边界与运行时契约

目标：

- 建立清晰的三层运行时边界。
- 先定义 binding、Env、job message、public helper contract，再写业务功能。

推荐初始目录：

```text
src/plugins/cloudflare-directory/
  index.ts
  public/index.ts
  queues/index.ts
  auth/index.ts
  stripe/index.ts
```

入口职责：

- `index.ts`：Payload plugin 主入口，只用于 Control Plane。
- `public/index.ts`：Public Runtime helpers，禁止 import Payload/Admin/Node-only。
- `queues/index.ts`：Queue consumer handler factory。
- `auth/index.ts`：Auth.js D1 adapter/helper。
- `stripe/index.ts`：Stripe checkout helper 和 webhook route factory。

运行时边界：

- Control Plane 可以依赖 Payload Core、collections、globals、Admin UI。
- Public Runtime 只能依赖 Workers-safe helper、D1/KV/R2/Vectorize binding 和轻量纯函数。
- Async Job Plane 通过 Cloudflare Queues 执行慢任务，不阻塞 HTTP 请求。

统一 job message：

```ts
type DirectoryJobMessage = {
  jobId: string
  type: string
  targetId: string
  attempt: number
}
```

### Phase 2：D1 Schema、查询与迁移策略

目标：

- 先定义公开查询模式，再反推 schema、索引和 Payload fields。
- 避免先写 Payload collections，后续发现 Public Runtime D1 查询无法高效支撑。

最小核心表：

- `directory_categories`
- `directory_items`
- `directory_jobs`
- `directory_audit_logs`

公开查询：

- 首页最新列表。
- 分类列表。
- slug 详情。
- 审核队列。
- sitemap shard。

索引原则：

- 按真实查询模式设计索引。
- 禁止为所有字段创建万能复合索引。
- 高频公开列表必须使用 keyset pagination。
- 禁止公开列表使用深分页 `OFFSET`。
- 每个 D1 fallback 查询必须有明确 `LIMIT`。
- 每个关键查询必须记录 `EXPLAIN QUERY PLAN` 结果和 rows-read 风险。

迁移原则：

- 所有 DDL 只通过 migration 执行。
- 禁止请求时自动建表或改表。
- schema 变更必须伴随迁移和回滚说明。

### Phase 3：最小后台数据模型与审核流

目标：

- 先实现最小目录 MVP。
- 跑通后台创建、审核、发布、下架目录条目的闭环。

Payload 注入：

- Global：`directory-settings`。
- Collections：
  - `directory-categories`
  - `directory-items`
  - `directory-jobs`
  - `directory-audit-logs`

权限边界：

- Payload auth 只服务后台管理员。
- Auth.js 只服务前台用户。
- 后台管理员不使用 Auth.js session。
- 前台用户不使用 Payload admin session。
- `directory_items.submitter_user_id` 指向前台用户 ID。
- `directory_items.reviewed_by_admin_id` 指向 Payload admin ID。
- 跨身份字段只存 ID，不共用 session。

最小流程：

1. 后台管理员创建分类。
2. 后台管理员创建目录条目。
3. 条目进入 pending/draft 状态。
4. 后台管理员审核发布。
5. 发布后写 audit log。
6. 发布后创建缓存刷新 job。
7. Public Runtime 可读取 published 条目。

### Phase 4：Public Runtime Helpers 与 KV SWR

目标：

- 实现公开运行面读取能力，不依赖 Payload Core。
- 默认 KV first，D1 fallback。

Public helpers：

- 首页列表 helper。
- 分类列表 helper。
- slug 详情 helper。
- SEO metadata helper。
- sitemap 读取 helper。

KV 缓存对象：

```ts
type DirectoryCacheEntry<T> = {
  data: T
  createdAt: number
  freshUntil: number
  staleUntil: number
  version: string
}
```

读取策略：

1. KV hit 且未过 `freshUntil`：直接返回 fresh data。
2. KV hit 且已过 `freshUntil` 但未过 `staleUntil`：返回 stale data，并通过 `ctx.waitUntil()` 或 queue 投递轻量刷新。
3. KV miss 或超过 `staleUntil`：执行受控 D1 fallback，写入 KV，再返回。

硬性限制：

- Public Runtime 禁止 import `payload`。
- Public Runtime 禁止 import `@payload-config`。
- Public Runtime 禁止 import Admin components。
- Public Runtime 禁止 Node-only API。
- 公开请求不得生成 AI 内容。
- 公开请求不得现场生成 embedding。
- 公开请求不得执行 sitemap 重建。

### Phase 5：Queues 与 Job 状态机

目标：

- 建立异步任务基础设施。
- 所有慢任务通过 queue 解耦。

必需队列：

- `DIRECTORY_AI_QUEUE`
- `DIRECTORY_EMBEDDING_QUEUE`
- `DIRECTORY_CACHE_QUEUE`
- `DIRECTORY_SITEMAP_QUEUE`

可选队列：

- `DIRECTORY_MEDIA_CLEANUP_QUEUE`

Producer 规则：

1. 先写 D1 job，状态为 `pending`。
2. 再投递 queue message。
3. HTTP endpoint 或 Payload hook 返回 `202 Accepted`。
4. 不等待慢任务完成。

Consumer 规则：

1. 按 `jobId` 幂等处理。
2. 获取 job lock 或检查状态。
3. 执行任务。
4. 成功写 `completed`。
5. 失败写 `failed` 和 error。
6. 可重试任务记录 `attempt`。
7. 超过重试次数进入 dead-letter 或人工处理状态。

第一批实现：

- cache rebuild job。
- sitemap rebuild job。

后续接入：

- AI generate job。
- embedding upsert/delete job。
- media cleanup job。
- Stripe entitlement update job。

### Phase 6：Admin 审核流与运营面板

目标：

- 在核心 jobs、settings、collections 稳定后，再实现 `/admin/directory`。

Admin view：

- 路径：`/admin/directory`。

面板内容：

- 目录统计。
- 待审核条目。
- AI jobs 状态。
- Embedding jobs 状态。
- Cache jobs 状态。
- Sitemap jobs 状态。
- Queue health。
- Stripe 订单状态。
- 最近 webhook events。
- 最近 audit logs。
- 缓存刷新按钮。
- sitemap 重建按钮。

限制：

- 所有按钮只允许创建 job 并投递 queue。
- 按钮不允许同步执行慢任务。
- 后台 endpoint 默认 deny，必须逐个显式开放。

### Phase 7：增量能力接入

目标：

- 在 MVP 目录闭环、缓存、队列和 Admin 基础能力稳定后，再分批加入扩展能力。

Auth.js：

- 前台 OAuth 登录。
- D1 adapter/helper。
- 前台 mutation 必须校验 Auth.js session。
- 前台 mutation 必须校验 resource ownership。
- 支持 provider：Google、GitHub、Apple、Facebook。

R2 用户上传：

- 第一版只支持用户上传。
- 不实现自动截图。
- 支持元数据、配额、替换、删除。
- 删除和清理走 media cleanup queue。

AI：

- API 只创建 AI job。
- Queue consumer 调 Workers AI 或 fallback provider。
- 结果写回 D1。
- 普通用户生成结果进入待审核。
- 管理员审核后发布。

Vectorize：

- item 发布/更新后投递 embedding queue。
- Consumer 生成 embedding 后 upsert Vectorize。
- item 下架/删除后投递 delete/disable message。
- 推荐接口只做 Vectorize query + KV/D1 批量读取。
- 公开请求不现场生成 embedding。

Stripe：

- Checkout helper。
- Webhook route factory。
- Webhook 必须使用 raw body。
- 必须校验签名。
- 事件必须幂等。
- 订单必须有状态机。
- 权益变更通过 job 或明确事务更新。

Sitemap：

- sitemap index。
- sitemap shards。
- sitemap 缓存。
- sitemap 异步重建。
- 单个 sitemap 不超过协议限制。

## 测试与验收

每阶段至少包含：

- TypeScript 检查。
- Payload config load 检查。
- 相关单元测试。
- 相关集成测试。
- Cloudflare preview/workerd 验证。

必须新增的测试类型：

- import-boundary 测试：`public/*` 不得 import Payload/Admin/Node-only。
- queue consumer 幂等测试：重复 message 不重复执行副作用。
- D1 查询计划测试：列表、分类、slug 详情、审核队列使用预期索引。
- 权限测试：Payload auth 与 Auth.js session 完全隔离。
- webhook 测试：Stripe raw body、签名校验、事件幂等。
- KV SWR 测试：fresh、stale、expired、miss 四种路径。
- Vectorize 测试：upsert、query、delete/disable message。

平台验收：

- Cloudflare Workers Paid 已启用。
- `D1` 已绑定。
- `R2` 已绑定。
- `ASSETS` 已绑定。
- `DIRECTORY_CACHE_KV` 已绑定。
- `DIRECTORY_VECTORIZE` 已绑定。
- 后续启用 Workers AI 时，`AI` binding 已绑定。
- 后续启用 Queues 时，所有 `DIRECTORY_*_QUEUE` 已绑定。
- `cloudflare-env.d.ts` 重新生成后包含对应 Env 类型。
- `wrangler.jsonc` 与 Cloudflare Dashboard 绑定保持一致。

阻塞条件：

- Paid Workers 未启用：平台阻塞。
- KV 未创建绑定：缓存阶段阻塞。
- Vectorize 未创建绑定：语义搜索、推荐、embedding 阶段阻塞。
- preview/workerd 失败：Cloudflare 兼容性阻塞。
- Public Runtime 出现 Payload/Admin/Node-only import：运行时边界阻塞。

## 默认假设

- 当前仓库作为宿主应用继续开发。
- 第一版目标是可运行目录 MVP，而不是一次性完成所有扩展能力。
- 先以内嵌插件方式落地，稳定后再抽离为独立包。
- D1 是主事实数据库。
- KV 只做缓存和派生摘要。
- Vectorize 只做向量检索，不做主数据存储。
- 所有慢任务走 Cloudflare Queues。
- 所有公开高频路径禁止依赖 Payload Core。

