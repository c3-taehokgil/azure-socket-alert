variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

variable "mail_sender_upn" { type = string }
variable "mail_to_addresses" { type = string }

variable "socket_org_slug" {
  type    = string
  default = ""
}

variable "min_severity" {
  type    = string
  default = "low"
}

# --- Step 4: Function ingress (IP restrictions) ---

variable "allow_azure_front_door" {
  type        = bool
  default     = true
  description = "Allow AzureFrontDoor.Backend service tag (step 4)."
}

variable "allowed_ip_cidrs" {
  type        = list(string)
  default     = []
  description = "Additional allowed source CIDRs, e.g. APIM egress /32 IPs (step 4). Re-apply after apim_public_ip_addresses output."
}

variable "enable_deny_all_inbound" {
  type        = bool
  default     = true
  description = "Deny all other inbound traffic when true (step 4)."
}
