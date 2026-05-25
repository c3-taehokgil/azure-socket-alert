variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

variable "webhook_path" {
  type        = string
  description = "Public webhook path (must match Front Door route), e.g. /webhooks/socket."
}

variable "function_app_hostname" {
  type        = string
  description = "Function default hostname without scheme."
}

variable "function_app_key" {
  type        = string
  sensitive   = true
  description = "Function host key; APIM appends as ?code= when calling backend."
}

variable "apim_sku" { type = string }
variable "apim_publisher_name" { type = string }
variable "apim_publisher_email" { type = string }

variable "rate_limit_calls" {
  type        = number
  default     = 100
  description = "APIM inbound rate limit calls per renewal period."
}

variable "rate_limit_period_seconds" {
  type    = number
  default = 60
}
