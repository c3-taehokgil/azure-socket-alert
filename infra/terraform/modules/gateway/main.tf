locals {
  endpoint_name     = "${var.name_prefix}-fd-endpoint"
  profile_name      = "${var.name_prefix}-fd"
  origin_group_name = "apim-origin-group"
  route_name        = "socket-webhook-route"
  waf_name          = replace("${var.name_prefix}-waf", "-", "")
  public_host       = var.custom_domain != "" ? var.custom_domain : "${local.endpoint_name}.azurefd.net"
  dns_record_name   = var.custom_domain != "" && var.dns_zone_name != "" ? replace(var.custom_domain, ".${var.dns_zone_name}", "") : ""
}

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = local.profile_name
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"
  tags                = var.tags
}

resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = local.waf_name
  resource_group_name               = var.resource_group_name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = var.waf_mode
  custom_block_response_status_code = 403

  managed_rule {
    type    = "DefaultRuleSet"
    version = "1.0"
    action  = "Block"
  }
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = local.endpoint_name
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  tags                     = var.tags
}

resource "azurerm_cdn_frontdoor_origin_group" "apim" {
  name                     = local.origin_group_name
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    protocol            = "Https"
    path                = "/"
    request_type        = "HEAD"
    interval_in_seconds = 100
  }
}

resource "azurerm_cdn_frontdoor_origin" "apim" {
  name                          = "apim-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.apim.id
  enabled                       = true
  host_name                     = var.apim_gateway_host
  http_port                     = 80
  https_port                    = 443
  origin_host_header            = var.apim_gateway_host
  priority                      = 1
  weight                        = 100
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_custom_domain" "socket" {
  count                    = var.custom_domain != "" ? 1 : 0
  name                     = replace(var.custom_domain, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = var.custom_domain

  tls {
    certificate_type    = var.manage_frontdoor_certificate ? "ManagedCertificate" : "CustomerCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_route" "socket" {
  name                          = local.route_name
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.apim.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.apim.id]
  cdn_frontdoor_custom_domain_ids = var.custom_domain != "" ? [azurerm_cdn_frontdoor_custom_domain.socket[0].id] : []
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = [var.webhook_path]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain_accessor_enabled = var.custom_domain == ""
}

resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "${var.name_prefix}-fdsec"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id
    }

    associations {
      patterns_to_match = ["/*"]
      domain {
        cdn_frontdoor_domain_id = var.custom_domain != "" ? azurerm_cdn_frontdoor_custom_domain.socket[0].id : azurerm_cdn_frontdoor_endpoint.main.id
      }
    }
  }
}

data "azurerm_dns_zone" "main" {
  count               = var.create_dns_record && var.dns_zone_name != "" ? 1 : 0
  name                = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
}

resource "azurerm_dns_cname_record" "frontdoor" {
  count               = var.create_dns_record && var.custom_domain != "" && local.dns_record_name != "" ? 1 : 0
  name                = local.dns_record_name
  zone_name           = data.azurerm_dns_zone.main[0].name
  resource_group_name = data.azurerm_dns_zone.main[0].resource_group_name
  ttl                 = 300
  record              = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "public_webhook_url" {
  description = "Register in Socket.dev (step 5)."
  value       = "https://${local.public_host}${var.webhook_path}"
}

output "front_door_endpoint_hostname" {
  value = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "custom_domain_validation_token" {
  description = "Use for Front Door managed certificate DNS validation when applicable."
  value       = var.custom_domain != "" ? azurerm_cdn_frontdoor_custom_domain.socket[0].validation_token : null
}
