# Open Decisions

**Status:** D1–D5, D7–D9, D12–D13 decided · D10, D11 open  
**Version:** 0.9  
**Date:** 2026-05-25  
**Related:** [SPEC.md](./SPEC.md) · [CONFIGURATION.md](./CONFIGURATION.md)

---

## Summary tracker

| ID | Decision | Status | Owner | Blocking |
|----|----------|--------|-------|----------|
| D1 | Runtime language | ☑ Decided | Platform Engineering | No |
| D2 | Email delivery model | ☑ Decided | DevSecOps | No |
| D3 | Include PR scan events | ☑ Decided | DevSecOps / Socket admin | No |
| D4 | Sender mailbox | ☑ Decided | Exchange / M365 admin | **Yes** |
| D5 | Graph authentication method | ☑ Decided | Entra ID admin | **Yes** |
| D6 | Socket integration model | ☑ Decided | Platform Engineering | No |
| D7 | Multi-environment strategy | ☑ Decided | Platform Engineering | **Yes** |
| D8 | Function hosting plan | ☑ Decided | Platform Engineering | No |
| D9 | Recipient distribution list | ☑ Decided | DevSecOps / Exchange | **Yes** |
| D10 | Alert severity filter | ☐ Open | DevSecOps | No |
| D11 | Repository scope | ☐ Open | Socket admin | No |
| D12 | Socket plan tier confirmed | ☑ Decided | Socket admin | **Yes** |
| D13 | Poll interval | ☑ Decided | DevSecOps | No |

---

## D1 — Runtime language

**Chosen value:** **Node.js 20 (TypeScript)**

---

## D2 — Email delivery model

| | |
|---|---|
| **Question** | One email per alert change, or batched digests? |
| **Decision** | ☑ **A) Immediate** — one email per detected alert version change |
| **Note** | Delivery latency bounded by poll interval (D13), not real-time push |

---

## D3 — Include pull-request scan events

**Chosen value:** **Alert events only** — no `pull-request:scan` (not applicable to alerts API polling)

---

## D4 — Sender mailbox

**Chosen sender UPN:** `socket-alerts@c3.ai`

---

## D5 — Graph authentication method

**Chosen value:** **Managed Identity** with Graph `Mail.Send`

---

## D6 — Socket integration model

| | |
|---|---|
| **Question** | Webhooks (inbound POST) or REST API polling (outbound)? |
| **Options** | A) Webhooks + gateway edge · B) Timer + Socket `alerts:list` API |
| **Decision** | ☐ A · ☑ **B** |
| **Chosen value** | **REST API polling** every 15 minutes. No public inbound endpoint, Front Door, or APIM for Socket. |
| **Rationale** | Simpler security posture; no webhook signing or SaaS ingress |

---

## D7 — Multi-environment strategy

**Chosen value:** **Production only** — `rg-socket-alert-prod`

---

## D8 — Function hosting plan

**Chosen value:** **Flex Consumption (FC1)**

---

## D9 — Recipient distribution list

**Chosen value:** `dependency-security@c3.ai` (sender remains `socket-alerts@c3.ai`)

---

## D10 — Alert severity filter

| **`MIN_SEVERITY` value** | _______________ |
| **Include cleared alerts?** | ☐ Yes · ☐ No |

---

## D11 — Repository scope

| **Repo slug list (if allowlist)** | _______________ |

---

## D12 — Socket plan tier

**Chosen value:** **Enterprise** — API access for `alerts:list`  
**Org slug:** _______________

---

## D13 — Poll interval

| | |
|---|---|
| **Question** | How often should the Function poll Socket? |
| **Decision** | ☑ **15 minutes** |
| **Implementation** | Timer NCRONTAB `0 */15 * * * *` |

---

## Document history

| Version | Date | Changes |
|---------|------|---------|
| 0.8 | 2026-05-25 | D8 FC1; D9 recipients |
| 0.9 | 2026-05-25 | D6 polling vs webhooks; D13 poll interval; removed gateway/webhook decisions |
