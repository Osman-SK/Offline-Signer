# 🔐 Offline Solana Transaction Signer

**A consumer-ready, air-gapped Solana transaction signer with a simple browser interface.**

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

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/Osman-SK/Offline-Signer.git
cd Offline-Signer
```

2. **Install backend dependencies**:
```bash
cd backend
npm install
```

3. **Start the server**:
```bash
npm start
```

4. **Open your browser**:
Navigate to `http://localhost:3000`

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
- Paste your private key (JSON array format)
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

## 📁 Project Structure

```
offline-signer/
├── backend/                 # Node.js Express server
│   ├── src/
│   │   ├── server.js        # Main server and API routes
│   │   ├── keyManager.js    # Key generation, import, encryption
│   │   ├── txProcessor.js   # Transaction parsing and validation
│   │   └── signer.js        # Transaction signing operations
│   └── package.json
├── frontend/                # Browser interface
│   ├── index.html           # Main UI
│   ├── style.css            # Clean, minimal styling
│   └── script.js            # Client-side logic
├── cli/                     # Reference CLI (from ChainflowSOL)
└── README.md
```

## 🔧 API Endpoints

### Key Management

- `POST /api/keys/generate` - Generate new keypair
- `POST /api/keys/import` - Import existing keypair
- `GET /api/keys` - List all keypairs (public keys only)
- `DELETE /api/keys/:name` - Delete a keypair

### Transaction Processing

- `POST /api/transaction/upload` - Upload unsigned transaction
- `POST /api/transaction/sign` - Sign transaction
- `GET /api/download/:filename` - Download signed transaction

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

### Run in Development Mode
```bash
cd backend
npm run dev
```

### Technology Stack
- **Backend**: Node.js, Express, @solana/web3.js, tweetnacl
- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Encryption**: CryptoJS (AES-256)
- **Security**: Air-gapped design, file-based transfer

## 🔗 Compatibility

### CLI Compatibility
This project is compatible with the transaction format used by:
- [offline-signing-cli](https://github.com/ChainflowSOL/offline-signing-cli)

You can create transactions using the CLI and sign them with this browser interface (or vice versa).

### Network Support
- Solana Mainnet
- Solana Devnet
- Solana Testnet

## 📝 Roadmap

### Phase 1 (Current - Hackathon MVP)
- ✅ Offline key generation and storage
- ✅ Browser-based signing interface
- ✅ SOL and SPL token support
- ✅ File-based transaction transfer
- ✅ Human-readable transaction display

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

## 📄 License

Apache 2.0 License (compatible with reference CLI)

## 🙏 Acknowledgments

- Built on top of [offline-signing-cli](https://github.com/ChainflowSOL/offline-signing-cli) by ChainflowSOL
- Uses Solana's `@solana/web3.js` SDK
- Powered by `tweetnacl` for Ed25519 signatures

## 📞 Support

For issues or questions, please open an issue on GitHub or reach out on the Colosseum forum.

---

**Built with ❤️ for secure Solana transactions | Colosseum Hackathon 2026**