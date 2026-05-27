locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    environment = var.environment
  })
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.common_tags
}

module "function" {
  source = "./modules/function"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  name_prefix         = local.name_prefix
  tags                = local.common_tags

  mail_sender_upn   = var.mail_sender_upn
  mail_to_addresses = var.mail_to_addresses
  socket_org_slug   = var.socket_org_slug
  min_severity      = var.min_severity
}
