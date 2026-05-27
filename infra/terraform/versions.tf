terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Uncomment after bootstrapping remote state (see infra/terraform/README.md)
  # backend "azurerm" {
  #   resource_group_name  = "rg-terraform-state"
  #   storage_account_name = "stterraformstate<C3_SUFFIX>"
  #   container_name       = "tfstate"
  #   key                  = "socket-alert/prod.tfstate"
  # }
}
