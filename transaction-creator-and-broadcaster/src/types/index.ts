/**
 * Shared TypeScript type definitions for Transaction Creator & Broadcaster
 */

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Unsigned transaction file format (output to be signed offline)
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
 * Signed transaction file format (from offline signer)
 */
export interface SignedTransaction {
  signature: string;
  publicKey: string;
  signedAt: string;
  network: string;
  description: string;
}

/**
 * Nonce account information (saved after creation)
 */
export interface NonceAccountInfo {
  address: string;
  authority: string;
  savedAt: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface TabProps {
  network: 'mainnet' | 'devnet' | 'testnet';
}

export interface StatusMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}
