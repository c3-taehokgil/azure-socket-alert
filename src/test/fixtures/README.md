# Socket.dev webhook test fixtures

Dummy payloads modeled on Socket’s webhook documentation (`alert@1` schema, `SOCKET-DUMMY-*` style `eventId` values). Use them for unit tests and local Function POSTs.

| File | `type` | Purpose |
|------|--------|---------|
| `alert-created.json` | `alert:created` | New critical CVE alert |
| `alert-updated.json` | `alert:updated` | Severity change |
| `alert-cleared.json` | `alert:cleared` | Resolved alert |

## Unit tests

```bash
npm test
```

Tests load these files via `test/helpers/webhookTestHelpers.ts` and sign with `TEST_WEBHOOK_SECRET`.

## Local Function (signed POST)

1. Set `SOCKET_WEBHOOK_SECRET` in `local.settings.json` to the test secret (see `webhookTestHelpers.ts` → `TEST_WEBHOOK_SECRET`).
2. Start the function: `npm start`
3. Send a fixture:

```bash
npm run test:fixture -- alert-created
# optional: BASE_URL=http://localhost:7071 CODE=<function-key>
```

## Socket.dev dashboard

When Socket sends real webhooks, structure matches these fixtures. You can also capture live payloads from [webhook.site](https://webhook.site) and add new JSON files here.
