# GCP Pub/Sub Exploration with TypeScript

A complete TypeScript application for exploring GCP Pub/Sub with both producer and consumer components, along with Terraform infrastructure.

## Project Structure

```
├── src/
│   ├── producer.ts     # HTTP server for publishing messages
│   └── consumer.ts     # CLI consumer with configurable behavior
├── terraform/          # Infrastructure as Code
│   ├── main.tf        # Main Terraform configuration
│   ├── variables.tf   # Variable definitions
│   ├── outputs.tf     # Output definitions
│   └── terraform.tfvars.example
└── package.json       # Dependencies and scripts
```

## Setup

### Prerequisites

- Node.js 22+ (managed with nvm) and pnpm 8+
- GCP account with billing enabled
- Terraform installed
- GCP CLI (`gcloud`) configured with your credentials

### 1. Setup Node.js Version

```bash
# Use the correct Node.js version with nvm
nvm use

# If Node.js 22 is not installed, install it first
nvm install 22
nvm use 22
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build the TypeScript Code

```bash
pnpm run build
```

### 4. Deploy Infrastructure

```bash
cd terraform

# Copy and edit the variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values

# Initialize and apply Terraform
terraform init
terraform plan
terraform apply
```

This creates:
- **Topic**: `ccorteziatest-topic`
- **Subscription 1**: `ccorteziatest-sub1-pull-unordered` (Pull, unordered)
- **Subscription 2**: `ccorteziatest-sub2-push-unordered` (Push, unordered)
- **Subscription 3**: `ccorteziatest-sub3-pull-ordered` (Pull, ordered)
- **Subscription 4**: `ccorteziatest-sub4-push-ordered` (Push, ordered)
- **Dead Letter Topic**: `ccorteziatest-dead-letter-topic`

## Usage

### Producer (HTTP Server)

Start the producer server:

```bash
pnpm run start:producer
# or for development with auto-reload:
pnpm run dev:producer
```

Publish messages:

```bash
# Basic message
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Hello World!"}' \
  http://localhost:3000/publish

# Message with custom attributes
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Hello with attributes", "attributes":{"priority":"high","source":"api"}}' \
  http://localhost:3000/publish

# Health check
curl http://localhost:3000/health
```

### Consumer (CLI)

The consumer can be configured through CLI parameters:

```bash
# Basic usage - ACK messages from sub1
pnpm run start:consumer -- --subscription sub1-pull-unordered

# NACK messages (they will be redelivered)
pnpm run start:consumer -- --subscription sub1-pull-unordered --action nack

# Ignore messages (they will timeout and be redelivered)
pnpm run start:consumer -- --subscription sub3-pull-ordered --action ignore

# Custom settings
pnpm run start:consumer -- --subscription sub1-pull-unordered --action ack --max-messages 5 --ack-deadline 30
```

**Available CLI Options:**

- `-s, --subscription <name>`: Subscription suffix (required)
- `-a, --action <action>`: Action to take: `ack`, `nack`, or `ignore` (default: `ack`)
- `-m, --max-messages <number>`: Max concurrent messages (default: `10`)
- `-t, --ack-deadline <seconds>`: Ack deadline in seconds (default: `60`)

### Development Mode

For development with auto-reload:

```bash
# Producer
pnpm run dev:producer

# Consumer
pnpm run dev:consumer -- --subscription sub1-pull-unordered --action ack
```

## Testing Different Subscription Types

### 1. Pull Subscriptions (Unordered)
```bash
# Terminal 1: Start consumer
pnpm run dev:consumer -- --subscription sub1-pull-unordered --action ack

# Terminal 2: Send messages
curl -X POST -H "Content-Type: application/json" -d '{"message":"Test message 1"}' http://localhost:3000/publish
curl -X POST -H "Content-Type: application/json" -d '{"message":"Test message 2"}' http://localhost:3000/publish
```

### 2. Pull Subscriptions (Ordered)
```bash
# Terminal 1: Start consumer for ordered messages
pnpm run dev:consumer -- --subscription sub3-pull-ordered --action ack

# Terminal 2: Send messages with ordering keys
curl -X POST -H "Content-Type: application/json" -d '{"message":"Order 1", "attributes":{"ordering_key":"user123"}}' http://localhost:3000/publish
curl -X POST -H "Content-Type: application/json" -d '{"message":"Order 2", "attributes":{"ordering_key":"user123"}}' http://localhost:3000/publish
```

### 3. Testing NACK Behavior
```bash
# Start consumer that NACKs messages (they get redelivered)
pnpm run dev:consumer -- --subscription sub1-pull-unordered --action nack

# Send a message and watch it get redelivered multiple times
curl -X POST -H "Content-Type: application/json" -d '{"message":"This will be redelivered"}' http://localhost:3000/publish
```

### 4. Testing Message Ordering
For ordered messages, you need to publish with ordering keys:

```bash
# The producer needs to be enhanced to support ordering keys
# Or you can use the gcloud CLI:
gcloud pubsub topics publish ccorteziatest-topic --message="Order 1" --ordering-key="user123"
gcloud pubsub topics publish ccorteziatest-topic --message="Order 2" --ordering-key="user123"
```

## Push Subscriptions

Push subscriptions require a publicly accessible webhook endpoint. For local development:

1. Use ngrok to expose your local server:
```bash
ngrok http 3000
```

2. Update the `push_endpoint_base_url` in `terraform.tfvars`

3. Implement webhook handlers in your producer or create a separate webhook server

## Monitoring

### View Subscription Status
```bash
gcloud pubsub subscriptions list --filter="name:ccorteziatest"
```

### Check Topic Messages
```bash
gcloud pubsub topics list --filter="name:ccorteziatest"
```

### Monitor Dead Letter Queue
```bash
pnpm run dev:consumer -- --subscription dead-letter-sub --action ack
```

## Cleanup

To destroy the infrastructure:

```bash
cd terraform
terraform destroy
```

## Troubleshooting

### Authentication Issues
```bash
# Set up application default credentials
gcloud auth application-default login

# Or use service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### Permission Issues
Ensure your GCP account has the following roles:
- Pub/Sub Editor
- Pub/Sub Subscriber
- Pub/Sub Publisher

### Connection Issues
- Verify the project ID in both the code and Terraform configuration
- Ensure the Pub/Sub API is enabled in your GCP project
- Check that the topic and subscriptions exist using the GCP Console

## Architecture Notes

### Message Flow
1. **Producer**: HTTP POST → Pub/Sub Topic
2. **Topic**: Routes messages to all subscriptions
3. **Subscriptions**: Deliver messages based on type (push/pull) and ordering (ordered/unordered)
4. **Consumer**: Processes messages with configurable ACK/NACK behavior
5. **Dead Letter**: Failed messages after max delivery attempts

### Subscription Types
- **Pull + Unordered**: Standard message processing, no ordering guarantees
- **Push + Unordered**: Webhook delivery, no ordering guarantees  
- **Pull + Ordered**: Sequential processing by ordering key
- **Push + Ordered**: Sequential webhook delivery by ordering key

This setup provides a comprehensive environment for exploring GCP Pub/Sub features and behaviors.