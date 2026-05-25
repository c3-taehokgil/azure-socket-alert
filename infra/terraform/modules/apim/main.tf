locals {
  apim_name   = "apim-${var.name_prefix}"
  api_path    = trim(var.webhook_path, "/")
  api_segments = split("/", local.api_path)
  # e.g. webhooks/socket -> API path "webhooks", operation "socket"
  api_url_path = length(local.api_segments) > 1 ? local.api_segments[0] : local.api_path
  operation_path = length(local.api_segments) > 1 ? join("/", slice(local.api_segments, 1, length(local.api_segments))) : ""
}

resource "azurerm_api_management" "main" {
  name                = local.apim_name
  location            = var.location
  resource_group_name = var.resource_group_name
  publisher_name      = var.apim_publisher_name
  publisher_email     = var.apim_publisher_email
  sku_name            = var.apim_sku
  tags                = var.tags
}

resource "azurerm_api_management_named_value" "function_key" {
  name                = "function-host-key"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "function-host-key"
  secret              = true
  value               = var.function_app_key
}

resource "azurerm_api_management_backend" "function" {
  name                = "function-backend"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.main.name
  protocol            = "http"
  url                 = "https://${var.function_app_hostname}/api"
}

resource "azurerm_api_management_api" "socket" {
  name                = "socket-webhook"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Socket Webhook"
  path                = local.api_url_path
  protocols           = ["https"]
  subscription_required = false
}

resource "azurerm_api_management_api_operation" "post_webhook" {
  operation_id        = "post-webhook"
  api_name            = azurerm_api_management_api.socket.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.resource_group_name
  display_name        = "POST webhook"
  method              = "POST"
  url_template        = local.operation_path != "" ? "/${local.operation_path}" : "/"
}

resource "azurerm_api_management_api_policy" "socket" {
  api_name            = azurerm_api_management_api.socket.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.resource_group_name

  xml_content = <<-XML
<policies>
  <inbound>
    <base />
    <rate-limit calls="${var.rate_limit_calls}" renewal-period="${var.rate_limit_period_seconds}" />
    <set-backend-service backend-id="${azurerm_api_management_backend.function.name}" />
    <set-query-parameter name="code" exists-action="override">
      <value>{{function-host-key}}</value>
    </set-query-parameter>
  </inbound>
  <backend>
    <forward-request />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
XML

  depends_on = [azurerm_api_management_named_value.function_key]
}

output "gateway_hostname" {
  value = replace(azurerm_api_management.main.gateway_url, "https://", "")
}

output "gateway_url" {
  value = azurerm_api_management.main.gateway_url
}

output "public_ip_addresses" {
  description = "APIM egress IPs — add to function_allowed_ip_cidrs (step 4) if needed."
  value       = azurerm_api_management.main.public_ip_addresses
}

output "apim_name" {
  value = azurerm_api_management.main.name
}
