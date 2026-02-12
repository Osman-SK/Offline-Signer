/**
 * Shared TypeScript type definitions for Offline Solana Transaction Signer
 * Used by both backend and frontend for type consistency
 */

// ============================================================================
// Key Management Types
// ============================================================================

/**
 * Supported private key import formats
 */
export type PrivateKeyFormat = 'base58' | 'base64' | 'json';

/**
 * Stored keypair data (encrypted)
 */
export interface KeypairData {
  name: string;
  publicKey: string;
  encryptedSecretKey: string;
  createdAt?: string;
  importedAt?: string;
}

/**
 * Keypair information (without sensitive data)
 */
export interface KeypairInfo {
  name: string;
  publicKey: string;
  createdAt?: string;
  importedAt?: string;
}

/**
 * Result of generating or importing a keypair
 */
export interface KeypairResult {
  name: string;
  publicKey: string;
  createdAt?: string;
  importedAt?: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Unsigned transaction file format (from CLI or external source)
 */
export interface UnsignedTransaction {
  description: string;
  network: 'mainnet' | 'devnet' | 'testnet';
  messageBase64: string;
  meta?: {
    tokenSymbol: string;
    decimals: number;
    amount: number;
  };
}

/**
 * Signed transaction file format
 */
export interface SignedTransaction {
  signature: string;
  publicKey: string;
  signedAt: string;
  network: string;
  description: string;
}

/**
 * Parsed transaction data with deserialized message
 */
export interface ParsedTransaction extends UnsignedTransaction {
  messageBuffer: Buffer;
  message: import('@solana/web3.js').VersionedMessage;
  details: TransactionDetails;
  rawFilePath: string;
}

/**
 * Human-readable transaction details
 */
export interface TransactionDetails {
  network: string;
  description: string;
  feePayer: string;
  type: TransactionType;
  amount?: number;
  tokenSymbol?: string;
  decimals?: number;
  amountFormatted?: string;
  accounts: AccountInfo[];
  instructions: InstructionInfo[];
}

/**
 * Transaction type identifier
 */
export type TransactionType = 'SOL Transfer' | 'SPL Token Transfer' | 'Transfer' | 'Unknown';

/**
 * Account information extracted from transaction
 */
export interface AccountInfo {
  index: number;
  pubkey: string;
  pubkeyShort: string;
}

/**
 * Instruction information extracted from transaction
 */
export interface InstructionInfo {
  index: number;
  programId: string;
  programIdShort: string;
  accounts: number[];
  data: string;
}

/**
 * Parties involved in a transaction
 */
export interface TransactionParties {
  sender: string;
  senderShort: string;
  recipient: string | null;
  recipientShort: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generate keypair request body
 */
export interface GenerateKeypairRequest {
  name: string;
  password: string;
}

/**
 * Import keypair request body
 */
export interface ImportKeypairRequest {
  name: string;
  privateKey: string;
  password: string;
  format?: PrivateKeyFormat;
}

/**
 * Sign transaction request body
 */
export interface SignTransactionRequest {
  filePath: string;
  keyName: string;
  password: string;
  approve: boolean;
}

/**
 * Sign transaction response data
 */
export interface SignTransactionResponse {
  signature: string;
  publicKey: string;
  downloadUrl: string;
  signedAt: string;
}

/**
 * Upload transaction response data
 */
export interface UploadTransactionResponse {
  transaction: ParsedTransaction;
  filePath: string;
}

// ============================================================================
// Signing Types
// ============================================================================

/**
 * Result of signing a transaction
 */
export interface SignResult {
  signature: string;
  publicKey: string;
  outputPath: string;
  outputFilename: string;
  signedAt: string;
}

/**
 * Preview of what will be signed (for UI display)
 */
export interface SigningPreview {
  signer: {
    name: string;
    publicKey: string;
    publicKeyShort: string;
  };
  transaction: {
    type: TransactionType;
    network: string;
    description: string;
    amount: string;
    sender: string;
    senderShort: string;
    recipient: string | null;
    recipientShort: string | null;
    feePayer: string;
    feePayerShort: string;
  };
  security: {
    verifiedSigner: boolean;
    warning: string | null;
  };
}

// ============================================================================
// Frontend State Types
// ============================================================================

/**
 * Global application state
 */
export interface AppState {
  currentTransaction: ParsedTransaction | null;
  currentFilePath: string | null;
}

/**
 * Keypair list item for frontend display
 */
export interface KeypairListItem {
  name: string;
  publicKey: string;
  createdAt?: string;
  importedAt?: string;
  displayDate: string;
  dateLabel: string;
}

/**
 * Status message types
 */
export type StatusType = 'success' | 'error' | 'info';

/**
 * Transaction detail display item
 */
export interface TransactionDisplayDetail {
  label: string;
  value: string;
  isAmount?: boolean;
}
