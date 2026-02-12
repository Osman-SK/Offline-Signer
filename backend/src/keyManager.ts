import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as CryptoJS from 'crypto-js';
import * as bs58Module from 'bs58';

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
