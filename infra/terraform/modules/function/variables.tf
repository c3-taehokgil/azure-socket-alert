variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

variable "mail_sender_upn" { type = string }
variable "mail_to_addresses" { type = string }

variable "socket_org_slug" {
  type        = string
  description = "Socket.dev organization slug for alerts API polling."
}

variable "min_severity" {
  type    = string
  default = "low"
}
