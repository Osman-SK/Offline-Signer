# Transaction Creator & Broadcaster

A Vite/React web application for creating unsigned Solana transactions with durable nonces and broadcasting signed transactions.

## Features

- **Create Nonce Account**: Create durable nonce accounts using a connected wallet (payer) for cold wallet (authority)
- **SOL Transfer**: Create unsigned SOL transfer transactions for offline signing
- **Token Transfer**: Create unsigned SPL token transfer transactions for offline signing
- **Broadcast**: Upload signed transactions and broadcast them to the network

## Workflow

1. **Create Nonce** → Create a durable nonce account (hot wallet pays, cold wallet is authority)
2. **Create Transaction** → Create unsigned SOL or token transfer (specify cold wallet as sender)
3. **Sign Offline** → Move unsigned-tx.json to offline machine, sign with cold wallet
4. **Broadcast** → Upload signed-tx.json and broadcast to network

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Backpack, Phantom, Solflare, etc.)

### Installation

```bash
cd transaction-creator-and-broadcaster
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Architecture

### Components

- **CreateNonceTab**: Creates durable nonce accounts on-chain
- **SolTransferTab**: Creates unsigned SOL transfers with "Use Connected Wallet" toggle
- **TokenTransferTab**: Creates unsigned token transfers with quick-select for common tokens
- **BroadcastTab**: Broadcasts signed transactions with explorer links

### State Management

- **localStorage**: Persists nonce accounts and network selection across sessions
- **React Context**: Wallet adapter state via @solana/wallet-adapter-react

### JSON Output Formats

Compatible with the offline-signer-cli:

**nonce-account.json:**
```json
{
  "address": "...",
  "authority": "...",
  "savedAt": "..."
}
```

**unsigned-tx.json:**
```json
{
  "description": "Transfer 1 SOL to...",
  "network": "devnet",
  "messageBase64": "...",
  "meta": {
    "tokenSymbol": "SOL",
    "decimals": 9,
    "amount": 1
  }
}
```

**signed-tx.json:**
```json
{
  "signature": "...",
  "publicKey": "...",
  "signedAt": "..."
}
```

## Security

- Private keys never stored in the app
- All signing happens via wallet adapter
- Cold wallet workflow supported (enter public key manually)
- Console logging for debugging (check browser console)

## Wallet Support

Prioritized support for:
- Backpack (recommended)
- Phantom
- Solflare
- Other Solana wallets via wallet adapter

## Development Notes

- Built with Vite + React + TypeScript
- Uses @solana/wallet-adapter for wallet integration
- Matches styling of offline-signer project (purple gradient theme)
- Console logs for debugging transaction flow

## License

Apache 2.0
