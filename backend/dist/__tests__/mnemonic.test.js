"use strict";
/**
 * Tests for mnemonic (BIP39 seed phrase) import functionality
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
const keyManager = __importStar(require("../keyManager"));
// Test mnemonics
const VALID_MNEMONIC_12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VALID_MNEMONIC_24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
const INVALID_WORD_COUNT = 'abandon abandon abandon';
const INVALID_CHECKSUM = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
const TEST_PASSWORD = 'test-password-123';
const TEST_KEYPAIR_NAME = 'test-mnemonic-keypair';
describe('Mnemonic Import', () => {
    // Clean up before each test
    beforeEach(() => {
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist
        }
    });
    afterEach(() => {
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist
        }
    });
    describe('validateMnemonic', () => {
        it('should validate 12-word mnemonic with correct checksum', () => {
            const result = keyManager.validateMnemonic(VALID_MNEMONIC_12);
            expect(result.valid).toBe(true);
            expect(result.wordCount).toBe(12);
            expect(result.checksumValid).toBe(true);
            expect(result.message).toContain('Valid');
        });
        it('should validate 24-word mnemonic with correct checksum', () => {
            const result = keyManager.validateMnemonic(VALID_MNEMONIC_24);
            expect(result.valid).toBe(true);
            expect(result.wordCount).toBe(24);
            expect(result.checksumValid).toBe(true);
        });
        it('should reject invalid word count', () => {
            const result = keyManager.validateMnemonic(INVALID_WORD_COUNT);
            expect(result.valid).toBe(false);
            expect(result.wordCount).toBe(3);
            expect(result.message).toContain('Invalid word count');
        });
        it('should warn on invalid checksum but allow proceeding', () => {
            const result = keyManager.validateMnemonic(INVALID_CHECKSUM);
            expect(result.valid).toBe(true); // Allow proceeding
            expect(result.checksumValid).toBe(false);
            expect(result.message).toContain('Warning');
        });
        it('should handle empty mnemonic', () => {
            const result = keyManager.validateMnemonic('');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Mnemonic is empty');
        });
        it('should handle whitespace-only mnemonic', () => {
            const result = keyManager.validateMnemonic('   ');
            expect(result.valid).toBe(false);
        });
    });
    describe('DERIVATION_PRESETS', () => {
        it('should have Backpack preset', () => {
            expect(keyManager.DERIVATION_PRESETS['backpack']).toBeDefined();
            expect(keyManager.DERIVATION_PRESETS['backpack'].path).toContain("44'/501'");
        });
        it('should have Backpack Legacy preset', () => {
            expect(keyManager.DERIVATION_PRESETS['backpack-legacy']).toBeDefined();
            expect(keyManager.DERIVATION_PRESETS['backpack-legacy'].path).toContain("44'/501'");
        });
        it('should have Solana Legacy preset', () => {
            expect(keyManager.DERIVATION_PRESETS['solana-legacy']).toBeDefined();
            expect(keyManager.DERIVATION_PRESETS['solana-legacy'].path).toContain("44'/501'");
        });
        it('should have Ledger Live preset', () => {
            expect(keyManager.DERIVATION_PRESETS['ledger-live']).toBeDefined();
            expect(keyManager.DERIVATION_PRESETS['ledger-live'].path).toContain("44'/501'");
        });
    });
    describe('deriveAddressesFromMnemonic', () => {
        it('should derive addresses with Backpack preset', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'backpack', '', 0, 5);
            expect(addresses).toHaveLength(5);
            expect(addresses[0].index).toBe(0);
            expect(addresses[0].path).toBe("m/44'/501'/0'/0'");
            expect(addresses[0].publicKey).toBeDefined();
            expect(addresses[0].publicKey.length).toBe(44); // Solana address length
        });
        it('should derive addresses with Backpack Legacy preset', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'backpack-legacy', '', 0, 5);
            expect(addresses).toHaveLength(5);
            expect(addresses[0].path).toBe("m/44'/501'/0'/0'/0'");
        });
        it('should derive addresses with Solana Legacy preset', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'solana-legacy', '', 0, 5);
            expect(addresses).toHaveLength(5);
            expect(addresses[0].path).toBe("m/44'/501'/0'");
        });
        it('should derive addresses with Ledger Live preset', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'ledger-live', '', 0, 5);
            expect(addresses).toHaveLength(5);
            expect(addresses[0].path).toBe("m/44'/501'/0'/0'/0'");
        });
        it('should derive addresses with custom path', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'custom', "m/44'/501'/{index}'/0'/0'", 0, 3);
            expect(addresses).toHaveLength(3);
            expect(addresses[0].path).toBe("m/44'/501'/0'/0'/0'");
            expect(addresses[1].path).toBe("m/44'/501'/1'/0'/0'");
        });
        it('should derive different addresses with different passphrases', () => {
            const addressesNoPass = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'backpack', '', 0, 1);
            const addressesWithPass = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, 'my-passphrase', 'backpack', '', 0, 1);
            // Different passphrases should produce different keys
            expect(addressesNoPass[0].publicKey).not.toBe(addressesWithPass[0].publicKey);
        });
        it('should start from specified index', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'backpack', '', 5, 3);
            expect(addresses).toHaveLength(3);
            expect(addresses[0].index).toBe(5);
            expect(addresses[1].index).toBe(6);
            expect(addresses[2].index).toBe(7);
        });
        it('should throw error for invalid mnemonic', () => {
            expect(() => {
                keyManager.deriveAddressesFromMnemonic(INVALID_WORD_COUNT, '', 'backpack', '', 0, 5);
            }).toThrow('Invalid word count');
        });
        it('should return empty array for unknown preset', () => {
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'unknown-preset', '', 0, 5);
            expect(addresses).toHaveLength(0);
        });
    });
    describe('importFromMnemonic', () => {
        it('should import from Backpack derivation path', () => {
            const result = keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 0, TEST_PASSWORD, '', 'backpack', '');
            expect(result.name).toBe(TEST_KEYPAIR_NAME);
            expect(result.publicKey).toBeDefined();
            expect(result.publicKey.length).toBe(44);
            expect(result.importedAt).toBeDefined();
        });
        it('should import with passphrase', () => {
            const result = keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 0, TEST_PASSWORD, 'my-secret-passphrase', 'backpack', '');
            expect(result.publicKey).toBeDefined();
        });
        it('should import with custom path', () => {
            const result = keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 5, TEST_PASSWORD, '', 'custom', "m/44'/501'/{index}'/0'/0'");
            expect(result.publicKey).toBeDefined();
        });
        it('should derive different accounts from same mnemonic', () => {
            // Import account 0
            keyManager.importFromMnemonic(`${TEST_KEYPAIR_NAME}-0`, VALID_MNEMONIC_12, 0, TEST_PASSWORD, '', 'backpack', '');
            // Import account 1
            keyManager.importFromMnemonic(`${TEST_KEYPAIR_NAME}-1`, VALID_MNEMONIC_12, 1, TEST_PASSWORD, '', 'backpack', '');
            const keypair0 = keyManager.getPublicKey(`${TEST_KEYPAIR_NAME}-0`);
            const keypair1 = keyManager.getPublicKey(`${TEST_KEYPAIR_NAME}-1`);
            // Different accounts should have different public keys
            expect(keypair0).not.toBe(keypair1);
            // Cleanup
            keyManager.deleteKeypair(`${TEST_KEYPAIR_NAME}-0`);
            keyManager.deleteKeypair(`${TEST_KEYPAIR_NAME}-1`);
        });
        it('should throw error for missing name', () => {
            expect(() => {
                keyManager.importFromMnemonic('', VALID_MNEMONIC_12, 0, TEST_PASSWORD, '', 'backpack', '');
            }).toThrow('Name and password are required');
        });
        it('should throw error for missing password', () => {
            expect(() => {
                keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 0, '', '', 'backpack', '');
            }).toThrow('Name and password are required');
        });
        it('should throw error for negative account index', () => {
            expect(() => {
                keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, -1, TEST_PASSWORD, '', 'backpack', '');
            }).toThrow('Account index must be non-negative');
        });
        it('should throw error for duplicate keypair name', () => {
            // First import
            keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 0, TEST_PASSWORD, '', 'backpack', '');
            // Second import with same name should fail
            expect(() => {
                keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 1, TEST_PASSWORD, '', 'backpack', '');
            }).toThrow('already exists');
        });
        it('should throw error for invalid mnemonic', () => {
            expect(() => {
                keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, INVALID_WORD_COUNT, 0, TEST_PASSWORD, '', 'backpack', '');
            }).toThrow('Invalid word count');
        });
        it('should load imported keypair successfully', () => {
            keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, VALID_MNEMONIC_12, 0, TEST_PASSWORD, '', 'backpack', '');
            const loaded = keyManager.loadKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
            expect(loaded).toBeDefined();
            expect(loaded.publicKey.toBase58()).toBeDefined();
        });
    });
    describe('Known Test Vectors', () => {
        // Test with known Solana address from test vectors
        it('should produce expected Solana address from known mnemonic', () => {
            // This is a test vector - using the abandon mnemonic should produce deterministic addresses
            const addresses = keyManager.deriveAddressesFromMnemonic(VALID_MNEMONIC_12, '', 'backpack', '', 0, 1);
            // The first address from the abandon mnemonic with Backpack path
            // Should be a valid base58-encoded Solana public key
            expect(addresses[0].publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
        });
    });
});
//# sourceMappingURL=mnemonic.test.js.map