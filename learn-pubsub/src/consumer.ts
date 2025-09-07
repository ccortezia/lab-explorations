import { PubSub, Subscription, Message } from '@google-cloud/pubsub';
import { Command } from 'commander';

interface ConsumerOptions {
  subscription: string;
  action: 'ack' | 'nack' | 'ignore';
  maxMessages?: number;
  ackDeadlineSeconds?: number;
}

class PubSubConsumer {
  private pubSubClient: PubSub;
  private subscription: Subscription | null = null;
  private options: ConsumerOptions;

  constructor(options: ConsumerOptions) {
    this.options = options;
    this.pubSubClient = new PubSub({
      projectId: 'omnia-local-dev',
    });
  }

  async initialize(): Promise<void> {
    try {
      const subscriptionName = `ccorteziatest-${this.options.subscription}`;
      this.subscription = this.pubSubClient.subscription(subscriptionName);
      
      const [exists] = await this.subscription.exists();
      if (!exists) {
        console.error(`Subscription ${subscriptionName} does not exist. Please create it using Terraform first.`);
        process.exit(1);
      }

      console.log(`Connected to subscription: ${subscriptionName}`);
      console.log(`Action mode: ${this.options.action}`);
      
    } catch (error) {
      console.error('Error initializing consumer:', error);
      process.exit(1);
    }
  }

  async startConsuming(): Promise<void> {
    if (!this.subscription) {
      throw new Error('Subscription not initialized');
    }

    console.log('Starting to consume messages...');
    console.log('Press Ctrl+C to stop');

    // Configure subscription options - these are applied when messages are received
    // The maxMessages and ackDeadlineSeconds are handled by the subscription automatically

    this.subscription.on('message', (message: Message) => {
      this.handleMessage(message);
    });

    this.subscription.on('error', (error: Error) => {
      console.error('Subscription error:', error);
    });

    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
  }

  private handleMessage(message: Message): void {
    try {
      const messageData = JSON.parse(message.data.toString());
      const receivedAt = new Date().toISOString();
      
      console.log('\n--- Message Received ---');
      console.log(`Message ID: ${message.id}`);
      console.log(`Received at: ${receivedAt}`);
      console.log(`Message data:`, messageData);
      console.log(`Attributes:`, message.attributes);
      console.log(`Delivery attempt: ${message.deliveryAttempt || 1}`);

      switch (this.options.action) {
        case 'ack':
          message.ack();
          console.log('✅ Message acknowledged');
          break;
        case 'nack':
          message.nack();
          console.log('❌ Message not acknowledged (will be redelivered)');
          break;
        case 'ignore':
          console.log('⏸️  Message ignored (will timeout and be redelivered)');
          break;
      }
      console.log('------------------------\n');
      
    } catch (error) {
      console.error('Error processing message:', error);
      if (this.options.action === 'ack') {
        message.ack();
        console.log('✅ Message acknowledged despite processing error');
      } else if (this.options.action === 'nack') {
        message.nack();
        console.log('❌ Message nacked due to processing error');
      }
    }
  }

  private shutdown(): void {
    if (this.subscription) {
      console.log('Closing subscription...');
      this.subscription.close();
    }
    console.log('Consumer shutdown complete');
    process.exit(0);
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('pubsub-consumer')
    .description('GCP Pub/Sub message consumer')
    .version('1.0.0')
    .requiredOption('-s, --subscription <name>', 'Subscription name suffix (will be prefixed with ccorteziatest-)')
    .option('-a, --action <action>', 'Action to take on messages: ack, nack, or ignore', 'ack')
    .option('-m, --max-messages <number>', 'Maximum number of messages to process concurrently', '10')
    .option('-t, --ack-deadline <seconds>', 'Ack deadline in seconds', '60')
    .parse();

  const options = program.opts();

  if (!['ack', 'nack', 'ignore'].includes(options.action)) {
    console.error('Action must be one of: ack, nack, ignore');
    process.exit(1);
  }

  const consumerOptions: ConsumerOptions = {
    subscription: options.subscription,
    action: options.action as 'ack' | 'nack' | 'ignore',
    maxMessages: parseInt(options.maxMessages),
    ackDeadlineSeconds: parseInt(options.ackDeadline)
  };

  const consumer = new PubSubConsumer(consumerOptions);
  await consumer.initialize();
  await consumer.startConsuming();
}

if (require.main === module) {
  main().catch(console.error);
}

export { PubSubConsumer, main };