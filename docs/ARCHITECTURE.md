# Architecture Note

## Data sources

V1 uses real OpenClaw surfaces first:

1. Gateway RPC via `openclaw gateway call`
2. Gateway WebSocket for realtime subscription attempts and event streaming
3. Flows CLI fallback via `openclaw flows list` and `openclaw flows cancel`

The app deliberately does not use log scraping as its primary architecture and does not couple the UI to internal SQLite tables.

## Server shape

- Next.js app router
- Node route handlers under `app/api/*`
- `lib/openclaw/service.ts` aggregates and normalizes data
- `lib/openclaw/gateway-events.ts` manages a singleton event bridge with automatic reconnect

## Normalization strategy

Raw OpenClaw payloads never go straight into components. The adapter layer maps them into stable UI models:

- `Mission`
- `SessionSummary`
- `ApprovalItem`
- `CronJob`
- `IncidentEvent`
- `GatewayHealth`

This keeps the UI resilient if individual RPC payloads evolve.

## Fallback logic

- Snapshot polling runs every 5 seconds from the browser
- Realtime events are streamed into the client through `/api/events`
- If the WebSocket bridge fails, the bridge marks itself `polling` and the UI keeps updating from snapshots
- If Gateway RPC is unavailable and `OPENCLAW_MOCK_MODE=true`, the UI serves mock seed data instead of rendering an empty or broken console
- If flows are unavailable, the Mission Board still shows session-derived mission rows

## Operator safety

- Destructive actions use confirmation prompts
- Approval actions show the exact action and decision being confirmed
- No secrets are exposed in the client bundle
- Gateway config stays in environment variables

## Known limitations

- Realtime coverage is best-effort until the Gateway subscription/auth contract is fully codified here
- Mission status is heuristic because OpenClaw does not yet expose a canonical global mission graph
- Plugin approval list availability may vary by runtime; the dashboard tolerates that surface being absent
