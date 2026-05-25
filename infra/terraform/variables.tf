# ------------------------------------------------------------------------------
# Target subscription and naming (see docs/DECISIONS.md)
# ------------------------------------------------------------------------------

variable "subscription_id" {
  type        = string
  description = "Azure subscription ID where all resources are deployed."
}

variable "location" {
  type        = string
  description = "Azure region for regional resources (APIM, Function, storage)."
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name (D7: prod only)."
  default     = "prod"
}

variable "project_name" {
  type        = string
  description = "Short project name used in resource naming."
  default     = "socket-alert"
}

variable "tags" {
  type        = map(string)
  description = "Required tags per C3 AI subscription policy."
  default = {
    project     = "socket-alert"
    environment = "prod"
    managed_by  = "terraform"
  }
}

# ------------------------------------------------------------------------------
# D6 — public edge (Front Door)
# ------------------------------------------------------------------------------

variable "custom_domain" {
  type        = string
  description = "Custom hostname for Socket.dev webhook (D6). Leave empty to use default *.azurefd.net."
  default     = ""
}

variable "webhook_path" {
  type        = string
  description = "URL path registered with Socket.dev (D6)."
  default     = "/webhooks/socket"
}

variable "waf_mode" {
  type        = string
  description = "WAF mode: Detection (initial) or Prevention (after validation)."
  default     = "Detection"

  validation {
    condition     = contains(["Detection", "Prevention"], var.waf_mode)
    error_message = "waf_mode must be Detection or Prevention."
  }
}

# ------------------------------------------------------------------------------
# Function App settings (from DECISIONS.md)
# ------------------------------------------------------------------------------

variable "mail_sender_upn" {
  type        = string
  description = "Graph sendMail sender UPN (D4)."
  default     = "socket-alerts@c3.ai"
}

variable "mail_to_addresses" {
  type        = string
  description = "Comma-separated recipient addresses (D9)."
  default     = "dependency-security@c3.ai"
}

variable "socket_org_slug" {
  type        = string
  description = "Socket.dev organization slug for payload validation (D12)."
  default     = ""
}

variable "min_severity" {
  type        = string
  description = "Minimum alert severity to email (D10)."
  default     = "low"
}

# ------------------------------------------------------------------------------
# APIM
# ------------------------------------------------------------------------------

variable "apim_sku" {
  type        = string
  description = "APIM SKU name (Developer, Standard_1, etc.)."
  default     = "Standard_1"
}

variable "apim_publisher_name" {
  type        = string
  description = "APIM publisher name."
  default     = "C3 AI"
}

variable "apim_publisher_email" {
  type        = string
  description = "APIM publisher email."
  default     = "platform@c3.ai"
}
