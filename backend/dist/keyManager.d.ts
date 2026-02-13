import { Keypair } from '@solana/web3.js';
/**
 * Config file structure
 */
interface Config {
    passwordHash?: string;
}
/**
 * Keypair file data structure
 */
interface KeypairFileData {
    name: string;
    publicKey: string;
    encryptedSecretKey: string;
    mnemonic?: string;
    encryptedMnemonic?: string;
    createdAt?: string;
    importedAt?: string;
    derivationPath?: string;
}
/**
 * Keypair information (without sensitive data)
 */
interface KeypairInfo {
    name: string;
    publicKey: string;
    createdAt?: string;
    importedAt?: string;
    hasSeedPhrase?: boolean;
}
/**
 * Set and store the global password
 * @param password - The password to set
 */
export declare function setGlobalPassword(password: string): void;
/**
 * Verify if the provided password matches the stored global password
 * @param password - The password to verify
 * @returns True if password matches, false otherwise
 */
export declare function verifyGlobalPassword(password: string): boolean;
/**
 * Check if a global password is set
 * @returns True if password is set, false otherwise
 */
export declare function hasGlobalPassword(): boolean;
/**
 * Get the encryption key for encrypting/decrypting keypairs
 * Returns empty string if no password is set (no encryption mode)
 * @returns The password or empty string
 */
export declare function getEncryptionKey(): string;
/**
 * Clear the global password (for "no encryption" option)
 * This removes the password protection but keeps existing encrypted keypairs encrypted
 */
export declare function clearGlobalPassword(): void;
/**
 * Generate a new keypair
 * @param name - Name for the keypair
 * @returns Keypair info with public key
 */
export declare function generateKeypair(name: string): KeypairInfo;
/**
 * Import an existing keypair
 * @param name - Name for the keypair
 * @param privateKey - Private key in specified format
 * @param format - Format of private key: 'base58' (default), 'base64', or 'json'
 * @returns Keypair info with public key
 */
export declare function importKeypair(name: string, privateKey: string, format?: 'base58' | 'base64' | 'json'): KeypairInfo;
/**
 * Load a keypair
 * @param name - Name of the keypair
 * @returns Solana Keypair object
 */
export declare function loadKeypair(name: string): Keypair;
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
/**
 * Export private key in specified format
 * @param name - Name of the keypair
 * @param format - Export format: 'base58', 'base64', or 'json'
 * @returns Private key in requested format
 */
export declare function exportPrivateKey(name: string, format: 'base58' | 'base64' | 'json'): string;
/**
 * Export seed phrase if keypair was imported/generated from mnemonic
 * @param name - Name of the keypair
 * @returns Seed phrase or null if not available
 */
export declare function exportSeedPhrase(name: string): string | null;
/**
 * Validate BIP39 mnemonic and return validation result
 * Non-blocking: returns warnings but allows proceeding
 * @param mnemonic - The mnemonic phrase to validate
 * @returns Validation result with word count and checksum status
 */
export declare function validateMnemonic(mnemonic: string): {
    valid: boolean;
    wordCount: number;
    checksumValid: boolean;
    message: string;
};
/**
 * Derivation path presets for different wallets
 * All paths use hardened derivation (') as required by SLIP-0010 for Ed25519
 */
export declare const DERIVATION_PRESETS: {
    backpack: {
        name: string;
        path: string;
        displayPath: string;
        description: string;
    };
    'backpack-legacy': {
        name: string;
        path: string;
        displayPath: string;
        description: string;
    };
    'solana-legacy': {
        name: string;
        path: string;
        displayPath: string;
        description: string;
    };
    'ledger-live': {
        name: string;
        path: string;
        displayPath: string;
        description: string;
    };
};
/**
 * Derive addresses from BIP39 mnemonic
 * @param mnemonic - BIP39 mnemonic phrase
 * @param passphrase - Optional BIP39 passphrase
 * @param preset - Derivation preset ('solana-standard', 'ledger-live', 'phantom-legacy', or 'custom')
 * @param customPath - Custom derivation path (if preset is 'custom')
 * @param startIndex - Starting account index
 * @param count - Number of addresses to derive
 * @returns Array of derived addresses with index, path, and public key
 */
export declare function deriveAddressesFromMnemonic(mnemonic: string, passphrase?: string, preset?: string, customPath?: string, startIndex?: number, count?: number): Array<{
    index: number;
    path: string;
    publicKey: string;
}>;
/**
 * Import a keypair derived from BIP39 mnemonic
 * @param name - Name for the keypair
 * @param mnemonic - BIP39 mnemonic phrase
 * @param accountIndex - Account index to derive
 * @param passphrase - Optional BIP39 passphrase
 * @param preset - Derivation preset
 * @param customPath - Custom derivation path (if preset is 'custom')
 * @param storeMnemonic - Whether to store the mnemonic (encrypted) for future export
 * @returns Keypair info with public key
 */
export declare function importFromMnemonic(name: string, mnemonic: string, accountIndex: number, passphrase?: string, preset?: string, customPath?: string, storeMnemonic?: boolean): KeypairInfo;
/**
 * Generate a new BIP39 mnemonic (seed phrase)
 * @param wordCount - Number of words (12, 15, 18, 21, or 24), defaults to 24
 * @returns Generated mnemonic phrase
 */
export declare function generateNewMnemonic(wordCount?: 12 | 15 | 18 | 21 | 24): string;
export { KeypairFileData, KeypairInfo, Config };
//# sourceMappingURL=keyManager.d.ts.map