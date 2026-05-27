# Socket.dev API alert test fixtures

Sample alert objects returned by `GET /orgs/{org_slug}/alerts` (not webhook envelopes). Used for unit tests.

| Fixture | Status | Version | Use case |
|---------|--------|---------|----------|
| `alert-created.json` | `open` | 1 | New alert |
| `alert-updated.json` | `open` | 5 | Severity change |
| `alert-cleared.json` | `cleared` | 6 | Resolved alert |

Load via `test/helpers/alertTestHelpers.ts`:

```typescript
import { loadAlertFixture, fixtureNotification } from "../test/helpers/alertTestHelpers";
```

To add fixtures from production, export alert JSON from the Socket API or dashboard and strip to the fields used by `SocketAlert` in `types/socketAlert.ts`.
