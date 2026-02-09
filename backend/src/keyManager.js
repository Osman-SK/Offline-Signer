const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

const KEYS_DIR = path.join(__dirname, '../keys');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Generate a new keypair
 * @param {string} name - Name for the keypair
 * @param {string} password - Password to encrypt the keypair
 * @returns {object} - Keypair info with public key
 */
function generateKeypair(name, password) {
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
  const keyData = {
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
 * @param {string} name - Name for the keypair
 * @param {string} privateKey - Private key as JSON array or base58 string
 * @param {string} password - Password to encrypt the keypair
 * @returns {object} - Keypair info with public key
 */
function importKeypair(name, privateKey, password) {
  if (!name || !privateKey || !password) {
    throw new Error('Name, private key, and password are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' already exists`);
  }

  let secretKey;
  try {
    // Try parsing as JSON array
    secretKey = JSON.parse(privateKey);
    if (!Array.isArray(secretKey)) {
      throw new Error('Invalid key format');
    }
  } catch (e) {
    // Try as base58 (would need bs58 library)
    throw new Error('Private key must be a JSON array of numbers');
  }

  // Verify it's a valid keypair
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  // Encrypt the secret key
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(secretKey),
    password
  ).toString();

  // Save encrypted keypair
  const keyData = {
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
 * @param {string} name - Name of the keypair
 * @param {string} password - Password to decrypt the keypair
 * @returns {Keypair} - Solana Keypair object
 */
function loadKeypair(name, password) {
  if (!name || !password) {
    throw new Error('Name and password are required');
  }

  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  
  // Decrypt the secret key
  let decrypted;
  try {
    decrypted = CryptoJS.AES.decrypt(keyData.encryptedSecretKey, password);
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
 * @returns {Array} - Array of keypair info objects
 */
function listKeypairs() {
  if (!fs.existsSync(KEYS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(KEYS_DIR);
  const keypairs = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const keyPath = path.join(KEYS_DIR, file);
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
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
 * @param {string} name - Name of the keypair to delete
 */
function deleteKeypair(name) {
  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  fs.unlinkSync(keyPath);
}

/**
 * Get public key for a keypair
 * @param {string} name - Name of the keypair
 * @returns {string} - Public key (base58)
 */
function getPublicKey(name) {
  const keyPath = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Keypair '${name}' not found`);
  }

  const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  return keyData.publicKey;
}

module.exports = {
  generateKeypair,
  importKeypair,
  loadKeypair,
  listKeypairs,
  deleteKeypair,
  getPublicKey
};