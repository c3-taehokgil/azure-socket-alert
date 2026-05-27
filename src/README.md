# Socket Alert Azure Function

Node.js 20 TypeScript Azure Functions v4 app — receives Socket.dev webhooks and sends alert emails via Microsoft Graph.

## Local development

```bash
cd src
npm install
cp local.settings.json.example local.settings.json
# Edit local.settings.json with secrets and Azurite/storage connection string

npm run build
npm test
npm start
```

POST to:

```http
POST http://localhost:7071/api/socket-webhook?code=<function-key>
Content-Type: application/json
x-webhook-signature: t=<unix>,s=<hmac>
```

## Deploy

After Terraform provisions the Function App:

```bash
cd src
npm ci
npm run build
func azure functionapp publish func-socket-alert-prod
```

Or zip deploy via CI/CD pipeline.

## Configuration

| Setting | Description |
|---------|-------------|
| `SOCKET_WEBHOOK_SECRET` | Socket `whsec_...` signing key |
| `MAIL_SENDER_UPN` | Graph sender (`socket-alerts@c3.ai`) |
| `MAIL_TO_ADDRESSES` | Recipients (`dependency-security@c3.ai`) |
| `AzureWebJobsStorage` | Storage connection (Functions + idempotency table) |
| `MIN_SEVERITY` | `low`, `medium`, `high`, or `critical` |
| `INCLUDE_CLEARED` | `true` / `false` |
| `REPO_ALLOWLIST` | Optional comma-separated repo slugs |
| `SOCKET_ORG_SLUG` | Optional org slug validation |

Uses **Managed Identity** for Graph `Mail.Send` in Azure (no client secret).

## Unit testing

Tests use [Vitest](https://vitest.dev/) and run **without** starting the Functions host or calling Azure.

```bash
cd src
npm test              # run once
npm run test:watch    # re-run on file changes
```

### Socket.dev dummy payloads

Fixtures under `test/fixtures/` mirror Socket’s `alert@1` shape (`SOCKET-DUMMY-*` event IDs):

| Fixture | Event type |
|---------|------------|
| `alert-created.json` | `alert:created` |
| `alert-updated.json` | `alert:updated` |
| `alert-cleared.json` | `alert:cleared` |

Helpers in `test/helpers/webhookTestHelpers.ts` sign payloads with `TEST_WEBHOOK_SECRET` (same value in `local.settings.json.example`).

**Tests:** signature (all fixtures), email rendering, processor flow (mocked Graph + Table Storage) — 11 tests.

### Local POST with a fixture

```bash
cp local.settings.json.example local.settings.json
npm start
# other terminal:
npm run test:fixture -- alert-created
CODE=<function-key> npm run test:fixture -- alert-created
```

See `test/fixtures/README.md`. Graph `sendMail` still requires Azure credentials locally unless mocked.

### CI

```bash
cd src && npm ci && npm run build && npm test
```

