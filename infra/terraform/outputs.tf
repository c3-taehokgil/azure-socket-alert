output "resource_group_name" {
  description = "Deployed resource group."
  value       = azurerm_resource_group.main.name
}

# --- Step 5: Socket.dev registration ---

output "socket_webhook_url" {
  description = "Register this URL in Socket.dev dashboard (step 5)."
  value       = module.gateway.public_webhook_url
}

output "socket_registration" {
  description = "Metadata for Socket.dev webhook setup (step 5). Registration is manual unless you automate Socket API separately."
  value = {
    webhook_name = var.socket_webhook_name
    url          = module.gateway.public_webhook_url
    event_types  = var.socket_event_types
    note         = "Store signing secret in Key Vault secret socket-webhook-secret after Socket generates whsec_..."
  }
}

# --- Step 3: DNS / edge ---

output "front_door_endpoint" {
  description = "Default Front Door hostname (used when custom_domain is empty)."
  value       = module.gateway.front_door_endpoint_hostname
}

output "custom_domain_validation_token" {
  description = "Front Door managed certificate validation token (step 3)."
  value       = module.gateway.custom_domain_validation_token
}

# --- Step 4: Function ingress ---

output "apim_public_ip_addresses" {
  description = "Add these to apim_egress_ips in terraform.tfvars and re-apply (step 4)."
  value       = module.apim.public_ip_addresses
}

output "function_allowed_ip_cidrs" {
  description = "CIDRs currently allowed on the Function after step 4 variables."
  value       = local.function_allowed_cidrs
}

# --- Other ---

output "apim_gateway_url" {
  description = "APIM gateway base URL (internal hop; Socket uses Front Door URL)."
  value       = module.apim.gateway_url
}

output "function_app_name" {
  description = "Function App name — deploy code here."
  value       = module.function.function_app_name
}

output "function_default_hostname" {
  description = "Do NOT register with Socket.dev."
  value       = module.function.default_hostname
}

output "key_vault_name" {
  description = "Store socket-webhook-secret here."
  value       = module.function.key_vault_name
}

output "key_vault_uri" {
  value = module.function.key_vault_uri
}

output "function_principal_id" {
  description = "Grant Graph Mail.Send to this Entra MI principal."
  value       = module.function.function_principal_id
}

output "application_insights_connection_string" {
  value     = module.function.application_insights_connection_string
  sensitive = true
}
