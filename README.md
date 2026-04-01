# OpenClaw Mission Control

OpenClaw Mission Control 是一个面向重度 OpenClaw 使用者的本地优先运维控制台。

它不是营销页，也不是泛化 AI SaaS dashboard，而是一个偏操作台风格的 companion app：用尽量少的假设，把 OpenClaw Gateway、events、cron、approvals、session 和 CLI flow surface 聚合成一个可读、可操作、可降级的控制中心。

当前版本为 `v0.1.0`，界面以中文为主。

## 截图

### 总览页

![Overview live dashboard](docs/screenshots/overview-live.png)

### 任务看板

![Mission board](docs/screenshots/mission-board-empty.png)

更多安装与运行界面说明见 [`docs/INSTALL.md`](docs/INSTALL.md)。

## V1 能做什么

- 查看网关连接状态与数据源可用性
- 查看活跃会话、运行中任务、阻塞任务、失败任务
- 汇总待处理执行审批和插件审批
- 查看 cron 调度、最近状态、失败计数和运行历史
- 在 Mission Board 中查看任务型单元并尝试取消 flow
- 在 Session Radar 中查看活跃会话、发送消息、终止当前运行
- 在 Approval Inbox 中批准、始终批准或拒绝审批
- 在 Event Feed 中查看统一事件流和事故流
- 当部分 OpenClaw surface 不可用时自动降级，而不是整页崩掉
- 当 OpenClaw 离线时进入 mock mode，便于本地开发 UI

## 技术栈

- Next.js 15
- TypeScript
- React
- Tailwind CSS
- Zustand
- TanStack Query
- WebSocket

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/youwenkui/openclaw-mission-control.git
cd openclaw-mission-control
```

### 2. 安装依赖

```bash
npm install
```

### 3. 复制环境变量

```bash
cp .env.example .env.local
```

### 4. 启动开发环境

```bash
npm run dev
```

### 5. 打开浏览器

默认地址：

```text
http://localhost:3000
```

如果 `3000` 被占用，Next.js 会自动切到其他端口，并在终端输出实际地址。

## 连接真实 OpenClaw

在 `.env.local` 中配置：

```env
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_CLI_PATH=openclaw
OPENCLAW_POLL_INTERVAL_MS=5000
OPENCLAW_ENABLE_CLI_FALLBACK=true
OPENCLAW_ENABLE_LOCAL_CACHE=false
OPENCLAW_MOCK_MODE=true
```

说明：

- `OPENCLAW_GATEWAY_URL`: 本地 OpenClaw Gateway 地址
- `OPENCLAW_GATEWAY_TOKEN`: 如果网关启用了 token auth，则填写
- `OPENCLAW_CLI_PATH`: OpenClaw CLI 路径，默认 `openclaw`
- `OPENCLAW_POLL_INTERVAL_MS`: 前端快照轮询间隔
- `OPENCLAW_ENABLE_CLI_FALLBACK`: 是否启用 `openclaw flows ...` CLI 回退
- `OPENCLAW_ENABLE_LOCAL_CACHE`: 为后续本地缓存预留，V1 默认不启用
- `OPENCLAW_MOCK_MODE`: 当实时 surface 不可用时是否回退到 mock 数据

## 数据面与设计原则

V1 优先使用真实 OpenClaw integration surface：

1. Gateway RPC
2. Gateway events / WebSocket
3. `openclaw flows list | show | cancel`
4. cron methods
5. session methods
6. exec approval methods
7. plugin approval methods

同时坚持以下原则：

- 不以 log scraping 作为主架构
- 不把 UI 主逻辑硬绑定到内部 SQLite schema
- 不让原始 Gateway payload 直接泄漏到组件层
- 一个数据源挂掉时，其它区域仍然可用

## 核心视图

### Overview

系统健康、会话数、任务数、审批数、cron 异常与近期事故。

### Mission Board

主任务看板，展示 flow 或从 session 推断出的任务型单元，支持搜索、筛选、详情抽屉和取消 flow。

### Session Radar

紧凑会话表，展示 agent、channel、model、最近消息、最近工具调用、会话预览，并支持发送消息和中止运行。

### Approval Inbox

统一展示 exec approval 和 plugin approval，支持人工批准与拒绝。

### Cron Center

查看 schedule、最近状态、下次运行时间、连续失败数，并支持手动触发运行。

### Event Feed

统一展示 session message、tool、approval、cron、disconnect、shutdown、failure 等事件。

## 启发式状态推断

由于 OpenClaw 目前还没有完整的全局任务编排模型，V1 对任务状态做了显式启发式推断：

- `running`: 最近仍有活动且未进入终态
- `blocked`: 存在待审批、显式阻塞，或长时间无进展
- `failed`: 已观察到终态错误
- `completed`: 已观察到终态完成
- `orphaned`: 任务存在，但关联活动已中断或严重陈旧

对应代码见 [`lib/openclaw/heuristics.ts`](lib/openclaw/heuristics.ts)。

## 容错与降级

- Gateway events 掉线时，UI 自动退回 polling
- `flows` 不可用时，Mission Board 会退回 session-derived missions
- 某些 OpenClaw runtime 不支持 `plugin.approvals.get` 时，插件审批会标记为 unavailable，而不是拖垮整站健康状态
- 如果 live surface 不可用且 `OPENCLAW_MOCK_MODE=true`，系统自动切到 mock mode

## 已知限制

- 当前 Gateway RPC 走的是官方 CLI wrapper，而不是自建原生 RPC client
- WebSocket 订阅能力仍是 best-effort，因为不同 OpenClaw runtime 的 auth/subscribe 细节可能不同
- `flows` 能力取决于你当前 OpenClaw 版本；若 runtime 不支持，控制台会退回 session 推断
- 本地 SQLite 缓存/历史仍是后续版本工作

## 文档

- 安装说明：[`docs/INSTALL.md`](docs/INSTALL.md)
- 架构说明：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## 开源许可

本项目使用 [`MIT License`](LICENSE)。
