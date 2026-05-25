output "resource_group_name" {
  description = "Deployed resource group."
  value       = azurerm_resource_group.main.name
}

output "socket_webhook_url" {
  description = "Register this URL in Socket.dev dashboard (D6)."
  value       = module.gateway.public_webhook_url
}

output "front_door_endpoint" {
  description = "Front Door endpoint hostname."
  value       = module.gateway.front_door_endpoint_hostname
}

output "apim_gateway_url" {
  description = "APIM gateway base URL (internal hop; Socket uses Front Door URL)."
  value       = module.apim.gateway_url
}

output "function_app_name" {
  description = "Function App name — deploy code here."
  value       = module.function.function_app_name
}

output "function_default_hostname" {
  description = "Function default hostname — do NOT register with Socket.dev."
  value       = module.function.default_hostname
}

output "key_vault_name" {
  description = "Store socket-webhook-secret here."
  value       = module.function.key_vault_name
}

output "key_vault_uri" {
  description = "Key Vault URI for secret placement."
  value       = module.function.key_vault_uri
}

output "application_insights_connection_string" {
  description = "App Insights connection string (sensitive)."
  value       = module.function.application_insights_connection_string
  sensitive   = true
}
