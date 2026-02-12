import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as CryptoJS from 'crypto-js';
import * as bs58Module from 'bs58';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

const bs58 = (bs58Module as any).default || bs58Module;

const KEYS_DIR = path.join(__dirname, '../keys');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Keypair file data structure
 */
interface KeypairFileData {
  name: string;
  publicKey: string;
  encryptedSecretKey: string;
  createdAt?: string;
  importedAt?: string;
}

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
export function generateKeypair(name: string, password: string): KeypairInfo {
  if (!name || !password) {
    throw new Error('Name and password are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

  // Generate new keypair
  const keypair = Keypair.generate();
  const secretKey = Array.from(keypair.secretKey);
  
  // Encrypt the secret key
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(secretKey),
    password
  ).toString();

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
 * @param password - Password to encrypt the keypair
 * @param format - Format of private key: 'base58' (default), 'base64', or 'json'
 * @returns Keypair info with public key
 */
export function importKeypair(
  name: string,
  privateKey: string,
  password: string,
  format: 'base58' | 'base64' | 'json' = 'base58'
): KeypairInfo {
  if (!name || !privateKey || !password) {
    throw new Error('Name, private key, and password are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

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
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(secretKey),
    password
  ).toString();

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
 * Load a keypair with password
 * @param name - Name of the keypair
 * @param password - Password to decrypt the keypair
 * @returns Solana Keypair object
 */
export function loadKeypair(name: string, password: string): Keypair {
  if (!name || !password) {
    throw new Error('Name and password are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData: KeypairFileData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  
  // Decrypt the secret key
  try {
    const decrypted = CryptoJS.AES.decrypt(keyData.encryptedSecretKey, password);
    const secretKeyString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!secretKeyString) {
      throw new Error('Invalid password');
    }
    const secretKey = JSON.parse(secretKeyString);
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    throw new Error('Invalid password or corrupted key file');
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
        importedAt: keyData.importedAt
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
 * @param password - Password to encrypt the keypair
 * @param passphrase - Optional BIP39 passphrase
 * @param preset - Derivation preset
 * @param customPath - Custom derivation path (if preset is 'custom')
 * @returns Keypair info with public key
 */
export function importFromMnemonic(
  name: string,
  mnemonic: string,
  accountIndex: number,
  password: string,
  passphrase: string = '',
  preset: string = 'backpack',
  customPath: string = ''
): KeypairInfo {
  if (!name || !password) {
    throw new Error('Name and password are required');
  }

  if (accountIndex < 0) {
    throw new Error('Account index must be non-negative');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

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
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(secretKey),
      password
    ).toString();

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
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw error;
    }
    throw new Error(`Failed to import from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
  }
}
