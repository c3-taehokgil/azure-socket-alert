# Stub module — implement per docs/TERRAFORM-D6-GATEWAY.md § modules/apim

variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }
variable "webhook_path" { type = string }
variable "function_app_hostname" { type = string }
variable "function_app_key" {
  type      = string
  sensitive = true
}
variable "apim_sku" { type = string }
variable "apim_publisher_name" { type = string }
variable "apim_publisher_email" { type = string }

# TODO: azurerm_api_management, api, backend, inbound policy (preserve body for HMAC)

output "gateway_hostname" {
  value = "${var.name_prefix}-apim.azure-api.net"
}

output "gateway_url" {
  value = "https://${var.name_prefix}-apim.azure-api.net"
}
