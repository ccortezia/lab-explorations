output "topic_name" {
  description = "Name of the main Pub/Sub topic"
  value       = google_pubsub_topic.main_topic.name
}

output "topic_id" {
  description = "ID of the main Pub/Sub topic"
  value       = google_pubsub_topic.main_topic.id
}

output "subscriptions" {
  description = "Information about all subscriptions"
  value = {
    sub1_pull_unordered = {
      name = google_pubsub_subscription.sub1_pull_unordered.name
      id   = google_pubsub_subscription.sub1_pull_unordered.id
      type = "pull"
      ordered = false
    }
    sub2_push_unordered = {
      name = google_pubsub_subscription.sub2_push_unordered.name
      id   = google_pubsub_subscription.sub2_push_unordered.id
      type = "push"
      ordered = false
      endpoint = google_pubsub_subscription.sub2_push_unordered.push_config[0].push_endpoint
    }
    sub3_pull_ordered = {
      name = google_pubsub_subscription.sub3_pull_ordered.name
      id   = google_pubsub_subscription.sub3_pull_ordered.id
      type = "pull"
      ordered = true
    }
    sub4_push_ordered = {
      name = google_pubsub_subscription.sub4_push_ordered.name
      id   = google_pubsub_subscription.sub4_push_ordered.id
      type = "push"
      ordered = true
      endpoint = google_pubsub_subscription.sub4_push_ordered.push_config[0].push_endpoint
    }
  }
}

output "dead_letter_topic" {
  description = "Dead letter topic information"
  value = {
    name = google_pubsub_topic.dead_letter.name
    id   = google_pubsub_topic.dead_letter.id
    subscription = {
      name = google_pubsub_subscription.dead_letter_sub.name
      id   = google_pubsub_subscription.dead_letter_sub.id
    }
  }
}

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "namespace" {
  description = "The namespace used for resource naming"
  value       = var.namespace
}