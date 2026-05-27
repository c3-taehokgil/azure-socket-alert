# azure-socket-alert

Azure integration that polls [Socket.dev](https://socket.dev) alerts via REST API every 15 minutes and delivers alert listing emails to C3 AI Microsoft 365 (Outlook) via Microsoft Graph `sendMail`.

## Documentation

| Document | Description |
|----------|-------------|
| **[SPEC.md](docs/SPEC.md)** | Architecture, email format, deployment |
| **[CONFIGURATION.md](docs/CONFIGURATION.md)** | Socket API token, Entra ID, Graph, O365, Azure |
| **[DECISIONS.md](docs/DECISIONS.md)** | Project decisions and sign-off |

## Infrastructure

Terraform (Function App FC1): [`infra/terraform/`](infra/terraform/)

## Function App

Node.js 20 TypeScript — timer trigger only (no inbound HTTP): [`src/`](src/)

```bash
cd src && npm install && npm run build && npm test
```

## Status

Polling integration implemented in `src/`. Terraform provisions Function App + Key Vault (`socket-api-token`). Store a Socket org token with `alerts:list` scope after apply.
