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

### What to unit test (recommended layers)

The HTTP trigger in `functions/socketWebhook.ts` is thin. Unit-test **services** instead:

| Layer | File | What to assert |
|-------|------|----------------|
| Signature | `services/webhookSignatureValidator.ts` | Valid/invalid HMAC, stale timestamp *(tests exist)* |
| Email | `services/alertEmailRenderer.ts` | Subject line, severity → importance, HTML escaping |
| Config | `config.ts` | `meetsMinSeverity`, env parsing |
| Processor | `services/webhookProcessor.ts` | Filters, idempotency skip, unsupported events *(mock Graph + table)* |
| HTTP handler | `functions/socketWebhook.ts` | Status codes 401/405/200 *(mock `WebhookProcessor`)* |

Do **not** unit test against live Graph, Key Vault, or Table Storage — mock those dependencies.

### Example: test email rendering (pure function)

```typescript
import { describe, expect, it } from "vitest";
import { renderAlertEmail } from "./alertEmailRenderer";
import { AppConfig } from "../config";

const config = {
  mailSenderUpn: "socket-alerts@c3.ai",
  mailToAddresses: ["dependency-security@c3.ai"],
} as AppConfig;

describe("renderAlertEmail", () => {
  it("builds subject for alert:created", () => {
    const email = renderAlertEmail({
      type: "alert:created",
      eventId: "evt-1",
      data: {
        alert: { title: "CVE in lodash", severity: "critical" },
        organization: { slug: "c3-ai" },
      },
    }, config);

    expect(email.subject).toContain("[Socket Critical]");
    expect(email.subject).toContain("CVE in lodash");
    expect(email.importance).toBe("high");
  });
});
```

Add files as `*.test.ts` next to the module under `src/` (Vitest picks them up automatically).

### Example: test processor with mocks

Refactor-friendly pattern: inject dependencies into `WebhookProcessor` (config is already injectable). Mock Graph and idempotency with Vitest:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./graphMailSender", () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./idempotencyStore", () => ({
  IdempotencyStore: vi.fn().mockImplementation(() => ({
    hasProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  })),
}));
```

Then call `processor.process(signedBody, signatureHeader)` and assert `{ status: "sent" }` without Azure.

### Example: test HTTP handler

Export `socketWebhook` (already exported) and pass a minimal mock request:

```typescript
import { socketWebhook } from "../functions/socketWebhook";

const context = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as InvocationContext;

const request = {
  method: "POST",
  headers: new Headers({ "x-webhook-signature": header }),
  text: async () => rawBody,
} as HttpRequest;

const response = await socketWebhook(request, context);
expect(response.status).toBe(200);
```

Use the same `sign()` helper from `webhookSignatureValidator.test.ts` to build valid signatures.

### Integration / manual testing (not unit tests)

For end-to-end locally:

1. Start [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) or use a dev storage account in `local.settings.json`
2. `npm start` — Functions host on port 7071
3. POST a signed payload with curl or [webhook.site](https://webhook.site) replay

Graph send will fail locally unless you use a test tenant + `DefaultAzureCredential` / logged-in `az` identity — keep Graph out of unit tests.

### CI

```bash
cd src && npm ci && npm run build && npm test
```

