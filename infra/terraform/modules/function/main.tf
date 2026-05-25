data "azurerm_client_config" "current" {}

locals {
  function_app_name = "func-${var.name_prefix}"
  storage_name      = substr(replace("st${var.name_prefix}", "-", ""), 0, 24)
  key_vault_name    = substr("kv${replace(var.name_prefix, "-", "")}", 0, 24)
  plan_name         = "plan-${var.name_prefix}"
}

resource "azurerm_storage_account" "main" {
  name                     = local.storage_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = var.tags
}

resource "azurerm_storage_container" "deployment" {
  name                  = "app-package"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = var.tags
}

resource "azurerm_key_vault" "main" {
  name                       = local.key_vault_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true
  rbac_authorization_enabled = true
  tags                       = var.tags
}

resource "azurerm_key_vault_secret" "webhook_placeholder" {
  name         = "socket-webhook-secret"
  value        = "whsec-REPLACE-AFTER-SOCKET-WEBHOOK-SETUP"
  key_vault_id = azurerm_key_vault.main.id

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_service_plan" "flex" {
  name                = local.plan_name
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = "FC1"
  tags                = var.tags
}

resource "azurerm_function_app_flex_consumption" "main" {
  name                  = local.function_app_name
  resource_group_name   = var.resource_group_name
  location              = var.location
  service_plan_id       = azurerm_service_plan.flex.id
  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.deployment.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.main.primary_access_key
  runtime_name                  = "node"
  runtime_version               = "20"
  maximum_instance_count        = 40
  instance_memory_in_mb           = 2048

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.main.connection_string
    application_insights_key               = azurerm_application_insights.main.instrumentation_key

    ip_restriction {
      name        = "AllowAzureFrontDoor"
      service_tag = "AzureFrontDoor.Backend"
      priority    = 100
      action      = "Allow"
    }

    ip_restriction {
      name       = "DenyAllOther"
      ip_address = "0.0.0.0/0"
      priority   = 200
      action     = "Deny"
    }
  }

  app_settings = merge({
    AzureWebJobsStorage                     = azurerm_storage_account.main.primary_connection_string
    FUNCTIONS_EXTENSION_VERSION             = "~4"
    WEBSITE_NODE_DEFAULT_VERSION            = "~20"
    SOCKET_WEBHOOK_SECRET                     = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=socket-webhook-secret)"
    MAIL_SENDER_UPN                           = var.mail_sender_upn
    MAIL_TO_ADDRESSES                         = var.mail_to_addresses
    MIN_SEVERITY                              = var.min_severity
    INCLUDE_CLEARED                           = "true"
    IDEMPOTENCY_TABLE_NAME                    = "SocketWebhookEvents"
    SIGNATURE_MAX_AGE_SECONDS                 = "300"
    APPLICATIONINSIGHTS_CONNECTION_STRING     = azurerm_application_insights.main.connection_string
  }, var.socket_org_slug != "" ? { SOCKET_ORG_SLUG = var.socket_org_slug } : {})

  tags = var.tags

  depends_on = [
    azurerm_role_assignment.function_kv_secrets_user,
    azurerm_key_vault_secret.webhook_placeholder,
  ]
}

resource "azurerm_role_assignment" "function_kv_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_function_app_flex_consumption.main.identity[0].principal_id
}

data "azurerm_function_app_host_keys" "main" {
  name                = azurerm_function_app_flex_consumption.main.name
  resource_group_name = var.resource_group_name
}

output "function_app_name" {
  value = azurerm_function_app_flex_consumption.main.name
}

output "default_hostname" {
  value = azurerm_function_app_flex_consumption.main.default_hostname
}

output "default_host_key" {
  value     = data.azurerm_function_app_host_keys.main.default_function_key
  sensitive = true
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "function_principal_id" {
  value = azurerm_function_app_flex_consumption.main.identity[0].principal_id
}
