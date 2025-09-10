# TigerBeetle Financial API Evaluation

A TypeScript financial API built with Hono to evaluate TigerBeetle as a ledger database backend.

## Features

- **Wallet Management**: Create wallets and check balances
- **Deposits**: Add funds to wallets instantly
- **Withdrawals**: Two-phase withdrawals with pending state and auto-settlement
- **Real-time Balance Tracking**: Separate available and pending balances

## API Endpoints

- `POST /wallets` - Create a new wallet
- `GET /wallets/:walletId/balance` - Get wallet balance (available + pending)
- `POST /wallets/:walletId/deposit` - Deposit funds to a wallet
- `POST /wallets/:walletId/withdraw` - Start a withdrawal (pending for 5 seconds)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (managed with nvm)
- pnpm package manager

### 1. Setup Node.js

```bash
# Install and use Node.js 22
nvm install
nvm use
```

### 2. Start TigerBeetle

```bash
docker compose up -d
```

This will start TigerBeetle on port 3001 with data persistence.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run the API

```bash
pnpm dev
```

The API will be available at http://localhost:3000

### 5. Run Tests

```bash
# E2E tests (requires TigerBeetle running)
pnpm test:e2e
```

## Example Usage

```bash
# Create a wallet
curl -X POST http://localhost:3000/wallets

# Deposit funds
curl -X POST http://localhost:3000/wallets/{walletId}/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": "100"}'

# Check balance
curl http://localhost:3000/wallets/{walletId}/balance

# Start withdrawal
curl -X POST http://localhost:3000/wallets/{walletId}/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": "30"}'
```

## How It Works

### Withdrawal Flow

1. **Initiate**: `POST /wallets/:id/withdraw` creates a pending transfer
2. **Pending State**: Funds move from available to pending balance
3. **Auto-Settlement**: After 5 seconds, the pending transfer is automatically posted
4. **Final State**: Pending balance returns to 0, funds are fully withdrawn

### TigerBeetle Integration

- Uses double-entry bookkeeping with system account (ID: 1)
- Leverages TigerBeetle's native two-phase transfer support
- Automatic timeout handling for pending transfers

## Project Structure

```
src/
├── index.ts              # Hono API server
├── tigerbeetle-client.ts # TigerBeetle client wrapper
├── wallet-service.ts     # Business logic
└── __tests__/
    └── api.e2e.test.ts   # End-to-end tests
```