import express from 'express';
import { Command } from 'commander';

interface PushMessage {
  message: {
    data: string;
    attributes: Record<string, string>;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

class PushWebhookServer {
  private app: express.Application;
  private port: number;
  private action: 'ack' | 'nack' | 'ignore';

  constructor(port: number, action: 'ack' | 'nack' | 'ignore') {
    this.port = port;
    this.action = action;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.raw({ type: 'application/octet-stream' }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Webhook endpoints for different subscriptions
    this.app.post('/webhook/sub2', (req, res) => {
      this.handlePushMessage(req, res, 'sub2-push-unordered');
    });

    this.app.post('/webhook/sub4', (req, res) => {
      this.handlePushMessage(req, res, 'sub4-push-ordered');
    });

    // Generic webhook endpoint
    this.app.post('/webhook/:subscription', (req, res) => {
      this.handlePushMessage(req, res, req.params.subscription);
    });
  }

  private handlePushMessage(req: express.Request, res: express.Response, subscriptionType: string): void {
    try {
      const pushMessage: PushMessage = req.body;
      const messageData = JSON.parse(Buffer.from(pushMessage.message.data, 'base64').toString());
      const receivedAt = new Date().toISOString();
      const deliveryAttempt = req.headers['x-goog-pubsub-delivery-attempt'] || '1';

      console.log('\n--- Push Message Received ---');
      console.log(`Subscription: ${subscriptionType}`);
      console.log(`Message ID: ${pushMessage.message.messageId}`);
      console.log(`Received at: ${receivedAt}`);
      console.log(`Publish time: ${pushMessage.message.publishTime}`);
      console.log(`Delivery attempt: ${deliveryAttempt}`);
      console.log(`Message data:`, messageData);
      console.log(`Attributes:`, pushMessage.message.attributes);

      switch (this.action) {
        case 'ack':
          res.status(200).send('OK');
          console.log('✅ Message acknowledged (200 response)');
          break;
        case 'nack':
          res.status(400).send('Bad Request');
          console.log('❌ Message not acknowledged (400 response - will be retried)');
          break;
        case 'ignore':
          // Don't send a response - this will cause timeout and retry
          console.log('⏸️  Message ignored (no response - will timeout and retry)');
          // Don't call res.send() or res.status()
          return;
      }
      
      console.log('--------------------------------\n');

    } catch (error) {
      console.error('Error processing push message:', error);
      
      if (this.action === 'ack') {
        res.status(200).send('OK');
        console.log('✅ Message acknowledged despite processing error');
      } else {
        res.status(500).send('Internal Server Error');
        console.log('❌ Message nacked due to processing error');
      }
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Push webhook server listening on port ${this.port}`);
      console.log(`Action mode: ${this.action}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log('Webhook endpoints:');
      console.log(`  - http://localhost:${this.port}/webhook/sub2`);
      console.log(`  - http://localhost:${this.port}/webhook/sub4`);
      console.log('\nPress Ctrl+C to stop');
    });

    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('push-webhook-server')
    .description('HTTP server for GCP Pub/Sub push subscriptions')
    .version('1.0.0')
    .option('-p, --port <number>', 'Port to listen on', '3000')
    .option('-a, --action <action>', 'Action to take on messages: ack, nack, or ignore', 'ack')
    .parse();

  const options = program.opts();

  if (!['ack', 'nack', 'ignore'].includes(options.action)) {
    console.error('Action must be one of: ack, nack, ignore');
    process.exit(1);
  }

  const port = parseInt(options.port);
  const server = new PushWebhookServer(port, options.action as 'ack' | 'nack' | 'ignore');
  server.start();
}

if (require.main === module) {
  main().catch(console.error);
}

export { PushWebhookServer, main };