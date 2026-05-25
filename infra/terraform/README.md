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
- Storage, Key Vault, Application Insights

## Variables for steps 3–5 (passed into modules 1–2)

| Step | Variables (root `terraform.tfvars`) | Module |
|------|-----------------------------------|--------|
| **3** DNS + TLS + hostname | `custom_domain`, `webhook_path`, `waf_mode`, `create_dns_record`, `dns_zone_name`, `dns_zone_resource_group_name`, `manage_frontdoor_certificate` | `gateway` |
| **4** Function ingress | `allow_azure_front_door`, `apim_egress_ips`, `function_additional_allowed_ip_cidrs`, `enable_function_deny_all_inbound` | `function` |
| **5** Socket registration | `socket_webhook_name`, `socket_event_types` → outputs `socket_webhook_url`, `socket_registration` | outputs (dashboard still manual) |

### Step 4 two-apply workflow (APIM egress IPs)

APIM is created after the Function, so egress IPs are not known on first plan:

```bash
terraform apply   # apim_egress_ips = []
terraform output apim_public_ip_addresses
# Add IPs to terraform.tfvars: apim_egress_ips = ["20.x.x.x", ...]
terraform apply   # Function rules updated
```

## Post-apply

1. Store Socket signing secret in Key Vault
2. Grant Function MI Graph `Mail.Send` ([CONFIGURATION.md](../../docs/CONFIGURATION.md))
3. Configure Exchange Application Access Policy
4. Deploy Function code from `src/`
5. Register webhook URL in Socket.dev
