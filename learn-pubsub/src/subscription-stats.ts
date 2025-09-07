import { PubSub } from '@google-cloud/pubsub';

interface SubscriptionStats {
  name: string;
  unackedMessages: number;
  type: 'pull' | 'push';
  ordered: boolean;
}

class SubscriptionStatsChecker {
  private pubSubClient: PubSub;
  private namespace: string;

  constructor() {
    this.pubSubClient = new PubSub({
      projectId: 'omnia-local-dev'
    });
    this.namespace = 'ccorteziatest';
  }

  async getSubscriptionStats(): Promise<void> {
    const subscriptions = [
      { name: 'sub1-pull-unordered', type: 'pull' as const, ordered: false },
      { name: 'sub2-push-unordered', type: 'push' as const, ordered: false },
      { name: 'sub3-pull-ordered', type: 'pull' as const, ordered: true },
      { name: 'sub4-push-ordered', type: 'push' as const, ordered: true },
      { name: 'dead-letter-sub', type: 'pull' as const, ordered: false }
    ];

    console.log('📊 Subscription Statistics\n');
    console.log('┌─────────────────────────┬─────────┬──────────┬─────────┐');
    console.log('│ Subscription            │ Type    │ Ordered  │ Unacked │');
    console.log('├─────────────────────────┼─────────┼──────────┼─────────┤');

    for (const sub of subscriptions) {
      try {
        const subscriptionName = `${this.namespace}-${sub.name}`;
        const subscription = this.pubSubClient.subscription(subscriptionName);
        
        const [exists] = await subscription.exists();
        if (!exists) {
          console.log(`│ ${sub.name.padEnd(23)} │ ${sub.type.padEnd(7)} │ ${String(sub.ordered).padEnd(8)} │ N/A     │`);
          continue;
        }

        // Get subscription metadata to check for unacked messages
        const [metadata] = await subscription.getMetadata();
        // Use type assertion since the API docs show this property exists but types may be incomplete
        const unackedMessages = parseInt((metadata as any).numUndeliveredMessages || '0');

        console.log(`│ ${sub.name.padEnd(23)} │ ${sub.type.padEnd(7)} │ ${String(sub.ordered).padEnd(8)} │ ${String(unackedMessages).padStart(7)} │`);
        
      } catch (error) {
        console.log(`│ ${sub.name.padEnd(23)} │ ${sub.type.padEnd(7)} │ ${String(sub.ordered).padEnd(8)} │ ERROR   │`);
        console.error(`  Error checking ${sub.name}:`, error);
      }
    }

    console.log('└─────────────────────────┴─────────┴──────────┴─────────┘');
    console.log('\nNote: Unacked = Messages delivered but not yet acknowledged');
  }
}

async function main(): Promise<void> {
  try {
    const checker = new SubscriptionStatsChecker();
    await checker.getSubscriptionStats();
  } catch (error) {
    console.error('Error checking subscription stats:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SubscriptionStatsChecker, main };