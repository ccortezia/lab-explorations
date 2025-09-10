import { TigerBeetleClient } from './tigerbeetle-client';

export interface WalletBalance {
  accountId: string;
  available: string;
  pending: string;
}

export interface WithdrawalResult {
  withdrawalId: string;
  pendingTransferId: string;
  amount: string;
  status: 'pending';
}

export interface DepositResult {
  depositId: string;
  pendingTransferId: string;
  amount: string;
  status: 'pending';
}

export class WalletService {
  private client: TigerBeetleClient;
  private pendingWithdrawals: Map<string, { pendingTransferId: bigint; timeoutId: NodeJS.Timeout }> = new Map();
  private pendingDeposits: Map<string, { pendingTransferId: bigint; timeoutId: NodeJS.Timeout }> = new Map();
  private readonly systemAccountId = 999999999999999999n; // Fixed large ID for system account

  constructor() {
    this.client = new TigerBeetleClient();
  }

  async createWallet(): Promise<{ walletId: string }> {
    const walletId = this.client.generateId();
    
    await this.client.createAccount(walletId);
    
    return { walletId: walletId.toString() };
  }

  async getWalletBalance(walletId: string): Promise<WalletBalance> {
    const accountId = BigInt(walletId);
    const account = await this.client.getAccount(accountId);
  

    if (!account) {
      throw new Error('Wallet not found');
    }

    const available = (account.credits_posted - account.debits_posted - account.debits_pending).toString();
    
    const pending = account.debits_pending.toString();

    return {
      accountId: walletId,
      available,
      pending
    };
  }

  async deposit(walletId: string, amount: string): Promise<DepositResult> {
    const accountId = BigInt(walletId);
    const amountBig = BigInt(amount);
    const depositId = this.client.generateId();
    const pendingTransferId = this.client.generateId();
    
    if (!await this.client.getAccount(this.systemAccountId)) {
      await this.client.createAccount(this.systemAccountId, 1, 100);
    }

    await this.client.createPendingTransfer(
      pendingTransferId,
      this.systemAccountId,
      accountId,
      amountBig,
      5
    );

    const timeoutId = setTimeout(async () => {
      try {
        const postTransferId = this.client.generateId();
        await this.client.postPendingTransfer(pendingTransferId, postTransferId);
        this.pendingDeposits.delete(depositId.toString());
      } catch (error) {
        console.error('Failed to auto-settle deposit:', error);
      }
    }, 3000);

    this.pendingDeposits.set(depositId.toString(), {
      pendingTransferId,
      timeoutId
    });

    return {
      depositId: depositId.toString(),
      pendingTransferId: pendingTransferId.toString(),
      amount,
      status: 'pending'
    };
  }

  async startWithdrawal(walletId: string, amount: string): Promise<WithdrawalResult> {
    const accountId = BigInt(walletId);
    const amountBig = BigInt(amount);
    const withdrawalId = this.client.generateId();
    const pendingTransferId = this.client.generateId();
    
    if (!await this.client.getAccount(this.systemAccountId)) {
      await this.client.createAccount(this.systemAccountId, 1, 100);
    }

    await this.client.createPendingTransfer(
      pendingTransferId,
      accountId,
      this.systemAccountId,
      amountBig,
      10
    );

    const timeoutId = setTimeout(async () => {
      try {
        const postTransferId = this.client.generateId();
        await this.client.postPendingTransfer(pendingTransferId, postTransferId);
        this.pendingWithdrawals.delete(withdrawalId.toString());
      } catch (error) {
        console.error('Failed to auto-settle withdrawal:', error);
      }
    }, 5000);

    this.pendingWithdrawals.set(withdrawalId.toString(), {
      pendingTransferId,
      timeoutId
    });

    return {
      withdrawalId: withdrawalId.toString(),
      pendingTransferId: pendingTransferId.toString(),
      amount,
      status: 'pending'
    };
  }
}