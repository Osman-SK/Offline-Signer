"use strict";
/**
 * Tests for signer module
 * Tests transaction signing, signature verification, and preview generation
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
const nacl = __importStar(require("tweetnacl"));
const signer = __importStar(require("../signer"));
const keyManager = __importStar(require("../keyManager"));
describe('signer', () => {
    const TEST_KEYS_DIR = path.join(__dirname, '../../keys');
    const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');
    const TEST_KEYPAIR_NAME = 'test-signing-keypair';
    // Create test keypair and transaction before tests
    beforeAll(async () => {
        // Ensure directories exist
        if (!fs.existsSync(TEST_KEYS_DIR)) {
            fs.mkdirSync(TEST_KEYS_DIR, { recursive: true });
        }
        if (!fs.existsSync(TEST_UPLOADS_DIR)) {
            fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
        }
        // Clean up any existing test keypair first
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist
        }
        // Create test keypair fresh
        keyManager.generateKeypair(TEST_KEYPAIR_NAME);
    });
    // Clean up after all tests
    afterAll(() => {
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch {
            // Keypair might not exist
        }
    });
    describe('signTransaction', () => {
        let testTxFilePath;
        beforeEach(() => {
            // Ensure test keypair exists for signTransaction tests
            try {
                keyManager.generateKeypair(TEST_KEYPAIR_NAME);
            }
            catch {
                // Keypair might already exist
            }
            // Create a test transaction file
            const keypair = web3_js_1.Keypair.generate();
            const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash,
                instructions: [
                    web3_js_1.SystemProgram.transfer({
                        fromPubkey: keypair.publicKey,
                        toPubkey: web3_js_1.Keypair.generate().publicKey,
                        lamports: 1000000,
                    }),
                ],
            }).compileToV0Message();
            const txData = {
                description: 'Test SOL transfer',
                network: 'devnet',
                messageBase64: Buffer.from(messageV0.serialize()).toString('base64'),
                meta: {
                    tokenSymbol: 'SOL',
                    decimals: 9,
                    amount: 0.001,
                },
            };
            testTxFilePath = path.join(TEST_UPLOADS_DIR, `test-unsigned-${Date.now()}.json`);
            fs.writeFileSync(testTxFilePath, JSON.stringify(txData));
        });
        afterEach(() => {
            // Clean up test transaction files
            if (fs.existsSync(testTxFilePath)) {
                fs.unlinkSync(testTxFilePath);
            }
            // Clean up any signed transaction files
            const files = fs.readdirSync(TEST_UPLOADS_DIR);
            for (const file of files) {
                if (file.startsWith('signed-tx-')) {
                    fs.unlinkSync(path.join(TEST_UPLOADS_DIR, file));
                }
            }
        });
        it('should sign transaction successfully', async () => {
            const result = await signer.signTransaction(testTxFilePath, TEST_KEYPAIR_NAME);
            expect(result).toBeDefined();
            expect(result.signature).toBeDefined();
            expect(result.signature.length).toBeGreaterThan(0);
            expect(result.publicKey).toBeDefined();
            expect(result.outputPath).toBeDefined();
            expect(result.outputFilename).toBeDefined();
            expect(result.signedAt).toBeDefined();
        });
        it('should create signed transaction file', async () => {
            const result = await signer.signTransaction(testTxFilePath, TEST_KEYPAIR_NAME);
            expect(fs.existsSync(result.outputPath)).toBe(true);
            const signedData = JSON.parse(fs.readFileSync(result.outputPath, 'utf-8'));
            expect(signedData.signature).toBe(result.signature);
            expect(signedData.publicKey).toBe(result.publicKey);
            expect(signedData.signedAt).toBe(result.signedAt);
            expect(signedData.network).toBe('devnet');
        });
        it('should throw error if transaction file does not exist', async () => {
            await expect(signer.signTransaction('/non/existent/file.json', TEST_KEYPAIR_NAME)).rejects.toThrow();
        });
        it('should throw error if keypair does not exist', async () => {
            await expect(signer.signTransaction(testTxFilePath, 'non-existent-keypair')).rejects.toThrow("Keypair 'non-existent-keypair' not found");
        });
    });
    describe('verifySignature', () => {
        it('should verify valid signature', () => {
            const keypair = web3_js_1.Keypair.generate();
            const message = Buffer.from('test message');
            const signature = nacl.sign.detached(new Uint8Array(message), new Uint8Array(keypair.secretKey));
            const isValid = signer.verifySignature(message.toString('base64'), Buffer.from(signature).toString('base64'), keypair.publicKey.toBase58());
            expect(isValid).toBe(true);
        });
        it('should reject invalid signature', () => {
            const keypair = web3_js_1.Keypair.generate();
            const message = Buffer.from('test message');
            const wrongSignature = Buffer.from('invalid signature');
            const isValid = signer.verifySignature(message.toString('base64'), wrongSignature.toString('base64'), keypair.publicKey.toBase58());
            expect(isValid).toBe(false);
        });
        it('should reject signature with wrong public key', () => {
            const keypair1 = web3_js_1.Keypair.generate();
            const keypair2 = web3_js_1.Keypair.generate();
            const message = Buffer.from('test message');
            const signature = nacl.sign.detached(new Uint8Array(message), new Uint8Array(keypair1.secretKey));
            const isValid = signer.verifySignature(message.toString('base64'), Buffer.from(signature).toString('base64'), keypair2.publicKey.toBase58());
            expect(isValid).toBe(false);
        });
        it('should return false for invalid base64', () => {
            const isValid = signer.verifySignature('not-valid-base64!!!', 'not-valid-base64!!!', web3_js_1.Keypair.generate().publicKey.toBase58());
            expect(isValid).toBe(false);
        });
        it('should return false for invalid public key', () => {
            const keypair = web3_js_1.Keypair.generate();
            const message = Buffer.from('test message');
            const signature = nacl.sign.detached(new Uint8Array(message), new Uint8Array(keypair.secretKey));
            const isValid = signer.verifySignature(message.toString('base64'), Buffer.from(signature).toString('base64'), 'invalid-public-key');
            expect(isValid).toBe(false);
        });
    });
    describe('createSigningPreview', () => {
        let testTxFilePath;
        beforeEach(() => {
            // Ensure test keypair exists for createSigningPreview tests
            try {
                keyManager.generateKeypair(TEST_KEYPAIR_NAME);
            }
            catch {
                // Keypair might already exist
            }
            const keypair = web3_js_1.Keypair.generate();
            const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash,
                instructions: [
                    web3_js_1.SystemProgram.transfer({
                        fromPubkey: keypair.publicKey,
                        toPubkey: web3_js_1.Keypair.generate().publicKey,
                        lamports: 1000000,
                    }),
                ],
            }).compileToV0Message();
            const txData = {
                description: 'Test SOL transfer for preview',
                network: 'devnet',
                messageBase64: Buffer.from(messageV0.serialize()).toString('base64'),
                meta: {
                    tokenSymbol: 'SOL',
                    decimals: 9,
                    amount: 0.001,
                },
            };
            testTxFilePath = path.join(TEST_UPLOADS_DIR, `test-preview-${Date.now()}.json`);
            fs.writeFileSync(testTxFilePath, JSON.stringify(txData));
        });
        afterEach(() => {
            if (fs.existsSync(testTxFilePath)) {
                fs.unlinkSync(testTxFilePath);
            }
        });
        it('should create signing preview', () => {
            const preview = signer.createSigningPreview(testTxFilePath, TEST_KEYPAIR_NAME);
            expect(preview).toBeDefined();
            expect(preview.signer).toBeDefined();
            expect(preview.signer.name).toBe(TEST_KEYPAIR_NAME);
            expect(preview.signer.publicKey).toBeDefined();
            expect(preview.signer.publicKeyShort).toBeDefined();
            expect(preview.transaction).toBeDefined();
            expect(preview.transaction.type).toBeDefined();
            expect(preview.transaction.network).toBe('DEVNET');
            expect(preview.transaction.description).toBe('Test SOL transfer for preview');
            expect(preview.transaction.amount).toBeDefined();
            expect(preview.security).toBeDefined();
        });
        it('should show warning when signer does not match sender', () => {
            const preview = signer.createSigningPreview(testTxFilePath, TEST_KEYPAIR_NAME);
            // Since we're using a different keypair than the transaction sender
            expect(preview.security.warning).toContain('WARNING');
            expect(preview.security.verifiedSigner).toBe(false);
        });
        it('should throw error if transaction file does not exist', () => {
            expect(() => {
                signer.createSigningPreview('/non/existent/file.json', TEST_KEYPAIR_NAME);
            }).toThrow();
        });
        it('should throw error if keypair does not exist', () => {
            expect(() => {
                signer.createSigningPreview(testTxFilePath, 'non-existent-keypair');
            }).toThrow();
        });
    });
});
//# sourceMappingURL=signer.test.js.map