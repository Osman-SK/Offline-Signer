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
 * @param password - Password to encrypt the keypair
 * @param passphrase - Optional BIP39 passphrase
 * @param preset - Derivation preset
 * @param customPath - Custom derivation path (if preset is 'custom')
 * @returns Keypair info with public key
 */
export declare function importFromMnemonic(name: string, mnemonic: string, accountIndex: number, password: string, passphrase?: string, preset?: string, customPath?: string): KeypairInfo;
export {};
//# sourceMappingURL=keyManager.d.ts.map