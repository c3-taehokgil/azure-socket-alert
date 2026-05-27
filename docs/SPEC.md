# Socket.dev → Microsoft 365 Alert Email Integration

**Status:** Draft for review  
**Version:** 0.3  
**Date:** 2026-05-25  
**Repository:** `azure-socket-alert`  
**Audience:** C3 AI Platform Engineering, DevSecOps, Entra ID / Exchange admins, Socket.dev org owners

### Related documents

| Document | Purpose |
|----------|---------|
| [CONFIGURATION.md](./CONFIGURATION.md) | External setup — Socket API token, Entra ID, Graph, O365, Azure |
| [DECISIONS.md](./DECISIONS.md) | Project decisions and sign-off |

---

## 1. Executive summary

C3 AI uses [Socket.dev](https://socket.dev) for dependency and supply-chain security. This integration polls Socket’s **alerts REST API** on a schedule and sends **alert listing emails** to Microsoft 365 via **Microsoft Graph `sendMail`**.

1. **Timer trigger** runs every **15 minutes**.
2. **Socket REST API** — `GET /orgs/{org_slug}/alerts` with org token (`alerts:list`).
3. **Change detection** — email when an alert `id` + `version` is new; infer created / updated / cleared.
4. **Microsoft Graph** — send HTML email from `socket-alerts@c3.ai` to `dependency-security@c3.ai`.
5. **Azure Table Storage** — poll watermark and notification idempotency.

Runtime: **Azure Function App** (Node.js 20, Flex Consumption), **Managed Identity** for Graph, **Key Vault** for Socket API token.

---

## 2. Goals and non-goals

### Goals

| ID | Goal |
|----|------|
| G1 | Deliver Socket alerts to O365 within one poll interval (~15 min) of API-visible changes |
| G2 | Entra app-only Graph `Mail.Send` via Managed Identity |
| G3 | Support alert lifecycle: created, updated, cleared |
| G4 | Idempotency — no duplicate emails for the same alert version |
| G5 | Infrastructure as code (Terraform) in Azure |

### Non-goals (v1)

| ID | Non-goal |
|----|----------|
| NG1 | Inbound webhooks from Socket |
| NG2 | `pull-request:scan` events |
| NG3 | Bi-directional triage from email |
| NG4 | Long-term alert database / SIEM |
| NG5 | Per-repo owner routing |

---

## 3. Architecture

```mermaid
flowchart LR
  subgraph Timer["Azure Function"]
    POLL[Timer every 15 min]
    PROC[Alert poller]
    MAIL[Graph sendMail]
  end

  subgraph Socket["Socket.dev API"]
    API["GET /orgs/{slug}/alerts"]
  end

  subgraph Azure["Azure"]
    KV[Key Vault token]
    TBL[Table Storage state]
    AI[App Insights]
  end

  subgraph M365["Microsoft 365"]
    EXO[Exchange Online]
    INBOX[dependency-security@c3.ai]
  end

  POLL --> PROC
  PROC --> API
  KV --> PROC
  PROC --> TBL
  PROC --> MAIL
  MAIL --> EXO --> INBOX
  PROC --> AI
```

### Components

| Component | Responsibility |
|-----------|----------------|
| **Timer trigger** | `socketAlertPoller` — NCRONTAB `0 */15 * * * *` |
| **Socket API client** | Paginated `alerts:list`, optional `filters.alertUpdatedAt.gte` |
| **Alert poller** | Filters, idempotency, event-type inference |
| **Email renderer** | HTML + plain text alert listing |
| **Graph mail sender** | `POST /users/{sender}/sendMail` |
| **Notification state store** | `lastPollAt`, per-alert version tracking |

---

## 4. Socket REST API integration

| Property | Value |
|----------|-------|
| Endpoint | `GET /v0/orgs/{org_slug}/alerts` |
| Auth | Bearer org token |
| Scope | `alerts:list` |
| Pagination | `endCursor` / `startAfterCursor` |
| Poll filter | `filters.alertUpdatedAt.gte` since last poll (with overlap) |

### Event inference (no webhook envelope)

| Condition | Email type |
|-----------|------------|
| First seen `id`, status `open` | Created |
| Higher `version`, status `open` | Updated |
| `status` = `cleared` | Cleared |

### Idempotency key

`${alert.id}:v${alert.version}` stored in Table Storage partition `notifications`.

### Bootstrap

First poll sets `lastPollAt` only — avoids emailing historical alerts.

---

## 5. Email format

Same listing layout as prior spec: severity, category, title, repo, dependency, CVE block, dashboard link, alert id/version footer.

Subject examples:

- `[Socket Critical] Prototype pollution in lodash — c3-ai/platform-services`
- `[Socket Updated/High] …`
- `[Socket Cleared] …`

---

## 6. Microsoft Graph

- **Permission:** `Mail.Send` (application)
- **Auth:** System-assigned Managed Identity
- **Sender:** `socket-alerts@c3.ai` (D4)
- **Recipients:** `dependency-security@c3.ai` (D9)

See [CONFIGURATION.md](./CONFIGURATION.md).

---

## 7. Azure resources

| Resource | Notes |
|----------|-------|
| Resource group | `rg-socket-alert-prod` |
| Function App | FC1, Node 20, timer only |
| Storage | Runtime + Table Storage |
| Key Vault | `socket-api-token` |
| Application Insights | Logs and metrics |

Terraform: [`infra/terraform/`](../infra/terraform/)

---

## 8. Application settings

| Setting | Description |
|---------|-------------|
| `SOCKET_API_TOKEN` | Org token (Key Vault) |
| `SOCKET_ORG_SLUG` | Organization slug |
| `MAIL_SENDER_UPN` | Graph sender |
| `MAIL_TO_ADDRESSES` | Recipients |
| `MIN_SEVERITY` | Optional filter |
| `INCLUDE_CLEARED` | Include cleared alerts |
| `REPO_ALLOWLIST` | Optional repo filter |
| `STATE_TABLE_NAME` | Default `SocketAlertState` |

---

## 9. Observability

Log per poll: `alertsFetched`, `sent`, `duplicates`, `skipped`, `bootstrapped`.

---

## 10. Repository layout

```
src/
├── functions/socketAlertPoller.ts
├── services/
│   ├── socketApiClient.ts
│   ├── alertPoller.ts
│   ├── alertEmailRenderer.ts
│   ├── graphMailSender.ts
│   └── notificationStateStore.ts
├── config.ts
└── types/socketAlert.ts
infra/terraform/
└── modules/function/
```

---

## 11. Deployment checklist

- [ ] Terraform apply with `socket_org_slug`
- [ ] Store org token in Key Vault `socket-api-token`
- [ ] Entra: `Mail.Send` + admin consent for Function MI
- [ ] Exchange Application Access Policy
- [ ] Deploy `src/` to Function App
- [ ] Verify timer executions in Application Insights
- [ ] Confirm email on test alert after bootstrap poll

---

## Document history

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-05-25 | Initial webhook-based spec |
| 0.2 | 2026-05-25 | Gateway / FC1 revisions |
| 0.3 | 2026-05-25 | **Polling REST API** — removed webhooks, Front Door, APIM |
