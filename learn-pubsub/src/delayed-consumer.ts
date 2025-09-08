import { PubSub, Message } from '@google-cloud/pubsub';
import { CloudTasksClient } from '@google-cloud/tasks';
import { Command } from 'commander';

interface DelayedConsumerOptions {
  subscription: string;
  delaySeconds: number;
}

class DelayedConsumer {
  private pubSubClient: PubSub;
  private tasksClient: CloudTasksClient;
  private subscription: any;
  private options: DelayedConsumerOptions;

  constructor(options: DelayedConsumerOptions) {
    this.options = options;
    this.pubSubClient = new PubSub({ projectId: 'omnia-local-dev' });
    this.tasksClient = new CloudTasksClient();
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
  }

  async startConsuming(): Promise<void> {
    console.log('Starting delayed consumption...');

    this.subscription.on('message', async (message: Message) => {
      try {
        // Immediately acknowledge to remove from subscription
        message.ack();
        console.log(`✅ Message ${message.id} acknowledged immediately`);

        // Create a delayed Cloud Task for actual processing
        await this.scheduleDelayedProcessing(message);
        
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
  }

  private async scheduleDelayedProcessing(message: Message): Promise<void> {
    const messageData = JSON.parse(message.data.toString());
    
    // Calculate execution time
    const now = new Date();
    const executeAt = new Date(now.getTime() + (this.options.delaySeconds * 1000));
    
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: 'http://localhost:3001/process-delayed', // Your task handler endpoint
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          originalMessage: messageData,
          messageId: message.id,
          publishTime: message.publishTime,
          attributes: message.attributes
        })).toString('base64'),
      },
      scheduleTime: {
        seconds: Math.floor(executeAt.getTime() / 1000),
      },
    };

    const parent = this.tasksClient.queuePath(
      'omnia-local-dev',
      'us-central1', 
      'delayed-processing-queue'
    );

    try {
      const [response] = await this.tasksClient.createTask({ parent, task });
      console.log(`📅 Scheduled task ${response.name} for ${executeAt.toISOString()}`);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .requiredOption('-s, --subscription <name>', 'Subscription name suffix')
    .option('-d, --delay <seconds>', 'Delay in seconds', '30')
    .parse();

  const options = program.opts();
  
  const consumer = new DelayedConsumer({
    subscription: options.subscription,
    delaySeconds: parseInt(options.delay)
  });
  
  await consumer.initialize();
  await consumer.startConsuming();
}

if (require.main === module) {
  main().catch(console.error);
}

export { DelayedConsumer };