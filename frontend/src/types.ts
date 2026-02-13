/**
 * Frontend type definitions for Offline Solana Transaction Signer
 */

// ============================================================================
// Keypair Types
// ============================================================================

export interface KeypairInfo {
  name: string;
  publicKey: string;
  createdAt?: string;
  importedAt?: string;
  hasSeedPhrase?: boolean;
}

export interface KeypairListResponse {
  success: boolean;
  keys: KeypairInfo[];
  error?: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionMeta {
  tokenSymbol: string;
  decimals: number;
  amount: number;
}

export interface TransactionAccount {
  index: number;
  pubkey: string;
  pubkeyShort: string;
}

export interface TransactionInstruction {
  index: number;
  programId: string;
  programIdShort: string;
  accounts: number[];
  data: string;
}

export interface TransactionDetails {
  network: string;
  description: string;
  feePayer: string;
  type: string;
  amount?: number;
  tokenSymbol?: string;
  decimals?: number;
  amountFormatted?: string;
  accounts: TransactionAccount[];
  instructions: TransactionInstruction[];
}

export interface ParsedTransaction {
  description: string;
  network: string;
  messageBase64: string;
  meta?: TransactionMeta;
  messageBuffer: Uint8Array;
  message: unknown;
  details: TransactionDetails;
  rawFilePath: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerateKeypairResponse {
  success: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}

export interface ImportKeypairResponse {
  success: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}

export interface UploadTransactionResponse {
  success: boolean;
  transaction?: ParsedTransaction;
  filePath?: string;
  error?: string;
}

export interface SignTransactionResponse {
  success: boolean;
  signature?: string;
  publicKey?: string;
  signedAt?: string;
  downloadUrl?: string;
  error?: string;
  message?: string;
}

// ============================================================================
// App State Types
// ============================================================================

export interface AppState {
  currentTransaction: ParsedTransaction | null;
  currentFilePath: string | null;
}

export type StatusType = 'success' | 'error' | 'info';

// ============================================================================
// DOM Element Types (for TypeScript strict mode)
// ============================================================================

export type FormElement = HTMLFormElement;
export type InputElement = HTMLInputElement;
export type SelectElement = HTMLSelectElement;
export type TextAreaElement = HTMLTextAreaElement;
export type DivElement = HTMLDivElement;
export type ButtonElement = HTMLButtonElement;

// ============================================================================
// Private Key Format
// ============================================================================

export type PrivateKeyFormat = 'base58' | 'base64' | 'json';

// ============================================================================
// Mnemonic Import Types
// ============================================================================

export interface MnemonicValidation {
  valid: boolean;
  wordCount: number;
  checksumValid: boolean;
  message: string;
}

export interface MnemonicValidationResponse {
  success: boolean;
  validation: MnemonicValidation;
  error?: string;
}

export interface DerivationPathPreset {
  name: string;
  path: string;
  description: string;
}

export interface DerivationPresetsResponse {
  success: boolean;
  presets: Record<string, DerivationPathPreset>;
  error?: string;
}

export interface DerivedAddress {
  index: number;
  path: string;
  publicKey: string;
}

export interface DerivePreviewResponse {
  success: boolean;
  addresses: DerivedAddress[];
  error?: string;
}

export interface ImportMnemonicResponse {
  success: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}