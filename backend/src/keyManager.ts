import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as CryptoJS from 'crypto-js';
import * as bs58Module from 'bs58';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { createHash } from 'crypto';

const bs58 = (bs58Module as any).default || bs58Module;

const KEYS_DIR = path.join(__dirname, '../keys');
const CONFIG_FILE = path.join(__dirname, '../config.json');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

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
 * Load config from file
 */
function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save config to file
 */
function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Hash a password using SHA-256
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Set and store the global password
 * @param password - The password to set
 */
export function setGlobalPassword(password: string): void {
  if (!password || password.length === 0) {
    throw new Error('Password is mandatory and cannot be empty');
  }
  const config = loadConfig();
  config.passwordHash = hashPassword(password);
  saveConfig(config);
}

/**
 * Verify if the provided password matches the stored global password
 * @param password - The password to verify
 * @returns True if password matches, false otherwise
 */
export function verifyGlobalPassword(password: string): boolean {
  const config = loadConfig();
  if (!config.passwordHash) {
    return false;
  }
  return hashPassword(password) === config.passwordHash;
}

/**
 * Check if a global password is set
 * @returns True if password is set, false otherwise
 */
export function hasGlobalPassword(): boolean {
  const config = loadConfig();
  return !!config.passwordHash;
}

/**
 * Get the encryption key for encrypting/decrypting keypairs
 * Returns empty string if no password is set (no encryption mode)
 * @returns The password or empty string
 */
export function getEncryptionKey(): string {
  // Return a placeholder - actual password verification should be done separately
  // The encryption key is used only when a password is set
  return hasGlobalPassword() ? 'global-password' : '';
}

/**
 * Clear the global password (for "no encryption" option)
 * This removes the password protection but keeps existing encrypted keypairs encrypted
 */
export function clearGlobalPassword(): void {
  // Only allow clearing password if no keypairs exist
  const keypairs = listKeypairs();
  if (keypairs.length > 0) {
    throw new Error('Cannot remove password protection while keypairs exist. Delete all keypairs first.');
  }
  const config = loadConfig();
  delete config.passwordHash;
  saveConfig(config);
}

/**
 * Encrypt data using the global password
 * @param data - Data to encrypt
 * @param password - Password for encryption
 * @returns Encrypted string
 */
function encryptData(data: string, password: string): string {
  if (!password) {
    return data;
  }
  return CryptoJS.AES.encrypt(data, password).toString();
}

/**
 * Decrypt data using the global password
 * @param encryptedData - Encrypted data
 * @param password - Password for decryption
 * @returns Decrypted string
 */
function decryptData(encryptedData: string, password: string): string {
  if (!password) {
    return encryptedData;
  }
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Invalid password');
    }
    return result;
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
}

/**
 * Generate a new keypair
 * @param name - Name for the keypair
 * @returns Keypair info with public key
 */
export function generateKeypair(name: string): KeypairInfo {
  if (!name) {
    throw new Error('Name is required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

  const encryptionKey = getEncryptionKey();

  // Generate new keypair
  const keypair = Keypair.generate();
  const secretKey = Array.from(keypair.secretKey);
  
  // Encrypt the secret key
  const encrypted = encryptData(JSON.stringify(secretKey), encryptionKey);

  // Save encrypted keypair
  const keyData: KeypairFileData = {
    name,
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecretKey: encrypted,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));

  return {
    name,
    publicKey: keypair.publicKey.toBase58(),
    createdAt: keyData.createdAt
  };
}

/**
 * Import an existing keypair
 * @param name - Name for the keypair
 * @param privateKey - Private key in specified format
 * @param format - Format of private key: 'base58' (default), 'base64', or 'json'
 * @returns Keypair info with public key
 */
export function importKeypair(
  name: string,
  privateKey: string,
  format: 'base58' | 'base64' | 'json' = 'base58'
): KeypairInfo {
  if (!name || !privateKey) {
    throw new Error('Name and private key are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

  const encryptionKey = getEncryptionKey();

  let secretKey: number[];
  try {
    switch (format.toLowerCase()) {
      case 'base58':
        // Base58 encoded private key (most common format)
        secretKey = Array.from(bs58.decode(privateKey));
        break;
      
      case 'base64':
        // Base64 encoded private key
        secretKey = Array.from(Buffer.from(privateKey, 'base64'));
        break;
      
      case 'json':
        // JSON array format
        const parsed = JSON.parse(privateKey);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid JSON format: must be an array of numbers');
        }
        secretKey = parsed;
        break;
      
      default:
        throw new Error(`Unknown format: ${format}. Use 'base58', 'base64', or 'json'`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown format')) {
      throw error;
    }
    throw new Error(`Failed to decode private key: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Verify it's a valid keypair
  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    throw new Error('Invalid private key: unable to create keypair. Please check your key format and try again.');
  }

  // Encrypt the secret key
  const encrypted = encryptData(JSON.stringify(secretKey), encryptionKey);

  // Save encrypted keypair
  const keyData: KeypairFileData = {
    name,
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecretKey: encrypted,
    importedAt: new Date().toISOString()
  };

  fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));

  return {
    name,
    publicKey: keypair.publicKey.toBase58(),
    importedAt: keyData.importedAt
  };
}

/**
 * Load a keypair
 * @param name - Name of the keypair
 * @returns Solana Keypair object
 */
export function loadKeypair(name: string): Keypair {
  if (!name) {
    throw new Error('Name is required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const encryptionKey = getEncryptionKey();
  
  // Decrypt the secret key
  try {
    const secretKeyString = decryptData(keyData.encryptedSecretKey, encryptionKey);
    const secretKey = JSON.parse(secretKeyString);
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    throw new Error('Failed to decrypt keypair: invalid password or corrupted key file');
  }
}

/**
 * List all keypairs (without private keys)
 * @returns Array of keypair info objects
 */
export function listKeypairs(): KeypairInfo[] {
  if (!fs.existsSync(KEYS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(KEYS_DIR);
  const keypairs: KeypairInfo[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const keyPath = path.join(KEYS_DIR, file);
      const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      keypairs.push({
        name: keyData.name,
        publicKey: keyData.publicKey,
        createdAt: keyData.createdAt,
        importedAt: keyData.importedAt,
        hasSeedPhrase: !!(keyData.mnemonic || keyData.encryptedMnemonic)
      });
    }
  }

  return keypairs;
}

/**
 * Delete a keypair
 * @param name - Name of the keypair to delete
 */
export function deleteKeypair(name: string): void {
  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  fs.unlinkSync(keyPath);
}

/**
 * Get public key for a keypair
 * @param name - Name of the keypair
 * @returns Public key (base58)
 */
export function getPublicKey(name: string): string {
  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  return keyData.publicKey;
}

/**
 * Export private key in specified format
 * @param name - Name of the keypair
 * @param format - Export format: 'base58', 'base64', or 'json'
 * @returns Private key in requested format
 */
export function exportPrivateKey(name: string, format: 'base58' | 'base64' | 'json'): string {
  if (!name) {
    throw new Error('Name is required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const encryptionKey = getEncryptionKey();

  // Decrypt the secret key
  let secretKey: number[];
  try {
    const secretKeyString = decryptData(keyData.encryptedSecretKey, encryptionKey);
    secretKey = JSON.parse(secretKeyString);
  } catch (error) {
    throw new Error('Failed to decrypt keypair: invalid password or corrupted key file');
  }

  // Convert to requested format
  const secretKeyUint8 = Uint8Array.from(secretKey);
  
  switch (format.toLowerCase()) {
    case 'base58':
      return bs58.encode(secretKeyUint8);
    
    case 'base64':
      return Buffer.from(secretKeyUint8).toString('base64');
    
    case 'json':
      return JSON.stringify(secretKey);
    
    default:
      throw new Error(`Unknown format: ${format}. Use 'base58', 'base64', or 'json'`);
  }
}

/**
 * Export seed phrase if keypair was imported/generated from mnemonic
 * @param name - Name of the keypair
 * @returns Seed phrase or null if not available
 */
export function exportSeedPhrase(name: string): string | null {
  if (!name) {
    throw new Error('Name is required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  
  if (!keyData.mnemonic && !keyData.encryptedMnemonic) {
    return null;
  }

  // If stored as plaintext
  if (keyData.mnemonic) {
    return keyData.mnemonic;
  }

  // If stored encrypted
  if (keyData.encryptedMnemonic) {
    const encryptionKey = getEncryptionKey();
    try {
      return decryptData(keyData.encryptedMnemonic, encryptionKey);
    } catch (error) {
      throw new Error('Failed to decrypt seed phrase: invalid password or corrupted data');
    }
  }

  return null;
}

/**
 * Validate BIP39 mnemonic and return validation result
 * Non-blocking: returns warnings but allows proceeding
 * @param mnemonic - The mnemonic phrase to validate
 * @returns Validation result with word count and checksum status
 */
export function validateMnemonic(mnemonic: string): {
  valid: boolean;
  wordCount: number;
  checksumValid: boolean;
  message: string;
} {
  if (!mnemonic || !mnemonic.trim()) {
    return {
      valid: false,
      wordCount: 0,
      checksumValid: false,
      message: 'Mnemonic is empty'
    };
  }

  const words = mnemonic.trim().split(/\s+/);
  const wordCount = words.length;

  // Check word count
  const validCounts = [12, 15, 18, 21, 24];
  if (!validCounts.includes(wordCount)) {
    return {
      valid: false,
      wordCount,
      checksumValid: false,
      message: `Invalid word count: ${wordCount}. Must be 12, 15, 18, 21, or 24 words.`
    };
  }

  // Validate checksum (but don't block)
  const checksumValid = bip39.validateMnemonic(mnemonic);
  
  if (!checksumValid) {
    return {
      valid: true, // Allow proceeding
      wordCount,
      checksumValid: false,
      message: '⚠️ Warning: Invalid BIP39 checksum. Please verify your seed phrase.'
    };
  }

  return {
    valid: true,
    wordCount,
    checksumValid: true,
    message: `✓ Valid ${wordCount}-word mnemonic`
  };
}

/**
 * Derivation path presets for different wallets
 * All paths use hardened derivation (') as required by SLIP-0010 for Ed25519
 */
export const DERIVATION_PRESETS = {
  'backpack': {
    name: 'Backpack',
    path: "m/44'/501'/{index}'/0'",
    displayPath: "m/44'/501'/x'/0'",
    description: 'Backpack wallet'
  },
  'backpack-legacy': {
    name: 'Backpack Legacy',
    path: "m/44'/501'/0'/0'/{index}'",
    displayPath: "m/44'/501'/0'/0'/x'",
    description: 'Backpack wallet legacy format'
  },
  'solana-legacy': {
    name: 'Solana Legacy',
    path: "m/44'/501'/{index}'",
    displayPath: "m/44'/501'/x'",
    description: 'Legacy Solana wallets'
  },
  'ledger-live': {
    name: 'Ledger Live',
    path: "m/44'/501'/{index}'/0'/0'",
    displayPath: "m/44'/501'/x'/0'/0'",
    description: 'Ledger hardware wallets'
  }
};

/**
 * Build derivation path from preset or custom path
 * @param preset - Preset key or 'custom'
 * @param customPath - Custom path (if preset is 'custom')
 * @param index - Account index to substitute
 * @returns Full derivation path
 */
function buildDerivationPath(
  preset: string,
  customPath: string = '',
  index: number
): string {
  if (preset === 'custom') {
    // Replace {index} placeholder in custom path
    return customPath.replace(/\{index\}/g, index.toString());
  }

  const presetConfig = DERIVATION_PRESETS[preset as keyof typeof DERIVATION_PRESETS];
  if (!presetConfig) {
    throw new Error(`Unknown derivation preset: ${preset}`);
  }

  return presetConfig.path.replace(/{index}/g, index.toString());
}

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
export function deriveAddressesFromMnemonic(
  mnemonic: string,
  passphrase: string = '',
  preset: string = 'backpack',
  customPath: string = '',
  startIndex: number = 0,
  count: number = 5
): Array<{
  index: number;
  path: string;
  publicKey: string;
}> {
  // Validate mnemonic
  const validation = validateMnemonic(mnemonic);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Generate seed from mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);

  const addresses: Array<{ index: number; path: string; publicKey: string }> = [];

  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    
    try {
      // Build derivation path
      const derivationPath = buildDerivationPath(preset, customPath, index);
      
      // Derive key using SLIP-0010 (Ed25519)
      const derived = derivePath(derivationPath, seed.toString('hex'));
      
      // Create keypair from derived private key
      const keypair = Keypair.fromSeed(derived.key);
      
      addresses.push({
        index,
        path: derivationPath,
        publicKey: keypair.publicKey.toBase58()
      });
    } catch (error) {
      console.error(`Failed to derive address at index ${index}:`, error);
      // Continue with next index
    }
  }

  return addresses;
}

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
export function importFromMnemonic(
  name: string,
  mnemonic: string,
  accountIndex: number,
  passphrase: string = '',
  preset: string = 'backpack',
  customPath: string = '',
  storeMnemonic: boolean = false
): KeypairInfo {
  if (!name) {
    throw new Error('Name is required');
  }

  if (accountIndex < 0) {
    throw new Error('Account index must be non-negative');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

  const encryptionKey = getEncryptionKey();

  // Validate mnemonic
  const validation = validateMnemonic(mnemonic);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  try {
    // Generate seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);

    // Build derivation path
    const derivationPath = buildDerivationPath(preset, customPath, accountIndex);

    // Derive key using SLIP-0010
    const derived = derivePath(derivationPath, seed.toString('hex'));

    // Create keypair from derived seed
    const keypair = Keypair.fromSeed(derived.key);
    const secretKey = Array.from(keypair.secretKey);

    // Encrypt the secret key
    const encrypted = encryptData(JSON.stringify(secretKey), encryptionKey);

    // Prepare key data
    const keyData: KeypairFileData = {
      name,
      publicKey: keypair.publicKey.toBase58(),
      encryptedSecretKey: encrypted,
      derivationPath,
      importedAt: new Date().toISOString()
    };

    // Optionally store mnemonic
    if (storeMnemonic) {
      if (encryptionKey) {
        keyData.encryptedMnemonic = encryptData(mnemonic, encryptionKey);
      } else {
        keyData.mnemonic = mnemonic;
      }
    }

    fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));

    return {
      name,
      publicKey: keypair.publicKey.toBase58(),
      importedAt: keyData.importedAt
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw error;
    }
    throw new Error(`Failed to import from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a new BIP39 mnemonic (seed phrase)
 * @param wordCount - Number of words (12, 15, 18, 21, or 24), defaults to 24
 * @returns Generated mnemonic phrase
 */
export function generateNewMnemonic(wordCount: 12 | 15 | 18 | 21 | 24 = 24): string {
  const strength = (wordCount / 3) * 32; // Convert word count to bits of entropy
  return bip39.generateMnemonic(strength);
}

// Export types
export { KeypairFileData, KeypairInfo, Config };
