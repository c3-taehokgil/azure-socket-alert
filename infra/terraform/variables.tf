variable "subscription_id" {
  type        = string
  description = "Azure subscription ID where all resources are deployed."
}

variable "location" {
  type        = string
  description = "Azure region for regional resources."
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
  description = "Socket.dev organization slug (required for alerts API)."
}

variable "min_severity" {
  type        = string
  description = "Minimum alert severity to email (D10)."
  default     = "low"
}
