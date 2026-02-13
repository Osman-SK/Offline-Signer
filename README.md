# 🔐 Offline Solana Transaction Signer

**A consumer-ready, air-gapped Solana transaction signer with a simple browser interface.**

Built with TypeScript for type safety and better developer experience.

## 📑 Table of Contents

- [🎯 Problem](#-problem)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📖 How It Works](#-how-it-works)
- [🔄 Complete Air-Gapped Workflow](#-complete-air-gapped-workflow)
- [📁 Project Structure](#-project-structure)
- [🔧 API Endpoints](#-api-endpoints)
- [🧪 Transaction Format](#-transaction-format)
- [💡 Use Cases](#-use-cases)
- [🛠️ Development](#-development)
- [🧪 Testing](#-testing)
- [🏗️ Technology Stack](#-technology-stack)
- [🔐 Security Model](#-security-model)
- [🔗 Compatibility](#-compatibility)
- [💻 CLI Alternative](#-cli-alternative)
- [📝 Roadmap](#-roadmap)
- [🏆 Colosseum Hackathon](#-colosseum-hackathon)
- [⚠️ Security Warnings](#-security-warnings)
- [🐛 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

## 🎯 Problem

Standard wallet workflows require your private key on an internet-connected device, creating security risks for high-value operations. This tool provides true cold storage with a user-friendly interface.

## ✨ Features

- **🔒 Air-Gapped Security**: Private keys never touch the internet
- **🌐 Browser-Based Interface**: Simple, clean UI accessible on any device
- **🔑 Encrypted Key Storage**: AES-256 encryption for all keypairs
- **📝 Human-Readable Transactions**: Clear display of transaction details before signing
- **💰 SOL & SPL Token Support**: Sign transfers for SOL and SPL tokens (USDC, USDT, etc.)
- **📁 File-Based Transfer**: USB/external drive for moving unsigned and signed transactions
- **✅ Approve/Decline Flow**: Clear user approval before any signature is created
- **🔷 TypeScript**: Full type safety across the entire codebase

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- TypeScript (v5.0 or higher)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/Osman-SK/Offline-Signer.git
cd Offline-Signer
```

2. **Install dependencies**:
```bash
cd backend
npm install
```

3. **Compile TypeScript**:
```bash
# Backend
npm run build

# Frontend
cd ../frontend
npx tsc
```

4. **Start the server**:
```bash
cd ../backend
npm start
```

5. **Open your browser**:
Navigate to `http://localhost:3000`

### Setting Up Both Applications

**Offline Signer** (for air-gapped machine):
```bash
cd backend
npm install
npm run build
npm start
# Access at http://localhost:3000
```

**Transaction Creator** (for online machine):
```bash
cd transaction-creator-and-broadcaster
npm install
npm run dev
# Access at http://localhost:5173
```

### Development Mode

```bash
cd backend
npm run dev  # Uses ts-node for hot-reload
```

## 📖 How It Works

### 1. Key Management (Air-Gapped)

**Generate a New Keypair**:
- Navigate to the "Key Management" tab
- Enter a name and strong password
- Click "Generate Keypair"
- Your private key is encrypted with AES-256 and stored locally
- **Never connected to the internet**

**Import Existing Keypair**:
- Click "Import Existing Keypair"
- Choose format: Base58 (default), Base64, or JSON Array
- Paste your private key
- Set a password for encryption
- Your key is securely stored

### 2. Transaction Signing (Air-Gapped)

**Upload Transaction**:
- Switch to the "Sign Transaction" tab
- Drag and drop or select your `unsigned-tx.json` file
- The transaction details are displayed in human-readable format

**Review & Sign**:
- Review the transaction details:
  - Network (mainnet/devnet)
  - Transaction type (SOL transfer, SPL token, etc.)
  - Amount and recipient
  - Fee payer
- Select your keypair from the dropdown
- Enter your password
- Click "✓ Approve & Sign" or "✗ Decline"

**Download Signed Transaction**:
- If approved, the transaction is signed offline
- Download the `signed-tx.json` file
- Transfer this file to your online machine for broadcasting

## 🔄 Complete Air-Gapped Workflow

This project includes **two complementary applications** for a complete offline signing workflow:

### **Applications Overview**

| Application | Environment | Purpose |
|-------------|-------------|---------|
| **Transaction Creator & Broadcaster** | 💻 Online (internet-connected) | Creates unsigned transactions + broadcasts signed ones |
| **Offline Signer** | 🔒 Offline (air-gapped) | Signs transactions with private keys |

### **Visual Workflow**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ONLINE        │     │   OFFLINE       │     │   ONLINE        │
│   (Connected)   │ ──► │   (Air-Gapped)  │ ──► │   (Connected)   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Transaction     │     │ Offline Signer  │     │ Transaction     │
│ Creator         │     │                 │     │ Creator         │
│                 │     │ 1. Upload       │     │                 │
│ 1. Create Nonce │     │    unsigned-tx  │     │ 3. Broadcast    │
│ 2. Create Tx    │     │ 2. Review       │     │    signed-tx    │
│                 │     │ 3. Sign         │     │                 │
│ Output:         │     │                 │     │ Result:         │
│ unsigned-tx.json│     │ Output:         │     │ Tx on network!  │
└─────────────────┘     │ signed-tx.json  │     └─────────────────┘
                        └─────────────────┘
```

### **Step-by-Step Workflow**

#### **Step 1: Create Durable Nonce (ONLINE)** ⬅️ *Use Transaction Creator*
- **Why**: Nonces prevent replay attacks in offline transactions
- **App**: Transaction Creator & Broadcaster
- **Action**: Create a durable nonce account
  - Hot wallet (connected) = pays for creation
  - Cold wallet (offline) = authority
- **Output**: `nonce-account.json` saved to USB/SD

#### **Step 2: Create Unsigned Transaction (ONLINE)** ⬅️ *Use Transaction Creator*
- **App**: Transaction Creator & Broadcaster
- **Options**:
  - SOL Transfer: Create unsigned SOL transfer
  - Token Transfer: Create SPL token (USDC, USDT, etc.) transfer
- **Input**: Cold wallet public key as sender
- **Output**: `unsigned-tx.json` saved to USB/SD

#### **Step 3: Sign Transaction (OFFLINE)** ⬅️ *Use Offline Signer*
- **Environment**: Move USB/SD to offline machine
- **App**: Offline Signer (this app)
- **Location**: `http://localhost:3000`
- **Actions**:
  1. Upload `unsigned-tx.json`
  2. Review transaction details
  3. Select cold wallet keypair
  4. Enter password
  5. Approve & Sign
- **Output**: `signed-tx.json` saved to USB/SD

#### **Step 4: Broadcast Transaction (ONLINE)** ⬅️ *Use Transaction Creator*
- **Environment**: Move USB/SD back to online machine
- **App**: Transaction Creator & Broadcaster
- **Action**: Upload `signed-tx.json` and broadcast
- **Result**: Transaction submitted to Solana network!

### **Which App for Which Step?**

| Task | Online/Offline | Application | File I/O |
|------|----------------|-------------|----------|
| Create Nonce | 💻 ONLINE | Transaction Creator | Save to USB |
| Create Unsigned Tx | 💻 ONLINE | Transaction Creator | Save to USB |
| Review & Sign Tx | 🔒 OFFLINE | Offline Signer | Read USB → Write USB |
| Broadcast Tx | 💻 ONLINE | Transaction Creator | Read USB |

### **File Formats**

**`unsigned-tx.json`** (created by Transaction Creator):
```json
{
  "description": "Transfer 1 SOL to...",
  "network": "devnet",
  "messageBase64": "...",
  "meta": {
    "tokenSymbol": "SOL",
    "decimals": 9,
    "amount": 1.0
  }
}
```

**`signed-tx.json`** (created by Offline Signer):
```json
{
  "signature": "base64-encoded-signature",
  "publicKey": "signer-public-key",
  "signedAt": "2026-02-13T...",
  "network": "devnet",
  "description": "Transfer 1 SOL to..."
}
```

## 📁 Project Structure

```
offline-signer/
├── backend/                              # TypeScript Node.js server
│   ├── src/
│   │   ├── server.ts                     # Express server with typed routes
│   │   ├── keyManager.ts                 # Key generation, import, encryption
│   │   ├── txProcessor.ts                # Transaction parsing and validation
│   │   ├── signer.ts                     # Transaction signing operations
│   │   ├── types.ts                      # TypeScript type definitions
│   │   └── __tests__/                    # Jest test suite (82 tests)
│   ├── dist/                             # Compiled JavaScript
│   ├── keys/                             # Encrypted keypairs (created at runtime)
│   └── uploads/                          # Transaction files (created at runtime)
├── frontend/                             # TypeScript browser interface
│   ├── src/
│   │   ├── script.ts                     # Client-side logic with types
│   │   └── types.ts                      # Frontend type definitions
│   ├── dist/                             # Compiled JavaScript
│   ├── index.html                        # Main UI
│   └── style.css                         # Styling
├── transaction-creator-and-broadcaster/  # React app for online operations
│   ├── src/
│   │   ├── components/                   # CreateNonceTab, SolTransferTab, etc.
│   │   └── utils/                        # Solana helpers
│   ├── dist/                             # Built React app
│   ├── index.html
│   └── README.md                         # Transaction Creator docs
├── cli/                                  # Reference CLI tool (TypeScript)
├── types/                                # Shared TypeScript types
│   └── index.ts                          # Common type definitions
└── README.md                             # This file
```

## 🔧 API Endpoints

### Key Management

- `POST /api/keys/generate` - Generate new keypair
  - Body: `{ name: string, password: string }`
  - Response: `{ success: true, publicKey: string, message: string }`

- `POST /api/keys/import` - Import existing keypair
  - Body: `{ name: string, privateKey: string, password: string, format?: 'base58' | 'base64' | 'json' }`
  - Response: `{ success: true, publicKey: string, message: string }`

- `GET /api/keys` - List all keypairs (public keys only)
  - Response: `{ success: true, keys: KeypairInfo[] }`

- `DELETE /api/keys/:name` - Delete a keypair
  - Response: `{ success: true, message: string }`

### Transaction Processing

- `POST /api/transaction/upload` - Upload unsigned transaction
  - Content-Type: `multipart/form-data`
  - Field: `transaction` (file)
  - Response: `{ success: true, transaction: ParsedTransaction, filePath: string }`

- `POST /api/transaction/sign` - Sign transaction
  - Body: `{ filePath: string, keyName: string, password: string, approve: boolean }`
  - Response: `{ success: true, signature: string, publicKey: string, signedAt: string, downloadUrl: string }`

- `POST /api/transaction/details` - Get transaction details
  - Body: `{ filePath: string }`
  - Response: `{ success: true, details: TransactionDetails }`

- `GET /api/download/:filename` - Download signed transaction
  - Returns: File download

## 🧪 Transaction Format

### Unsigned Transaction (`unsigned-tx.json`)
```json
{
  "description": "Transfer 1 SOL to ...",
  "network": "devnet",
  "messageBase64": "...",
  "meta": {
    "tokenSymbol": "SOL",
    "decimals": 9,
    "amount": 1.0
  }
}
```

### Signed Transaction (`signed-tx.json`)
```json
{
  "signature": "base64-encoded-signature",
  "publicKey": "signer-public-key",
  "signedAt": "2026-02-09T...",
  "network": "devnet",
  "description": "Transfer 1 SOL to ..."
}
```

## 💡 Use Cases

### Personal Cold Storage
- Keep high-value wallets on an offline machine
- Sign transactions securely without internet exposure
- Perfect for long-term holders and institutions

### Multi-Signature Workflows
- Each signer can review and sign transactions independently
- Air-gapped environment for maximum security
- Compatible with Solana's native multisig

### Institutional Security
- Separate hot and cold wallets
- Approval workflows with offline signing
- Audit trail of all signatures

## 🛠️ Development

### Available Scripts

**Backend** (`cd backend`):
```bash
npm run dev        # Development with ts-node (hot reload)
npm run build      # Compile TypeScript to JavaScript
npm run typecheck  # Type checking without emit
npm start          # Run compiled production code
npm test           # Run Jest test suite
npm test -- --coverage  # Run tests with coverage report
```

**Frontend** (`cd frontend`):
```bash
npx tsc            # Compile TypeScript to JavaScript
npx tsc --watch    # Watch mode for development
```

### TypeScript Development Workflow

1. **Make changes** to `.ts` files in `src/`
2. **Type check** before building:
   ```bash
   cd backend
   npm run typecheck
   ```
3. **Compile** the code:
   ```bash
   # Backend
   npm run build
   
   # Frontend
   cd ../frontend && npx tsc
   ```
4. **Test** your changes:
   ```bash
   cd backend
   NODE_ENV=test npm test
   ```
5. **Run** the application:
   ```bash
   npm run dev  # Development
   # or
   npm start    # Production
   ```

### Private Key Import Formats

The system supports three private key formats:

1. **Base58** (default) - Most common, used by Phantom, Solflare, Solana CLI

2. **Base64** - Base64 encoded byte array

3. **JSON Array** - Array of byte values

## 🔧 Configuration

### Backend TypeScript Configuration

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Frontend TypeScript Configuration

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  }
}
```

## 🧪 Testing

The project includes a comprehensive test suite with **82 tests** covering all major functionality.

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- keyManager.test.ts

# Run tests without starting server
NODE_ENV=test npm test
```

### Test Coverage

- **keyManager.ts**: Keypair generation, import, encryption (24 tests)
- **txProcessor.ts**: Transaction parsing, validation (22 tests)
- **signer.ts**: Transaction signing, verification (18 tests)
- **API endpoints**: Full integration tests (18 tests)

## 🏗️ Technology Stack

- **Language**: TypeScript 5.x with strict mode
- **Backend**: Node.js 18+, Express.js
- **Frontend**: TypeScript with vanilla HTML/CSS (no frameworks)
- **Solana**: @solana/web3.js, @solana/spl-token
- **Cryptography**: tweetnacl (Ed25519 signatures), CryptoJS (AES-256 encryption)
- **Encoding**: bs58 (Base58), native Buffer (Base64)
- **Build**: TypeScript Compiler (tsc), ts-node (development)
- **Testing**: Jest with ts-jest, Supertest (API testing)
- **Security**: Air-gapped design, file-based transfer

## 🔐 Security Model

### Air-Gapped Operation
- **No network calls during key generation or signing**
- All cryptographic operations happen locally
- Private keys encrypted at rest with AES-256

### File-Based Transfer
1. **Online Machine**: Create unsigned transaction → save to USB
2. **Offline Machine**: Load transaction → review → sign → save to USB
3. **Online Machine**: Load signed transaction → broadcast to network

### Encryption
- Private keys encrypted with password-based AES-256
- Keys never stored in plaintext
- Passwords never transmitted or logged

## 🔗 Compatibility

### CLI Compatibility
Compatible with transaction format from:
- [offline-signing-cli](https://github.com/ChainflowSOL/offline-signing-cli)

You can create transactions using the CLI and sign them with this browser interface (or vice versa).

### Network Support
- Solana Mainnet
- Solana Devnet
- Solana Testnet

## 💻 CLI Alternative

For power users who prefer command-line interfaces, a reference CLI implementation is included in `/cli/`:

```bash
cd cli
npm install
npm run build

# Available commands:
npx ts-node src/index.ts create-nonce    # Create durable nonce
npx ts-node src/index.ts sol-transfer    # Create unsigned SOL transfer
npx ts-node src/index.ts token-transfer  # Create unsigned token transfer
npx ts-node src/index.ts sign            # Sign transaction offline
npx ts-node src/index.ts broadcast       # Broadcast signed transaction
```

The CLI provides the same workflow as the web apps but via terminal commands.

## 📝 Roadmap

### Phase 1 (Current - MVP)
- ✅ Offline key generation and storage
- ✅ Browser-based signing interface
- ✅ SOL and SPL token support
- ✅ File-based transaction transfer
- ✅ Human-readable transaction display
- ✅ TypeScript migration
- ✅ Comprehensive test suite (82 tests)
- ✅ Transaction Creator & Broadcaster companion app

### Phase 2 (Post-Hackathon)
- Hardware extension (SD card or USB device)
- Mobile-optimized interface
- QR code transfer option
- Hardware wallet integration
- Multi-signature support

## 🏆 Colosseum Hackathon

This project was built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) by agent `opencode-offline-signer`.

**Project Goals**:
- Build a consumer-ready offline Solana transaction signer
- Focus on security and usability
- Air-gapped design with file-based transfer
- Browser interface for maximum compatibility

## ⚠️ Security Warnings

- **Never expose your private keys**: This tool is designed to keep keys offline
- **Use strong passwords**: Password-based encryption is only as strong as your password
- **Backup your keypairs**: Store encrypted keypair files in a secure location
- **Verify transactions**: Always review transaction details before signing
- **Test on devnet first**: Verify your workflow with devnet before using on mainnet

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**TypeScript compilation errors**:
```bash
cd backend
npm run typecheck  # Check types
npm run clean      # Clean dist folder
npm run build      # Rebuild
```

**Missing dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Module not found errors**:
```bash
# Rebuild TypeScript
cd backend && npm run build
cd ../frontend && npx tsc
```

## 📄 License

Apache 2.0 License (compatible with reference CLI)

## 🙏 Acknowledgments

- Built on top of [offline-signing-cli](https://github.com/ChainflowSOL/offline-signing-cli) by ChainflowSOL
- Uses Solana's `@solana/web3.js` SDK
- Powered by `tweetnacl` for Ed25519 signatures

## 📞 Support

For issues or questions, please open an issue on GitHub, reach out on the Colosseum forum, or DM on X: @OSK546.

---

**Built with ❤️ for secure Solana transactions | Colosseum Hackathon 2026**
