variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "omnia-local-dev"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "namespace" {
  description = "Namespace for resource naming"
  type        = string
  default     = "ccorteziatest"
}

variable "push_endpoint_base_url" {
  description = "Base URL for push subscriptions (will append /webhook)"
  type        = string
}