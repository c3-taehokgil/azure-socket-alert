locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    environment = var.environment
  })
}

# Resource group — single prod stack (D7)
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.common_tags
}

# --- Modules (implement per docs/TERRAFORM-D6-GATEWAY.md) ---

module "function" {
  source = "./modules/function"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  name_prefix         = local.name_prefix
  tags                = local.common_tags

  mail_sender_upn     = var.mail_sender_upn
  mail_to_addresses   = var.mail_to_addresses
  socket_org_slug     = var.socket_org_slug
  min_severity        = var.min_severity
}

module "apim" {
  source = "./modules/apim"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  name_prefix         = local.name_prefix
  tags                = local.common_tags

  webhook_path            = var.webhook_path
  function_app_hostname   = module.function.default_hostname
  function_app_key        = module.function.default_host_key
  apim_sku                = var.apim_sku
  apim_publisher_name     = var.apim_publisher_name
  apim_publisher_email    = var.apim_publisher_email

  depends_on = [module.function]
}

module "gateway" {
  source = "./modules/gateway"

  resource_group_name = azurerm_resource_group.main.name
  name_prefix         = local.name_prefix
  tags                = local.common_tags

  webhook_path      = var.webhook_path
  custom_domain     = var.custom_domain
  waf_mode          = var.waf_mode
  apim_gateway_host = module.apim.gateway_hostname

  depends_on = [module.apim]
}

# Function ingress: restrict to AzureFrontDoor.Backend in modules/function (see TERRAFORM-D6-GATEWAY.md)
