import request from 'supertest';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WalletService } from '../wallet-service';

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
  } catch (error) {
    console.error('Error processing deposit:', error);
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

const testApp = {
  request: () => request(app.fetch as any)
};

describe('Financial API E2E Tests', () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Deposit Flow', () => {
    it('should create wallet, deposit funds, and verify balance', async () => {
      const createWalletResponse = await testApp.request()
        .post('/wallets')
        .expect(201);

      expect(createWalletResponse.body).toHaveProperty('walletId');
      const { walletId } = createWalletResponse.body;

      const initialBalanceResponse = await testApp.request()
        .get(`/wallets/${walletId}/balance`)
        .expect(200);

      expect(initialBalanceResponse.body).toEqual({
        accountId: walletId,
        available: '0',
        pending: '0'
      });

      const depositResponse = await testApp.request()
        .post(`/wallets/${walletId}/deposit`)
        .send({ amount: '100' })
        .expect(200);

      expect(depositResponse.body).toHaveProperty('transferId');
      expect(depositResponse.body.amount).toBe('100');

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalBalanceResponse = await testApp.request()
        .get(`/wallets/${walletId}/balance`)
        .expect(200);

      expect(finalBalanceResponse.body).toEqual({
        accountId: walletId,
        available: '100',
        pending: '0'
      });
    });
  });

  describe('Withdrawal Flow', () => {
    it('should create wallet, deposit funds, withdraw, and verify pending then settled balance', async () => {
      const createWalletResponse = await testApp.request()
        .post('/wallets')
        .expect(201);

      const { walletId } = createWalletResponse.body;

      await testApp.request()
        .post(`/wallets/${walletId}/deposit`)
        .send({ amount: '100' })
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const balanceAfterDeposit = await testApp.request()
        .get(`/wallets/${walletId}/balance`)
        .expect(200);

      expect(balanceAfterDeposit.body.available).toBe('100');

      const withdrawalResponse = await testApp.request()
        .post(`/wallets/${walletId}/withdraw`)
        .send({ amount: '30' })
        .expect(200);

      expect(withdrawalResponse.body).toHaveProperty('withdrawalId');
      expect(withdrawalResponse.body).toHaveProperty('pendingTransferId');
      expect(withdrawalResponse.body.amount).toBe('30');
      expect(withdrawalResponse.body.status).toBe('pending');

      await new Promise(resolve => setTimeout(resolve, 100));

      const balanceWithPending = await testApp.request()
        .get(`/wallets/${walletId}/balance`)
        .expect(200);

      expect(balanceWithPending.body.available).toBe('70');
      expect(balanceWithPending.body.pending).toBe('30');

      await new Promise(resolve => setTimeout(resolve, 6000));

      const finalBalance = await testApp.request()
        .get(`/wallets/${walletId}/balance`)
        .expect(200);

      expect(finalBalance.body.available).toBe('70');
      expect(finalBalance.body.pending).toBe('0');
    });
  });
});