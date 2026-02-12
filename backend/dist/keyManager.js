"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeypair = generateKeypair;
exports.importKeypair = importKeypair;
exports.loadKeypair = loadKeypair;
exports.listKeypairs = listKeypairs;
exports.deleteKeypair = deleteKeypair;
exports.getPublicKey = getPublicKey;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CryptoJS = __importStar(require("crypto-js"));
const bs58Module = __importStar(require("bs58"));
const bs58 = bs58Module.default || bs58Module;
const KEYS_DIR = path.join(__dirname, '../keys');
// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}
/**
 * Generate a new keypair
 * @param name - Name for the keypair
 * @param password - Password to encrypt the keypair
 * @returns Keypair info with public key
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
    const keypair = web3_js_1.Keypair.generate();
    const secretKey = Array.from(keypair.secretKey);
    // Encrypt the secret key
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(secretKey), password).toString();
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
 * @param name - Name for the keypair
 * @param privateKey - Private key in specified format
 * @param password - Password to encrypt the keypair
 * @param format - Format of private key: 'base58' (default), 'base64', or 'json'
 * @returns Keypair info with public key
 */
function importKeypair(name, privateKey, password, format = 'base58') {
    if (!name || !privateKey || !password) {
        throw new Error('Name, private key, and password are required');
    }
    const keyPath = path.join(KEYS_DIR, `${name}.json`);
    if (fs.existsSync(keyPath)) {
        throw new Error(`Keypair '${name}' already exists`);
    }
    let secretKey;
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
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Unknown format')) {
            throw error;
        }
        throw new Error(`Failed to decode private key: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Verify it's a valid keypair
    let keypair;
    try {
        keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
    }
    catch (error) {
        throw new Error('Invalid private key: unable to create keypair. Please check your key format and try again.');
    }
    // Encrypt the secret key
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(secretKey), password).toString();
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
 * @param name - Name of the keypair
 * @param password - Password to decrypt the keypair
 * @returns Solana Keypair object
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
    try {
        const decrypted = CryptoJS.AES.decrypt(keyData.encryptedSecretKey, password);
        const secretKeyString = decrypted.toString(CryptoJS.enc.Utf8);
        if (!secretKeyString) {
            throw new Error('Invalid password');
        }
        const secretKey = JSON.parse(secretKeyString);
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
    }
    catch (error) {
        throw new Error('Invalid password or corrupted key file');
    }
}
/**
 * List all keypairs (without private keys)
 * @returns Array of keypair info objects
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
 * @param name - Name of the keypair to delete
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
 * @param name - Name of the keypair
 * @returns Public key (base58)
 */
function getPublicKey(name) {
    const keyPath = path.join(KEYS_DIR, `${name}.json`);
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Keypair '${name}' not found`);
    }
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    return keyData.publicKey;
}
//# sourceMappingURL=keyManager.js.map