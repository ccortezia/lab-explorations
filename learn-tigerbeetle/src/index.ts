import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WalletService } from './wallet-service';

const app = new Hono();
const walletService = new WalletService();

app.post('/wallets', async (c) => {
  try {
    const result = await walletService.createWallet();
    return c.json(result, 201);
  } catch (error) {
    console.error('Error creating wallet:', error);
    return c.json({ error: 'Failed to create wallet' }, 500);
  }
});

app.get('/wallets/:walletId/balance', async (c) => {
  try {
    const walletId = c.req.param('walletId');
    const balance = await walletService.getWalletBalance(walletId);
    return c.json(balance);
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    if (error instanceof Error && error.message === 'Wallet not found') {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    return c.json({ error: 'Failed to get wallet balance' }, 500);
  }
});

app.post('/wallets/:walletId/deposit', async (c) => {
  try {
    const walletId = c.req.param('walletId');
    const body = await c.req.json();
    const { amount } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return c.json({ error: 'Valid amount is required' }, 400);
    }

    const result = await walletService.deposit(walletId, amount);
    return c.json(result);
  } catch (error: unknown) {
    console.error('Error processing deposit:', error instanceof Error ? error.message : 'Unknown error');
    return c.json({ error: 'Failed to process deposit' }, 500);
  }
});

app.post('/wallets/:walletId/withdraw', async (c) => {
  try {
    const walletId = c.req.param('walletId');
    const body = await c.req.json();
    const { amount } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return c.json({ error: 'Valid amount is required' }, 400);
    }

    const result = await walletService.startWithdrawal(walletId, amount);
    return c.json(result);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return c.json({ error: 'Failed to process withdrawal' }, 500);
  }
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = parseInt(process.env.PORT || '3000');

console.log(`Server is running on port ${port}`);
serve({
  fetch: app.fetch,
  port,
});