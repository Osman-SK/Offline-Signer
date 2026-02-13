"use strict";
/**
 * Tests for keyManager module
 * Tests keypair generation, import, loading, listing, and deletion
 */
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3_js_1 = require("@solana/web3.js");
const keyManager = __importStar(require("../keyManager"));
// Test data
const TEST_PASSWORD = 'test-password-123';
const TEST_KEYPAIR_NAME = 'test-keypair-1';
const TEST_PRIVATE_KEY_BASE58 = '5sinxM3PVEzRGSqfdZ4HM1B8M4TQg26onCqBUMoUN97jByHEgWTEeGZtbnM1PWuh6vpX6rLZrphyyigwe5p4wvos';
const EXPECTED_PUBLIC_KEY = 'BhJpHMEGBWo1fJusPTjqhZKmvM2ZNyRj712kWiVq9Gc9';
describe('keyManager', () => {
    // Clean up before each test
    beforeEach(() => {
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist, that's fine
        }
    });
    afterEach(() => {
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist, that's fine
        }
    });
    describe('generateKeypair', () => {
        it('should generate a new keypair successfully', () => {
            const result = keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            expect(result).toBeDefined();
            expect(result.name).toBe(TEST_KEYPAIR_NAME);
            expect(result.publicKey).toBeDefined();
            expect(result.publicKey.length).toBeGreaterThan(0);
            expect(result.createdAt).toBeDefined();
        });
        it('should throw error if name is missing', () => {
            expect(() => {
                keyManager.generateKeypair('', TEST_PASSWORD);
            }).toThrow('Name and password are required');
        });
        it('should throw error if password is missing', () => {
            expect(() => {
                keyManager.generateKeypair(TEST_KEYPAIR_NAME, '');
            }).toThrow('Name and password are required');
        });
        it('should throw error if keypair already exists', () => {
            // Create first keypair
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            // Try to create another with same name
            expect(() => {
                keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            }).toThrow(`Keypair '${TEST_KEYPAIR_NAME}' already exists`);
        });
        it('should create a file in keys directory', () => {
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            const keyPath = path.join(__dirname, '../../keys', `${TEST_KEYPAIR_NAME}.json`);
            expect(fs.existsSync(keyPath)).toBe(true);
            const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
            expect(keyData.name).toBe(TEST_KEYPAIR_NAME);
            expect(keyData.publicKey).toBeDefined();
            expect(keyData.encryptedSecretKey).toBeDefined();
        });
    });
    describe('importKeypair', () => {
        it('should import keypair from base58 format', () => {
            const result = keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD, 'base58');
            expect(result).toBeDefined();
            expect(result.name).toBe(TEST_KEYPAIR_NAME);
            expect(result.publicKey).toBe(EXPECTED_PUBLIC_KEY);
            expect(result.importedAt).toBeDefined();
        });
        it('should import keypair from base64 format', () => {
            const keypair = web3_js_1.Keypair.generate();
            const secretKey = Buffer.from(keypair.secretKey).toString('base64');
            const result = keyManager.importKeypair(TEST_KEYPAIR_NAME, secretKey, TEST_PASSWORD, 'base64');
            expect(result).toBeDefined();
            expect(result.name).toBe(TEST_KEYPAIR_NAME);
            expect(result.publicKey).toBe(keypair.publicKey.toBase58());
        });
        it('should import keypair from JSON format', () => {
            const keypair = web3_js_1.Keypair.generate();
            const secretKey = JSON.stringify(Array.from(keypair.secretKey));
            const result = keyManager.importKeypair(TEST_KEYPAIR_NAME, secretKey, TEST_PASSWORD, 'json');
            expect(result).toBeDefined();
            expect(result.name).toBe(TEST_KEYPAIR_NAME);
            expect(result.publicKey).toBe(keypair.publicKey.toBase58());
        });
        it('should default to base58 format', () => {
            const result = keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD);
            expect(result.publicKey).toBe(EXPECTED_PUBLIC_KEY);
        });
        it('should throw error if name is missing', () => {
            expect(() => {
                keyManager.importKeypair('', TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD);
            }).toThrow('Name, private key, and password are required');
        });
        it('should throw error if private key is missing', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, '', TEST_PASSWORD);
            }).toThrow('Name, private key, and password are required');
        });
        it('should throw error if password is missing', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, '');
            }).toThrow('Name, private key, and password are required');
        });
        it('should throw error if keypair already exists', () => {
            keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD, 'base58');
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD, 'base58');
            }).toThrow(`Keypair '${TEST_KEYPAIR_NAME}' already exists`);
        });
        it('should throw error for invalid base58 key', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, 'invalid-base58', TEST_PASSWORD, 'base58');
            }).toThrow();
        });
        it('should throw error for invalid JSON format', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, 'not-valid-json', TEST_PASSWORD, 'json');
            }).toThrow();
        });
        it('should throw error for non-array JSON', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, '{"key": "value"}', TEST_PASSWORD, 'json');
            }).toThrow();
        });
        it('should throw error for unknown format', () => {
            expect(() => {
                keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD, 'unknown');
            }).toThrow("Unknown format: unknown");
        });
    });
    describe('loadKeypair', () => {
        beforeEach(() => {
            keyManager.importKeypair(TEST_KEYPAIR_NAME, TEST_PRIVATE_KEY_BASE58, TEST_PASSWORD, 'base58');
        });
        it('should load keypair with correct password', () => {
            const keypair = keyManager.loadKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            expect(keypair).toBeDefined();
            expect(keypair.publicKey.toBase58()).toBe(EXPECTED_PUBLIC_KEY);
        });
        it('should throw error with incorrect password', () => {
            expect(() => {
                keyManager.loadKeypair(TEST_KEYPAIR_NAME, 'wrong-password');
            }).toThrow('Invalid password or corrupted key file');
        });
        it('should throw error if name is missing', () => {
            expect(() => {
                keyManager.loadKeypair('', TEST_PASSWORD);
            }).toThrow('Name and password are required');
        });
        it('should throw error if password is missing', () => {
            expect(() => {
                keyManager.loadKeypair(TEST_KEYPAIR_NAME, '');
            }).toThrow('Name and password are required');
        });
        it('should throw error if keypair does not exist', () => {
            expect(() => {
                keyManager.loadKeypair('non-existent-keypair', TEST_PASSWORD);
            }).toThrow("Keypair 'non-existent-keypair' not found");
        });
    });
    describe('listKeypairs', () => {
        it('should return empty array when no keypairs exist', () => {
            const keypairs = keyManager.listKeypairs();
            // Filter out any test keypairs from other tests
            const testKeypairs = keypairs.filter(k => k.name === TEST_KEYPAIR_NAME);
            expect(testKeypairs.length).toBe(0);
        });
        it('should return array of keypairs when they exist', () => {
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            const keypairs = keyManager.listKeypairs();
            const found = keypairs.find(k => k.name === TEST_KEYPAIR_NAME);
            expect(found).toBeDefined();
            expect(found?.name).toBe(TEST_KEYPAIR_NAME);
            expect(found?.publicKey).toBeDefined();
            expect(found?.createdAt).toBeDefined();
        });
        it('should not include encrypted secret keys in list', () => {
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            const keypairs = keyManager.listKeypairs();
            const found = keypairs.find(k => k.name === TEST_KEYPAIR_NAME);
            expect(found).toBeDefined();
            expect(found.encryptedSecretKey).toBeUndefined();
        });
    });
    describe('deleteKeypair', () => {
        beforeEach(() => {
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
        });
        it('should delete existing keypair', () => {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
            const keypairs = keyManager.listKeypairs();
            const found = keypairs.find(k => k.name === TEST_KEYPAIR_NAME);
            expect(found).toBeUndefined();
        });
        it('should throw error if keypair does not exist', () => {
            expect(() => {
                keyManager.deleteKeypair('non-existent-keypair');
            }).toThrow("Keypair 'non-existent-keypair' not found");
        });
    });
    describe('getPublicKey', () => {
        beforeEach(() => {
            keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
        });
        it('should return public key for existing keypair', () => {
            const publicKey = keyManager.getPublicKey(TEST_KEYPAIR_NAME);
            expect(publicKey).toBeDefined();
            expect(publicKey.length).toBeGreaterThan(0);
        });
        it('should throw error if keypair does not exist', () => {
            expect(() => {
                keyManager.getPublicKey('non-existent-keypair');
            }).toThrow("Keypair 'non-existent-keypair' not found");
        });
    });
});
//# sourceMappingURL=keyManager.test.js.map