"use strict";
/**
 * Tests for txProcessor module
 * Tests transaction parsing, validation, and detail extraction
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
const txProcessor = __importStar(require("../txProcessor"));
describe('txProcessor', () => {
    const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');
    // Sample valid unsigned transaction
    const createValidTransaction = () => {
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
        return {
            description: 'Test SOL transfer',
            network: 'devnet',
            messageBase64: Buffer.from(messageV0.serialize()).toString('base64'),
            meta: {
                tokenSymbol: 'SOL',
                decimals: 9,
                amount: 0.001,
            },
        };
    };
    describe('parseTransactionFile', () => {
        let testFilePath;
        beforeEach(() => {
            // Create test file
            if (!fs.existsSync(TEST_UPLOADS_DIR)) {
                fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
            }
            testFilePath = path.join(TEST_UPLOADS_DIR, 'test-unsigned-tx.json');
        });
        afterEach(() => {
            // Clean up test file
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should parse valid transaction file', () => {
            const txData = createValidTransaction();
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const result = txProcessor.parseTransactionFile(testFilePath);
            expect(result).toBeDefined();
            expect(result.description).toBe(txData.description);
            expect(result.network).toBe(txData.network);
            expect(result.messageBase64).toBe(txData.messageBase64);
            expect(result.messageBuffer).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.details).toBeDefined();
            expect(result.rawFilePath).toBe(testFilePath);
        });
        it('should throw error if file does not exist', () => {
            expect(() => {
                txProcessor.parseTransactionFile('/non/existent/path.json');
            }).toThrow('Transaction file not found');
        });
        it('should throw error for invalid JSON', () => {
            fs.writeFileSync(testFilePath, 'not valid json');
            expect(() => {
                txProcessor.parseTransactionFile(testFilePath);
            }).toThrow('Invalid JSON file format');
        });
        it('should throw error if messageBase64 is missing', () => {
            const txData = createValidTransaction();
            delete txData.messageBase64;
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            expect(() => {
                txProcessor.parseTransactionFile(testFilePath);
            }).toThrow('Missing messageBase64 field');
        });
        it('should throw error if network is missing', () => {
            const txData = createValidTransaction();
            delete txData.network;
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            expect(() => {
                txProcessor.parseTransactionFile(testFilePath);
            }).toThrow('Missing network field');
        });
        it('should parse transaction without meta', () => {
            const txData = createValidTransaction();
            delete txData.meta;
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const result = txProcessor.parseTransactionFile(testFilePath);
            expect(result).toBeDefined();
            expect(result.details).toBeDefined();
        });
    });
    describe('getTransactionDetails', () => {
        let testFilePath;
        beforeEach(() => {
            if (!fs.existsSync(TEST_UPLOADS_DIR)) {
                fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
            }
            testFilePath = path.join(TEST_UPLOADS_DIR, 'test-unsigned-tx.json');
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should return transaction details', () => {
            const txData = createValidTransaction();
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details).toBeDefined();
            expect(details.network).toBe('DEVNET');
            expect(details.description).toBe(txData.description);
            expect(details.feePayer).toBeDefined();
            expect(details.type).toBeDefined();
            expect(details.accounts).toBeDefined();
            expect(details.instructions).toBeDefined();
        });
        it('should include formatted amount for SOL transfers', () => {
            const txData = createValidTransaction();
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details.amountFormatted).toBe('0.001 SOL');
            expect(details.tokenSymbol).toBe('SOL');
        });
    });
    describe('validateTransactionFile', () => {
        let testFilePath;
        beforeEach(() => {
            if (!fs.existsSync(TEST_UPLOADS_DIR)) {
                fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
            }
            testFilePath = path.join(TEST_UPLOADS_DIR, 'test-unsigned-tx.json');
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should return true for valid transaction file', () => {
            const txData = createValidTransaction();
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const isValid = txProcessor.validateTransactionFile(testFilePath);
            expect(isValid).toBe(true);
        });
        it('should return false for invalid file', () => {
            fs.writeFileSync(testFilePath, 'not valid json');
            const isValid = txProcessor.validateTransactionFile(testFilePath);
            expect(isValid).toBe(false);
        });
        it('should return false for non-existent file', () => {
            const isValid = txProcessor.validateTransactionFile('/non/existent/path.json');
            expect(isValid).toBe(false);
        });
    });
    describe('shortenAddress', () => {
        it('should shorten long addresses', () => {
            const longAddress = 'BhJpHMEGBWo1fJusPTjqhZKmvM2ZNyRj712kWiVq9Gc9';
            const shortened = txProcessor.shortenAddress(longAddress);
            expect(shortened).toBe('BhJp...9Gc9');
        });
        it('should return short addresses unchanged', () => {
            const shortAddress = 'short';
            const shortened = txProcessor.shortenAddress(shortAddress);
            expect(shortened).toBe('short');
        });
        it('should handle empty string', () => {
            const shortened = txProcessor.shortenAddress('');
            expect(shortened).toBe('');
        });
        it('should handle null/undefined', () => {
            const shortened = txProcessor.shortenAddress(null);
            expect(shortened).toBe(null);
        });
    });
    describe('extractParties', () => {
        let testFilePath;
        beforeEach(() => {
            if (!fs.existsSync(TEST_UPLOADS_DIR)) {
                fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
            }
            testFilePath = path.join(TEST_UPLOADS_DIR, 'test-unsigned-tx.json');
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should extract sender from transaction', () => {
            const keypair = web3_js_1.Keypair.generate();
            const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash,
                instructions: [],
            }).compileToV0Message();
            const txData = {
                description: 'Test',
                network: 'devnet',
                messageBase64: Buffer.from(messageV0.serialize()).toString('base64'),
            };
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const parsed = txProcessor.parseTransactionFile(testFilePath);
            const parties = txProcessor.extractParties(parsed);
            expect(parties.sender).toBe(keypair.publicKey.toBase58());
            expect(parties.senderShort).toBe(txProcessor.shortenAddress(keypair.publicKey.toBase58()));
        });
        it('should extract recipient when available', () => {
            const sender = web3_js_1.Keypair.generate();
            const recipient = web3_js_1.Keypair.generate();
            const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: sender.publicKey,
                recentBlockhash,
                instructions: [
                    web3_js_1.SystemProgram.transfer({
                        fromPubkey: sender.publicKey,
                        toPubkey: recipient.publicKey,
                        lamports: 1000000,
                    }),
                ],
            }).compileToV0Message();
            const txData = {
                description: 'Test',
                network: 'devnet',
                messageBase64: Buffer.from(messageV0.serialize()).toString('base64'),
            };
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const parsed = txProcessor.parseTransactionFile(testFilePath);
            const parties = txProcessor.extractParties(parsed);
            expect(parties.recipient).toBeDefined();
            expect(parties.recipientShort).toBeDefined();
        });
    });
    describe('Transaction type identification', () => {
        let testFilePath;
        beforeEach(() => {
            if (!fs.existsSync(TEST_UPLOADS_DIR)) {
                fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
            }
            testFilePath = path.join(TEST_UPLOADS_DIR, 'test-unsigned-tx.json');
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should identify SOL transfer', () => {
            const txData = createValidTransaction();
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details.type).toBe('SOL Transfer');
        });
        it('should identify SPL token transfer', () => {
            const txData = createValidTransaction();
            txData.meta = {
                tokenSymbol: 'USDC',
                decimals: 6,
                amount: 100,
            };
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details.type).toBe('SPL Token Transfer');
        });
        it('should identify generic transfer', () => {
            const txData = createValidTransaction();
            delete txData.meta;
            txData.description = 'Transfer tokens';
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details.type).toBe('Transfer');
        });
        it('should handle unknown transaction type', () => {
            const txData = createValidTransaction();
            delete txData.meta;
            txData.description = 'Something else';
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
            const details = txProcessor.getTransactionDetails(testFilePath);
            expect(details.type).toBe('Unknown');
        });
    });
});
//# sourceMappingURL=txProcessor.test.js.map