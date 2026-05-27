output "resource_group_name" {
  description = "Deployed resource group."
  value       = azurerm_resource_group.main.name
}

output "function_app_name" {
  description = "Function App name — deploy code here."
  value       = module.function.function_app_name
}

output "key_vault_name" {
  description = "Store socket-api-token secret here."
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

output "socket_api_configuration" {
  description = "Socket.dev org token requirements for polling integration."
  value = {
    org_slug     = var.socket_org_slug
    api_scope    = "alerts:list"
    secret_name  = "socket-api-token"
    poll_schedule = "Every 15 minutes (timer trigger in Function App)"
    note         = "Create an org token in Socket dashboard and store it in Key Vault secret socket-api-token."
  }
}
