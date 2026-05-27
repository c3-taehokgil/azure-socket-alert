# Socket Alert Azure Function

Node.js 20 TypeScript Azure Functions v4 app — polls Socket.dev alerts via REST API every 15 minutes and sends alert emails via Microsoft Graph `sendMail`.

## Local development

```bash
cd src
npm install
cp local.settings.json.example local.settings.json
# Set SOCKET_API_TOKEN and SOCKET_ORG_SLUG

npm run build
npm test
npm start
```

The timer trigger runs on schedule when hosted in Azure. Locally, invoke `socketAlertPoller` from the Functions host or run unit tests.

## Deploy

After Terraform provisions the Function App:

```bash
cd src
npm ci
npm run build
func azure functionapp publish func-socket-alert-prod
```

## Configuration

| Setting | Description |
|---------|-------------|
| `SOCKET_API_TOKEN` | Socket org token with `alerts:list` scope |
| `SOCKET_ORG_SLUG` | Organization slug (required) |
| `SOCKET_API_BASE_URL` | API base URL (default `https://api.socket.dev/v0`) |
| `MAIL_SENDER_UPN` | Graph sender (`socket-alerts@c3.ai`) |
| `MAIL_TO_ADDRESSES` | Recipients (`dependency-security@c3.ai`) |
| `AzureWebJobsStorage` | Storage connection (Functions + state table) |
| `MIN_SEVERITY` | `low`, `medium`, `high`, or `critical` |
| `INCLUDE_CLEARED` | `true` / `false` |
| `REPO_ALLOWLIST` | Optional comma-separated repo slugs |
| `STATE_TABLE_NAME` | Table for poll watermark + idempotency (default `SocketAlertState`) |

Uses **Managed Identity** for Graph `Mail.Send` in Azure (no client secret).

## Flow

1. Timer fires every 15 minutes (`socketAlertPoller`).
2. `GET /orgs/{org_slug}/alerts` with Bearer token; paginates via `endCursor`.
3. First run sets a poll watermark only (no emails) to avoid historical blast.
4. Subsequent runs email new/changed alerts (`id` + `version`), then record state in Table Storage.
5. `sendAlertEmail` calls Graph `/users/{sender}/sendMail`.

## Unit testing

```bash
cd src
npm test
```

Fixtures under `test/fixtures/` are Socket API alert objects from `alerts:list`.

## CI

```bash
cd src && npm ci && npm run build && npm test
```
