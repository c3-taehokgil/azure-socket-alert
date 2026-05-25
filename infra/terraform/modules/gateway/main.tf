# Stub module — implement per docs/TERRAFORM-D6-GATEWAY.md § modules/gateway

variable "resource_group_name" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }
variable "webhook_path" { type = string }
variable "custom_domain" { type = string }
variable "waf_mode" { type = string }
variable "apim_gateway_host" { type = string }

# TODO: azurerm_cdn_frontdoor_profile, endpoint, origin, route, firewall_policy

output "public_webhook_url" {
  description = "Full URL for Socket.dev webhook registration."
  value       = var.custom_domain != "" ? "https://${var.custom_domain}${var.webhook_path}" : "https://${var.name_prefix}-fd.azurefd.net${var.webhook_path}"
}

output "front_door_endpoint_hostname" {
  value = "${var.name_prefix}-fd.azurefd.net"
}
