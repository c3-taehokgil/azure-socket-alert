# azure-socket-alert

Azure integration to receive [Socket.dev](https://socket.dev) security alert webhooks and deliver alert listing emails to C3 AI Microsoft 365 (Outlook) via Microsoft Graph API.

## Documentation

| Document | Description |
|----------|-------------|
| **[WEBHOOK-INTEGRATION-STANDARD.md](docs/WEBHOOK-INTEGRATION-STANDARD.md)** | **Start here** — C3 AI standard secure pattern for all inbound SaaS webhooks |
| **[SPEC.md](docs/SPEC.md)** | Socket.dev project specification — email format, deployment plan |
| **[CONFIGURATION.md](docs/CONFIGURATION.md)** | Step-by-step external configuration for Socket.dev, Entra ID, Graph, O365, and Azure |
| **[TERRAFORM-D6-GATEWAY.md](docs/TERRAFORM-D6-GATEWAY.md)** | Terraform guide for D6 gateway (Front Door → APIM → Function) in target subscription |
| **[DECISIONS.md](docs/DECISIONS.md)** | Project-specific decisions and sign-off |

## Infrastructure

Terraform (gateway + Function App FC1): [`infra/terraform/`](infra/terraform/) — see [TERRAFORM-D6-GATEWAY.md](docs/TERRAFORM-D6-GATEWAY.md).

## Function App

Node.js 20 TypeScript Azure Functions v4: [`src/`](src/) — see [src/README.md](src/README.md).

```bash
cd src && npm install && npm run build && npm test
```

## Status

Function App implemented. Terraform function module implemented; gateway/APIM modules remain stubs. Deploy per [docs/SPEC.md](docs/SPEC.md).
