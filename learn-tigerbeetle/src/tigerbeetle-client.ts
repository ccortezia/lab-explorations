import { createClient, id, AccountFlags, TransferFlags, CreateTransferError, amount_max } from 'tigerbeetle-node';

export class TigerBeetleClient {
  private client: any;

  constructor() {
    this.client = createClient({
      cluster_id: 0n,
      replica_addresses: [process.env.TB_ADDRESS || '3001']
    });
  }

  async createAccount(accountId: bigint, ledger: number = 1, code: number = 718) {
    console.log('TigerBeetleClient.createAccount called with:', {
      accountId: accountId.toString(),
      ledger,
      code
    });

    const account = {
      id: accountId,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: ledger,
      code: code,
      flags: AccountFlags.none,
      timestamp: 0n,
    };

    console.log('Creating account with data:', {
      id: account.id.toString(),
      ledger: account.ledger,
      code: account.code,
      flags: account.flags
    });

    const result = await this.client.createAccounts([account]);
    if (result.length > 0) {
      console.error('Account creation failed:', JSON.stringify(result[0]));
      throw new Error(`Failed to create account: ${JSON.stringify(result[0])}`);
    }
    
    console.log('Account created successfully:', account.id.toString());
    return account;
  }

  async getAccount(accountId: bigint) {
    console.log('TigerBeetleClient.getAccount called with accountId:', accountId.toString());
    
    const accounts = await this.client.lookupAccounts([accountId]);
    const found = accounts.length > 0;
    
    console.log('Account lookup result:', {
      found,
      account: found ? {
        id: accounts[0].id.toString(),
        ledger: accounts[0].ledger,
        code: accounts[0].code,
        credits_posted: accounts[0].credits_posted.toString(),
        debits_posted: accounts[0].debits_posted.toString(),
        credits_pending: accounts[0].credits_pending.toString(),
        debits_pending: accounts[0].debits_pending.toString()
      } : null
    });
    
    return found ? accounts[0] : null;
  }

  async createTransfer(
    id: bigint,
    debitAccountId: bigint,
    creditAccountId: bigint,
    amount: bigint,
    flags: number = TransferFlags.none,
    ledger: number = 1,
    code: number = 1
  ) {
    console.log('TigerBeetleClient.createTransfer called with:', {
      id: id.toString(),
      debitAccountId: debitAccountId.toString(),
      creditAccountId: creditAccountId.toString(),
      amount: amount.toString(),
      flags,
      ledger,
      code
    });

    const transfer = {
      id,
      debit_account_id: debitAccountId,
      credit_account_id: creditAccountId,
      amount,
      pending_id: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 0,
      ledger,
      code,
      flags,
      timestamp: 0n,
    };

    console.log('Creating transfer with data:', {
      id: transfer.id.toString(),
      debit_account_id: transfer.debit_account_id.toString(),
      credit_account_id: transfer.credit_account_id.toString(),
      amount: transfer.amount.toString(),
      ledger: transfer.ledger,
      code: transfer.code,
      flags: transfer.flags,
      pending_id: transfer.pending_id.toString(),
      timeout: transfer.timeout
    });

    const result = await this.client.createTransfers([transfer]);
    if (result.length > 0) {
      const errorCode = result[0].result;
      const errorName = CreateTransferError[errorCode] || `unknown_error_${errorCode}`;
      console.error('Transfer creation failed:', {
        errorCode,
        errorName,
        transfer: {
          id: transfer.id.toString(),
          debit_account_id: transfer.debit_account_id.toString(),
          credit_account_id: transfer.credit_account_id.toString(),
          amount: transfer.amount.toString()
        }
      });
      throw new Error(`Failed to create transfer: ${errorName} (code: ${errorCode})`);
    }
    
    console.log('Transfer created successfully:', transfer.id.toString());
    return transfer;
  }

  async createPendingTransfer(
    id: bigint,
    debitAccountId: bigint,
    creditAccountId: bigint,
    amount: bigint,
    timeoutSeconds: number = 5,
    ledger: number = 1,
    code: number = 1
  ) {
    console.log('TigerBeetleClient.createPendingTransfer called with:', {
      id: id.toString(),
      debitAccountId: debitAccountId.toString(),
      creditAccountId: creditAccountId.toString(),
      amount: amount.toString(),
      timeoutSeconds,
      ledger,
      code
    });

    const transfer = {
      id,
      debit_account_id: debitAccountId,
      credit_account_id: creditAccountId,
      amount,
      pending_id: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: timeoutSeconds,
      ledger,
      code,
      flags: TransferFlags.pending,
      timestamp: 0n,
    };

    console.log('Creating pending transfer with data:', {
      id: transfer.id.toString(),
      debit_account_id: transfer.debit_account_id.toString(),
      credit_account_id: transfer.credit_account_id.toString(),
      amount: transfer.amount.toString(),
      timeout: transfer.timeout,
      flags: transfer.flags,
      ledger: transfer.ledger,
      code: transfer.code
    });

    const result = await this.client.createTransfers([transfer]);
    if (result.length > 0) {
      const errorCode = result[0].result;
      const errorName = CreateTransferError[errorCode] || `unknown_error_${errorCode}`;
      console.error('Pending transfer creation failed:', {
        errorCode,
        errorName,
        transfer: {
          id: transfer.id.toString(),
          debit_account_id: transfer.debit_account_id.toString(),
          credit_account_id: transfer.credit_account_id.toString(),
          amount: transfer.amount.toString()
        }
      });
      throw new Error(`Failed to create pending transfer: ${errorName} (code: ${errorCode})`);
    }
    
    console.log('Pending transfer created successfully:', transfer.id.toString());
    return transfer;
  }

  async postPendingTransfer(pendingTransferId: bigint, postTransferId: bigint) {
    console.log('TigerBeetleClient.postPendingTransfer called with:', {
      pendingTransferId: pendingTransferId.toString(),
      postTransferId: postTransferId.toString()
    });

    const transfer = {
      id: postTransferId,
      debit_account_id: 0n,
      credit_account_id: 0n,
      amount: amount_max, // Posts full pending amount
      pending_id: pendingTransferId,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 0,
      ledger: 1,
      code: 1,
      flags: TransferFlags.post_pending_transfer,
      timestamp: 0n,
    };

    console.log('Posting pending transfer with data:', {
      id: transfer.id.toString(),
      pending_id: transfer.pending_id.toString(),
      flags: transfer.flags,
      ledger: transfer.ledger,
      code: transfer.code
    });

    const result = await this.client.createTransfers([transfer]);
    if (result.length > 0) {
      const errorCode = result[0].result;
      const errorName = CreateTransferError[errorCode] || `unknown_error_${errorCode}`;
      console.error('Post pending transfer failed:', {
        errorCode,
        errorName,
        pendingTransferId: pendingTransferId.toString(),
        postTransferId: postTransferId.toString()
      });
      throw new Error(`Failed to post pending transfer: ${errorName} (code: ${errorCode})`);
    }
    
    console.log('Pending transfer posted successfully:', postTransferId.toString());
    return transfer;
  }

  async getTransfer(transferId: bigint) {
    console.log('TigerBeetleClient.getTransfer called with transferId:', transferId.toString());
    
    const transfers = await this.client.lookupTransfers([transferId]);
    const found = transfers.length > 0;
    
    console.log('Transfer lookup result:', {
      transferId: transferId.toString(),
      found,
      transfer: found ? {
        id: transfers[0].id.toString(),
        debit_account_id: transfers[0].debit_account_id.toString(),
        credit_account_id: transfers[0].credit_account_id.toString(),
        amount: transfers[0].amount.toString(),
        flags: transfers[0].flags,
        ledger: transfers[0].ledger,
        code: transfers[0].code
      } : null
    });
    
    return found ? transfers[0] : null;
  }

  generateId(): bigint {
    const newId = id();
    console.log('TigerBeetleClient.generateId generated:', newId.toString());
    return newId;
  }
}