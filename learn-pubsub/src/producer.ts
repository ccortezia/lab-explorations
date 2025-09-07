import express, { Application } from 'express';
import { PubSub, Topic } from '@google-cloud/pubsub';

const app: Application = express();
const port = 3000;

app.use(express.json());

const pubSubClient = new PubSub({
  projectId: 'omnia-local-dev'
});

const topicName = 'ccorteziatest-topic';
let topic: Topic;

async function initializeTopic(): Promise<void> {
  try {
    topic = pubSubClient.topic(topicName);
    const [exists] = await topic.exists();
    if (!exists) {
      console.log(`Topic ${topicName} does not exist. Please create it using Terraform first.`);
      process.exit(1);
    }
    console.log(`Connected to topic: ${topicName}`);
  } catch (error) {
    console.error('Error initializing topic:', error);
    process.exit(1);
  }
}

app.post('/publish', async (req, res) => {
  try {
    const { message, attributes = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageData = {
      data: Buffer.from(JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      })),
      attributes: {
        source: 'producer',
        ...attributes
      }
    };

    const messageId = await topic.publishMessage(messageData);
    
    console.log(`Message published with ID: ${messageId}`);
    res.json({ 
      success: true, 
      messageId,
      published: {
        message,
        attributes: messageData.attributes,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error publishing message:', error);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', topic: topicName });
});

async function startServer(): Promise<void> {
  await initializeTopic();
  
  app.listen(port, () => {
    console.log(`Producer server listening on http://localhost:${port}`);
    console.log(`POST to http://localhost:${port}/publish to send messages`);
    console.log(`Example: curl -X POST -H "Content-Type: application/json" -d '{"message":"Hello World!"}' http://localhost:${port}/publish`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

export { app, startServer };