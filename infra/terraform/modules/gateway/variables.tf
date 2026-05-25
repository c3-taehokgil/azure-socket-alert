variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

variable "webhook_path" {
  type        = string
  description = "Path matched by Front Door and registered with Socket.dev."
}

variable "custom_domain" {
  type        = string
  default     = ""
  description = "Optional custom hostname (D6), e.g. webhooks.c3.ai. Leave empty for *.azurefd.net."
}

variable "waf_mode" {
  type        = string
  description = "Detection or Prevention."
}

variable "apim_gateway_host" {
  type        = string
  description = "APIM gateway hostname without scheme, e.g. apim-socket-alert-prod.azure-api.net."
}

# --- Step 3: DNS + TLS (optional) ---

variable "dns_zone_name" {
  type        = string
  default     = ""
  description = "Existing DNS zone for custom_domain, e.g. c3.ai. Required when create_dns_record=true."
}

variable "dns_zone_resource_group_name" {
  type        = string
  default     = ""
  description = "Resource group containing the DNS zone."
}

variable "create_dns_record" {
  type        = bool
  default     = false
  description = "Create CNAME from custom_domain to Front Door endpoint (step 3)."
}

variable "manage_frontdoor_certificate" {
  type        = bool
  default     = false
  description = "Associate Front Door managed certificate for custom_domain (requires create_dns_record)."
}
