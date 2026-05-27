# Terraform — socket-alert (prod)

Provisions the Function App (Flex Consumption), storage, Key Vault, and Application Insights for Socket alert polling.

## Quick start

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: subscription_id, socket_org_slug, mail settings

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## What gets created

- Resource group `rg-socket-alert-prod`
- Function App Flex Consumption (Node.js 20, timer trigger only)
- Storage account (Functions runtime + alert state table)
- Key Vault (`socket-api-token` secret placeholder)
- Application Insights

No public HTTP endpoint, Front Door, or APIM — the Function polls Socket outbound via REST API.

## Post-apply

1. Create a Socket **org token** with `alerts:list` scope and store it in Key Vault secret `socket-api-token`
2. Grant Function MI Graph `Mail.Send` ([CONFIGURATION.md](../../docs/CONFIGURATION.md))
3. Configure Exchange Application Access Policy
4. Deploy Function code from `src/`

```bash
terraform output socket_api_configuration
terraform output function_app_name
```

## Two-phase first deploy

The Function’s first poll sets a watermark only (no historical emails). After deploy, verify timer runs in Application Insights.
