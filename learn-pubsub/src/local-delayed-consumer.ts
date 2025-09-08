import { PubSub, Message } from '@google-cloud/pubsub';
import { Queue, Worker } from 'bullmq';
import { Command } from 'commander';

interface DelayedConsumerOptions {
  subscription: string;
  delaySeconds: number;
}

class LocalDelayedConsumer {
  private pubSubClient: PubSub;
  private subscription: any;
  private delayQueue: Queue;
  private worker: Worker;
  private options: DelayedConsumerOptions;

  constructor(options: DelayedConsumerOptions) {
    this.options = options;
    this.pubSubClient = new PubSub({ projectId: 'omnia-local-dev' });
    
    // Initialize Redis-based queue for local development
    this.delayQueue = new Queue('delayed-processing', {
      connection: { host: 'localhost', port: 6379 }
    });

    // Worker to process delayed jobs
    this.worker = new Worker('delayed-processing', async (job) => {
      console.log(`🔄 Processing delayed message: ${job.data.messageId}`);
      console.log('Message data:', job.data.originalMessage);
      // Your actual processing logic here
      return { processed: true, messageId: job.data.messageId };
    }, {
      connection: { host: 'localhost', port: 6379 }
    });
  }

  async initialize(): Promise<void> {
    const subscriptionName = `ccorteziatest-${this.options.subscription}`;
    this.subscription = this.pubSubClient.subscription(subscriptionName);
    
    const [exists] = await this.subscription.exists();
    if (!exists) {
      console.error(`Subscription ${subscriptionName} does not exist.`);
      process.exit(1);
    }

    console.log(`Connected to subscription: ${subscriptionName}`);
    console.log(`Delay: ${this.options.delaySeconds} seconds`);
    console.log('Using local Redis queue for delayed processing');
  }

  async startConsuming(): Promise<void> {
    console.log('Starting delayed consumption with local queue...');

    this.subscription.on('message', async (message: Message) => {
      try {
        // Immediately acknowledge to remove from subscription
        message.ack();
        console.log(`✅ Message ${message.id} acknowledged immediately`);

        // Schedule delayed processing using local queue
        await this.scheduleLocalDelayedProcessing(message);
        
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    this.worker.on('completed', (job) => {
      console.log(`✅ Delayed processing completed for message ${job.data.messageId}`);
    });
  }

  private async scheduleLocalDelayedProcessing(message: Message): Promise<void> {
    const messageData = JSON.parse(message.data.toString());
    
    const jobData = {
      originalMessage: messageData,
      messageId: message.id,
      publishTime: message.publishTime,
      attributes: message.attributes
    };

    // Add job with delay
    const job = await this.delayQueue.add(
      'process-message',
      jobData,
      { 
        delay: this.options.delaySeconds * 1000,
        removeOnComplete: 10,
        removeOnFail: 5
      }
    );

    console.log(`📅 Scheduled local job ${job.id} with ${this.options.delaySeconds}s delay`);
  }

  async cleanup(): Promise<void> {
    await this.worker.close();
    await this.delayQueue.close();
  }
}

// Add to package.json dependencies:
// "bullmq": "^4.0.0"
// "redis": "^4.0.0"