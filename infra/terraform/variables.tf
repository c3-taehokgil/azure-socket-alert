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

# --- Step 3: DNS + TLS (optional; pass into gateway module) ---

variable "dns_zone_name" {
  type        = string
  default     = ""
  description = "Existing DNS zone name, e.g. c3.ai. Required when create_dns_record=true."
}

variable "dns_zone_resource_group_name" {
  type        = string
  default     = ""
  description = "Resource group of the DNS zone."
}

variable "create_dns_record" {
  type        = bool
  default     = false
  description = "Create CNAME for custom_domain → Front Door endpoint (step 3)."
}

variable "manage_frontdoor_certificate" {
  type        = bool
  default     = false
  description = "Use Front Door managed TLS cert for custom_domain (step 3)."
}

# --- Step 4: Function ingress (pass into function module) ---

variable "allow_azure_front_door" {
  type        = bool
  default     = true
  description = "Allow AzureFrontDoor.Backend on Function (step 4)."
}

variable "apim_egress_ips" {
  type        = list(string)
  default     = []
  description = "APIM public egress IPs as /32 or plain IPs (step 4). After first apply, set from output apim_public_ip_addresses and re-apply."
}

variable "function_additional_allowed_ip_cidrs" {
  type        = list(string)
  default     = []
  description = "Extra CIDRs allowed to call the Function directly (step 4)."
}

variable "enable_function_deny_all_inbound" {
  type        = bool
  default     = true
  description = "Deny all inbound except allowed rules on Function (step 4)."
}

# --- Step 5: Socket.dev registration metadata (outputs + optional labels) ---

variable "socket_webhook_name" {
  type        = string
  default     = "c3ai-o365-alerts-prod"
  description = "Suggested webhook name in Socket dashboard (step 5; manual registration)."
}

variable "socket_event_types" {
  type        = list(string)
  default     = ["alert:created", "alert:updated", "alert:cleared"]
  description = "Event types to enable when registering Socket webhook (step 5)."
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
