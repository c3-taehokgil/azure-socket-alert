# Open Decisions

**Status:** D1–D5, D7–D9, D12 decided · D6, D10, D11 open  
**Version:** 0.8  
**Date:** 2026-05-25  
**Related:** [SPEC.md](./SPEC.md) · [CONFIGURATION.md](./CONFIGURATION.md)

Record decisions here before implementation begins. Each item lists options, the spec recommendation, and fields for the chosen value and sign-off.

---

## How to use this document

1. Review each decision with the listed **owner**.
2. Fill in **Decision** and **Chosen value** columns.
3. Check **Sign-off** when the owner approves.
4. Unresolved items marked **Blocking** must be decided before production deployment.

---

## Summary tracker

| ID | Decision | Status | Owner | Blocking |
|----|----------|--------|-------|----------|
| D1 | Runtime language | ☑ Decided | Platform Engineering | No |
| D2 | Email delivery model | ☑ Decided | DevSecOps | No |
| D3 | Include PR scan events | ☑ Decided | DevSecOps / Socket admin | No |
| D4 | Sender mailbox | ☑ Decided | Exchange / M365 admin | **Yes** |
| D5 | Graph authentication method | ☑ Decided | Entra ID admin | **Yes** |
| D6 | Public edge (gateway hostname) | ◐ In progress | Platform Engineering | No |
| D7 | Multi-environment strategy | ☑ Decided | Platform Engineering | **Yes** |
| D8 | Function hosting plan | ☑ Decided | Platform Engineering | No |
| D9 | Recipient distribution list | ☑ Decided | DevSecOps / Exchange | **Yes** |
| D10 | Alert severity filter | ☐ Open | DevSecOps | No |
| D11 | Repository scope | ☐ Open | Socket admin | No |
| D12 | Socket plan tier confirmed | ☑ Decided | Socket admin | **Yes** |

**Status values:** ☐ Open · ◐ In progress · ☑ Decided

---

## D1 — Runtime language

**Owner:** Platform Engineering  
**Blocking:** No

| | |
|---|---|
| **Question** | Which language/runtime for the Azure Function App? |
| **Options** | A) .NET 8 isolated · B) Node.js 20 (TypeScript) |
| **Recommendation** | **A) .NET 8** — aligns with common C3/Azure enterprise patterns and Graph SDK maturity |
| **Decision** | ☐ A · ☑ **B** · ☐ Other: _______________ |
| **Chosen value** | **Node.js 20 (TypeScript)** — .NET is not a primary language at C3 AI |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D2 — Email delivery model

**Owner:** DevSecOps  
**Blocking:** No

| | |
|---|---|
| **Question** | Send one email per webhook event, or batch into digests? |
| **Options** | A) Immediate — one email per event · B) Digest — batched (e.g. every 15 minutes) |
| **Recommendation** | **A) Immediate** for v1; digest as v2 enhancement |
| **Decision** | ☑ **A** · ☐ B |
| **Digest interval (if B)** | N/A |
| **Chosen value** | **Immediate** — one email per webhook event |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D3 — Include pull-request scan events

**Owner:** DevSecOps / Socket admin  
**Blocking:** No

| | |
|---|---|
| **Question** | Subscribe to `pull-request:scan` webhook events in addition to `alert:*` events? |
| **Options** | A) Yes — alert events + PR scans · B) No — alert events only |
| **Recommendation** | **A) Yes** — valuable for DevSecOps PR workflow |
| **Decision** | ☐ A · ☑ **B** |
| **Socket event types to enable** | ☑ `alert:created` · ☑ `alert:updated` · ☑ `alert:cleared` · ☐ `pull-request:scan` |
| **Chosen value** | **Alert events only** — no `pull-request:scan` |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D4 — Sender mailbox

**Owner:** Exchange / M365 admin  
**Blocking:** **Yes** — required for Graph `sendMail` and Application Access Policy

| | |
|---|---|
| **Question** | Which mailbox sends alert emails? |
| **Options** | A) Shared mailbox · B) Dedicated licensed user account |
| **Recommendation** | **A) Shared mailbox** — e.g. `socket-alerts@c3.ai` |
| **Decision** | ☑ **A** · ☐ B |
| **Chosen sender UPN** | `socket-alerts@c3.ai` |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D5 — Graph authentication method

**Owner:** Entra ID admin  
**Blocking:** **Yes** — required before Function App can send mail

| | |
|---|---|
| **Question** | How does the Function App authenticate to Microsoft Graph? |
| **Options** | A) Managed Identity service principal · B) App registration + client secret · C) App registration + federated credential |
| **Recommendation** | **A) Managed Identity** unless tenant policy blocks MI Graph application permissions |
| **Decision** | ☑ **A** · ☐ B · ☐ C |
| **Client ID (if B or C)** | N/A — Managed Identity (no client secret) |
| **Chosen value** | **Option A** — Function App system-assigned Managed Identity with Graph `Mail.Send` |
| **Sign-off** | Name: _______________ Date: _______________ |

See [CONFIGURATION.md §2](./CONFIGURATION.md#2-microsoft-entra-id) for setup steps per option.

---

## D6 — Public edge (gateway)

**Owner:** Platform Engineering  
**Blocking:** No  
**Standard:** [WEBHOOK-INTEGRATION-STANDARD.md](./WEBHOOK-INTEGRATION-STANDARD.md)

C3 AI uses **one standard pattern** for all inbound SaaS webhooks. D6 is not a design debate — it is confirming the gateway hostname for this project.

```
Socket.dev → Front Door + WAF → APIM → Function (private) → Graph → O365
```

| | |
|---|---|
| **Standard** | Front Door + WAF (public) → APIM → Function (private). See [WEBHOOK-INTEGRATION-STANDARD.md](./WEBHOOK-INTEGRATION-STANDARD.md). |
| **Terraform** | Provision in target subscription per [TERRAFORM-D6-GATEWAY.md](./TERRAFORM-D6-GATEWAY.md) — starter in [`../infra/terraform/`](../infra/terraform/) |
| **Function App on public internet?** | **No** — never register `*.azurewebsites.net` in Socket.dev |
| **What Socket.dev registers** | Front Door hostname + path only |
| **Decision** | Confirm hostname and path for this project |
| **Front Door hostname** | _______________ |
| **Webhook path** | e.g. `/webhooks/socket` |
| **Sign-off** | Name: _______________ Date: _______________ |

**Application security (required regardless of gateway):** HMAC signature verification · replay window · idempotency · Key Vault secrets · Managed Identity · least-privilege Graph.

## D7 — Multi-environment strategy

**Owner:** Platform Engineering  
**Blocking:** **Yes** — affects resource naming, Socket webhooks, and secrets

| | |
|---|---|
| **Question** | How many environments, and how are they isolated? |
| **Options** | A) Single production Function App + webhook · B) Separate dev / staging / prod Function Apps and Socket webhooks |
| **Recommendation** | **B) Separate environments** — at minimum dev + prod |
| **Decision** | ☑ **A** · ☐ B |
| **Environment list** | ☐ dev · ☐ staging · ☑ **prod** |
| **Chosen value** | **Production only** — no dev environment |
| **Azure resource group naming** | e.g. `rg-socket-alert-prod` |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D8 — Function hosting plan

**Owner:** Platform Engineering  
**Blocking:** No

| | |
|---|---|
| **Question** | Which Azure Functions hosting plan? |
| **Options** | A) Flex Consumption (FC1) · B) Elastic Premium (EP) · C) Legacy Consumption (Y1) |
| **Recommendation** | **A) Flex Consumption (FC1)** per Azure Functions guidance; EP if VNet integration required |
| **Decision** | ☑ **A** · ☐ B · ☐ C |
| **VNet integration required?** | ☐ Yes · ☑ **No** |
| **Chosen value** | **Flex Consumption (FC1)** |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D9 — Recipient distribution list

**Owner:** DevSecOps / Exchange admin  
**Blocking:** **Yes** — required for email delivery

| | |
|---|---|
| **Question** | Who receives alert listing emails? |
| **Options** | A) Single M365 group / DL · B) Multiple addresses · C) Different lists per severity (v2) |
| **Recommendation** | **A) Single DL** for v1 — e.g. `dependency-security@c3.ai` |
| **Decision** | ☑ **A** · ☐ B · ☐ C |
| **Primary recipient address(es)** | `dependency-security@c3.ai` |
| **Reply-To address (optional)** | _______________ |
| **Chosen value** | **Single DL** — `dependency-security@c3.ai` (sender remains `socket-alerts@c3.ai` per D4) |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D10 — Alert severity filter

**Owner:** DevSecOps  
**Blocking:** No

| | |
|---|---|
| **Question** | Which Socket alert severities trigger email? |
| **Options** | A) All (`low` and above) · B) `medium` and above · C) `high` and above · D) `critical` only |
| **Recommendation** | **A) for v1** — tune with `MIN_SEVERITY` app setting if volume is too high |
| **Decision** | ☐ A · ☐ B · ☐ C · ☐ D |
| **`MIN_SEVERITY` value** | _______________ |
| **Include cleared alerts?** | ☐ Yes · ☐ No |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D11 — Repository scope

**Owner:** Socket admin  
**Blocking:** No

| | |
|---|---|
| **Question** | Which Socket-connected repositories generate webhook events? |
| **Options** | A) All org repositories · B) Allowlist of specific repos · C) Exclude list |
| **Recommendation** | Start with **B) allowlist** in non-prod; expand to **A)** when validated |
| **Decision** | ☐ A · ☐ B · ☐ C |
| **Repo slug list (if B or C)** | _______________ |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## D12 — Socket plan tier

**Owner:** Socket admin  
**Blocking:** **Yes** — webhooks require Business or Enterprise plan

| | |
|---|---|
| **Question** | Does the C3 AI Socket.dev org have webhook support enabled? |
| **Options** | A) Business · B) Enterprise · C) Not confirmed / insufficient tier |
| **Recommendation** | Confirm **A or B** before proceeding |
| **Decision** | ☐ A · ☑ **B** · ☐ C |
| **Chosen value** | **Enterprise** — webhooks supported |
| **C3 AI Socket org slug** | _______________ |
| **Sign-off** | Name: _______________ Date: _______________ |

---

## Stakeholder sign-off summary

| Role | Reviewer | Date | All blocking items resolved |
|------|----------|------|---------------------------|
| Socket.dev org admin | | | ☐ |
| Entra ID admin | | | ☐ |
| Exchange / M365 admin | | | ☐ |
| Azure platform engineering | | | ☐ |
| Security | | | ☐ |
| DevSecOps / on-call | | | ☐ |

---

## Document history

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-05-25 | Initial decisions log with sign-off fields |
| 0.2 | 2026-05-25 | D1–D5 decided: TypeScript/Node.js, immediate delivery, alerts only, `socket-alerts@c3.ai`, Managed Identity |
| 0.3 | 2026-05-25 | D6 expanded: what is internet-facing vs private (webhook endpoint only) |
| 0.4 | 2026-05-25 | D6: clarified Socket SSO / Entra app registration is unrelated to APIM Option B |
| 0.5 | 2026-05-25 | D6: Option A ruled out; B/C decision driven by security posture, not compliance |
| 0.6 | 2026-05-25 | D6 simplified; standard pattern moved to WEBHOOK-INTEGRATION-STANDARD.md |
| 0.7 | 2026-05-25 | D7 prod only; D9 DL `socket-alerts@c3.ai`; D12 Enterprise confirmed |
| 0.8 | 2026-05-25 | D8 FC1; D9 corrected to `dependency-security@c3.ai` per recommendation |
