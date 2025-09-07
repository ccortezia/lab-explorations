terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_pubsub_topic" "main_topic" {
  name = "${var.namespace}-topic"
  
  labels = {
    namespace = var.namespace
    purpose   = "exploration"
  }
}

# Subscription 1: Ordered messages disabled, pull based
resource "google_pubsub_subscription" "sub1_pull_unordered" {
  name  = "${var.namespace}-sub1-pull-unordered"
  topic = google_pubsub_topic.main_topic.name

  # Pull delivery
  # No push_config means it's a pull subscription

  # Ordered messages disabled (default)
  enable_message_ordering = false

  # Basic settings
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
  ack_deadline_seconds       = 10

  # Dead letter policy (optional)
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10
  }

  labels = {
    namespace = var.namespace
    type      = "pull"
    ordered   = "false"
  }
}

# Subscription 2: Ordered messages disabled, push based
resource "google_pubsub_subscription" "sub2_push_unordered" {
  name  = "${var.namespace}-sub2-push-unordered"
  topic = google_pubsub_topic.main_topic.name

  # Push delivery
  push_config {
    push_endpoint = "${var.push_endpoint_base_url}/webhook/sub2"
    
    attributes = {
      subscription_type = "push_unordered"
    }
    
    # Optional: Configure authentication
    # oidc_token {
    #   service_account_email = google_service_account.pubsub_pusher.email
    # }
  }

  # Ordered messages disabled (default)
  enable_message_ordering = false

  # Basic settings
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
  ack_deadline_seconds       = 10

  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10
  }

  labels = {
    namespace = var.namespace
    type      = "push"
    ordered   = "false"
  }
}

# Subscription 3: Ordered messages enabled, pull based
resource "google_pubsub_subscription" "sub3_pull_ordered" {
  name  = "${var.namespace}-sub3-pull-ordered"
  topic = google_pubsub_topic.main_topic.name

  # Pull delivery
  # No push_config means it's a pull subscription

  # Ordered messages enabled
  enable_message_ordering = true

  # Basic settings
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
  ack_deadline_seconds       = 60

  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10
  }

  labels = {
    namespace = var.namespace
    type      = "pull"
    ordered   = "true"
  }
}

# Subscription 4: Ordered messages enabled, push based
resource "google_pubsub_subscription" "sub4_push_ordered" {
  name  = "${var.namespace}-sub4-push-ordered"
  topic = google_pubsub_topic.main_topic.name

  # Push delivery
  push_config {
    push_endpoint = "${var.push_endpoint_base_url}/webhook/sub4"
    
    attributes = {
      subscription_type = "push_ordered"
    }
    
    # Optional: Configure authentication
    # oidc_token {
    #   service_account_email = google_service_account.pubsub_pusher.email
    # }
  }

  # Ordered messages enabled
  enable_message_ordering = true

  # Basic settings
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
  ack_deadline_seconds       = 60

  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10
  }

  labels = {
    namespace = var.namespace
    type      = "push"
    ordered   = "true"
  }
}

# Dead letter topic for failed messages
resource "google_pubsub_topic" "dead_letter" {
  name = "${var.namespace}-dead-letter-topic"
  
  labels = {
    namespace = var.namespace
    purpose   = "dead-letter"
  }
}

# Dead letter subscription for monitoring failed messages
resource "google_pubsub_subscription" "dead_letter_sub" {
  name  = "${var.namespace}-dead-letter-sub"
  topic = google_pubsub_topic.dead_letter.name

  # Pull delivery for monitoring
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = true       # Keep for analysis
  ack_deadline_seconds       = 600        # Longer deadline for analysis

  labels = {
    namespace = var.namespace
    purpose   = "dead-letter-monitoring"
  }
}

# Optional: Service account for push subscriptions
# resource "google_service_account" "pubsub_pusher" {
#   account_id   = "${var.namespace}-pubsub-pusher"
#   display_name = "Pub/Sub Push Service Account"
#   description  = "Service account for Pub/Sub push subscriptions"
# }

# Optional: IAM binding for the service account
# resource "google_pubsub_topic_iam_binding" "publisher" {
#   topic = google_pubsub_topic.main_topic.name
#   role  = "roles/pubsub.publisher"

#   members = [
#     "serviceAccount:${google_service_account.pubsub_pusher.email}",
#   ]
# }