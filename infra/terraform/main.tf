locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    environment = var.environment
  })

  # Step 4: normalize APIM egress IPs to CIDR notation for Function restrictions
  apim_egress_cidrs = [
    for ip in var.apim_egress_ips : strcontains(ip, "/") ? ip : "${ip}/32"
  ]

  function_allowed_cidrs = distinct(concat(
    local.apim_egress_cidrs,
    var.function_additional_allowed_ip_cidrs,
  ))
}

# Resource group — single prod stack (D7)
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

  # Step 4 variables
  allow_azure_front_door    = var.allow_azure_front_door
  allowed_ip_cidrs          = local.function_allowed_cidrs
  enable_deny_all_inbound   = var.enable_function_deny_all_inbound
}

module "apim" {
  source = "./modules/apim"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  name_prefix         = local.name_prefix
  tags                = local.common_tags

  webhook_path          = var.webhook_path
  function_app_hostname = module.function.default_hostname
  function_app_key      = module.function.default_host_key
  apim_sku              = var.apim_sku
  apim_publisher_name   = var.apim_publisher_name
  apim_publisher_email  = var.apim_publisher_email

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

  # Step 3 variables
  dns_zone_name                  = var.dns_zone_name
  dns_zone_resource_group_name   = var.dns_zone_resource_group_name
  create_dns_record              = var.create_dns_record
  manage_frontdoor_certificate   = var.manage_frontdoor_certificate

  depends_on = [module.apim]
}
