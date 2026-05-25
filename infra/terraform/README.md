# Terraform — socket-alert (prod)

Provisions the D6 gateway stack and Function App in a single Azure subscription.

**Full guide:** [docs/TERRAFORM-D6-GATEWAY.md](../../docs/TERRAFORM-D6-GATEWAY.md)

## Quick start

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with subscription ID, region, and D6 hostname

terraform init
terraform plan -out=tfplan
terraform apply tfplan

terraform output socket_webhook_url
```

## What gets created

- Resource group `rg-socket-alert-prod`
- Front Door + WAF (public edge — register this URL in Socket.dev)
- API Management (routes to Function)
- Function App Flex Consumption (Node.js 20)
- Storage, Key Vault, Application Insights, idempotency table

## Post-apply

1. Store Socket signing secret in Key Vault
2. Grant Function MI Graph `Mail.Send` ([CONFIGURATION.md](../../docs/CONFIGURATION.md))
3. Configure Exchange Application Access Policy
4. Deploy Function code from `src/`
5. Register webhook URL in Socket.dev
