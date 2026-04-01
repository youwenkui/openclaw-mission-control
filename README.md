# OpenClaw Mission Control

Local-first operator dashboard for OpenClaw. This V1 is intentionally dense, table-first, and pragmatic: it prioritizes active sessions, blocked approvals, cron health, flow controls, and incident visibility over decorative analytics.

The current UI ships in Chinese and is designed as an operator console rather than a generic AI dashboard.

## What ships in V1

- Overview for gateway health, session counts, mission counts, approval queue, cron state, and recent incidents
- Mission Board with flow/session-derived task rows, status inference, filters, search, detail drawer, and cancel action
- Session Radar with compact operator table, transcript preview drawer, send-message, and abort-run actions
- Approval Inbox for exec and plugin approvals with approve-once, approve-always, deny, and raw payload preview
- Cron Center with run-now action, recent runs, failing-job filtering, and history drawer
- Event Feed with severity-tagged operational events
- Mock mode for local UI work when OpenClaw is offline

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Adjust environment values as needed:

- `OPENCLAW_GATEWAY_URL`: WebSocket URL for the running Gateway
- `OPENCLAW_GATEWAY_TOKEN`: optional Gateway token
- `OPENCLAW_CLI_PATH`: defaults to `openclaw`
- `OPENCLAW_POLL_INTERVAL_MS`: snapshot polling interval
- `OPENCLAW_ENABLE_CLI_FALLBACK`: enables `openclaw flows ...` fallback
- `OPENCLAW_ENABLE_LOCAL_CACHE`: reserved for later local snapshot cache work
- `OPENCLAW_MOCK_MODE`: when `true`, the UI falls back to seeded mock data if live surfaces fail

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

If port `3000` is already in use, Next.js will automatically choose another local port and print it in the terminal.

## How data is sourced

Primary surfaces:

- Gateway RPC through `openclaw gateway call ...`
- Gateway WebSocket bridge for best-effort realtime events and subscriptions
- CLI flow fallback through `openclaw flows list|cancel`

The UI never binds directly to raw payloads. Everything is normalized into:

- `Mission`
- `SessionSummary`
- `ApprovalItem`
- `CronJob`
- `IncidentEvent`
- `GatewayHealth`

## Heuristics

Mission status inference is intentionally explicit in `lib/openclaw/heuristics.ts`:

- `running`: recent updates and no terminal or blocked signal
- `blocked`: pending approval, explicit blocked state, or no progress beyond threshold
- `failed`: terminal error surfaced
- `completed`: explicit terminal/completed markers
- `orphaned`: stale activity with broken or missing linkage

## Graceful degradation

- If the Gateway RPC is down, the app can still render mock mode
- If flows are unavailable, Mission Board still shows session-derived missions
- If realtime WebSocket drops, polling keeps the dashboard usable
- Every surface reports availability and staleness instead of crashing the UI

## Known limitations in V1

- Gateway RPC calls currently go through the official CLI wrapper for reliability, not a fully custom raw RPC client
- The WebSocket event bridge uses best-effort subscriptions because auth/subscription semantics may vary by runtime configuration
- Flow parsing depends on `openclaw flows` availability; if the command is absent, Mission Board leans on sessions plus heuristics
- Local cache is reserved for a later iteration

## Architecture note

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data-plane, normalization, fallback, and limitations summary.
