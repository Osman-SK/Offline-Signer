import { Keypair } from '@solana/web3.js';
/**
 * Keypair information (without sensitive data)
 */
interface KeypairInfo {
    name: string;
    publicKey: string;
    createdAt?: string;
    importedAt?: string;
}
/**
 * Generate a new keypair
 * @param name - Name for the keypair
 * @param password - Password to encrypt the keypair
 * @returns Keypair info with public key
 */
export declare function generateKeypair(name: string, password: string): KeypairInfo;
/**
 * Import an existing keypair
 * @param name - Name for the keypair
 * @param privateKey - Private key in specified format
 * @param password - Password to encrypt the keypair
 * @param format - Format of private key: 'base58' (default), 'base64', or 'json'
 * @returns Keypair info with public key
 */
export declare function importKeypair(name: string, privateKey: string, password: string, format?: 'base58' | 'base64' | 'json'): KeypairInfo;
/**
 * Load a keypair with password
 * @param name - Name of the keypair
 * @param password - Password to decrypt the keypair
 * @returns Solana Keypair object
 */
export declare function loadKeypair(name: string, password: string): Keypair;
/**
 * List all keypairs (without private keys)
 * @returns Array of keypair info objects
 */
export declare function listKeypairs(): KeypairInfo[];
/**
 * Delete a keypair
 * @param name - Name of the keypair to delete
 */
export declare function deleteKeypair(name: string): void;
/**
 * Get public key for a keypair
 * @param name - Name of the keypair
 * @returns Public key (base58)
 */
export declare function getPublicKey(name: string): string;
export {};
//# sourceMappingURL=keyManager.d.ts.map