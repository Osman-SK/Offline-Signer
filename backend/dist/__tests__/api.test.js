"use strict";
/**
 * API Integration Tests
 * Tests all API endpoints using supertest
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3_js_1 = require("@solana/web3.js");
const server_1 = __importDefault(require("../server"));
describe('API Integration Tests', () => {
    const TEST_KEYS_DIR = path.join(__dirname, '../../keys');
    const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');
    const TEST_CONFIG_FILE = path.join(__dirname, '../../config.json');
    const TEST_KEYPAIR_NAME = 'test-api-keypair';
    beforeAll(() => {
        // Ensure directories exist
        if (!fs.existsSync(TEST_KEYS_DIR)) {
            fs.mkdirSync(TEST_KEYS_DIR, { recursive: true });
        }
        if (!fs.existsSync(TEST_UPLOADS_DIR)) {
            fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
        }
        // Clear any existing password to ensure tests run without password protection
        if (fs.existsSync(TEST_CONFIG_FILE)) {
            fs.unlinkSync(TEST_CONFIG_FILE);
        }
    });
    afterAll(() => {
        // Clean up config file
        if (fs.existsSync(TEST_CONFIG_FILE)) {
            fs.unlinkSync(TEST_CONFIG_FILE);
        }
    });
    afterAll(() => {
        // Clean up test files
        if (fs.existsSync(TEST_KEYS_DIR)) {
            const files = fs.readdirSync(TEST_KEYS_DIR);
            for (const file of files) {
                if (file.includes('test-')) {
                    fs.unlinkSync(path.join(TEST_KEYS_DIR, file));
                }
            }
        }
    });
    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/health')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'ok');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
    describe('POST /api/keys/generate', () => {
        afterEach(async () => {
            try {
                await (0, supertest_1.default)(server_1.default)
                    .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
            }
            catch {
                // Ignore errors
            }
        });
        it('should generate a new keypair', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({
                name: TEST_KEYPAIR_NAME,
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.publicKey).toBeDefined();
            expect(response.body.message).toContain('generated successfully');
        });
        it('should return error if name is missing', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({})
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('required');
        });
        it('should return error if keypair already exists', async () => {
            // Create first
            await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({
                name: TEST_KEYPAIR_NAME,
            });
            // Try to create again
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({
                name: TEST_KEYPAIR_NAME,
            })
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('already exists');
        });
    });
    describe('POST /api/keys/import', () => {
        const TEST_PRIVATE_KEY_BASE58 = '5sinxM3PVEzRGSqfdZ4HM1B8M4TQg26onCqBUMoUN97jByHEgWTEeGZtbnM1PWuh6vpX6rLZrphyyigwe5p4wvos';
        afterEach(async () => {
            try {
                await (0, supertest_1.default)(server_1.default)
                    .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
            }
            catch {
                // Ignore errors
            }
        });
        it('should import keypair with base58 format', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/import')
                .send({
                name: TEST_KEYPAIR_NAME,
                privateKey: TEST_PRIVATE_KEY_BASE58,
                format: 'base58',
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.publicKey).toBe('BhJpHMEGBWo1fJusPTjqhZKmvM2ZNyRj712kWiVq9Gc9');
        });
        it('should import keypair with JSON format', async () => {
            const keypair = web3_js_1.Keypair.generate();
            const secretKey = JSON.stringify(Array.from(keypair.secretKey));
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/import')
                .send({
                name: TEST_KEYPAIR_NAME,
                privateKey: secretKey,
                format: 'json',
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.publicKey).toBe(keypair.publicKey.toBase58());
        });
        it('should return error for invalid private key', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/import')
                .send({
                name: TEST_KEYPAIR_NAME,
                privateKey: 'invalid-key',
                format: 'base58',
            })
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });
    });
    describe('GET /api/keys', () => {
        it('should return list of keypairs', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/keys')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.keys)).toBe(true);
        });
    });
    describe('DELETE /api/keys/:name', () => {
        beforeEach(async () => {
            // Create a test keypair
            await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({
                name: TEST_KEYPAIR_NAME,
            });
        });
        it('should delete existing keypair', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .delete(`/api/keys/${TEST_KEYPAIR_NAME}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');
        });
        it('should return error for non-existent keypair', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .delete('/api/keys/non-existent-keypair')
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not found');
        });
    });
    describe('POST /api/transaction/upload', () => {
        let testFilePath;
        beforeEach(() => {
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
            testFilePath = path.join(TEST_UPLOADS_DIR, `test-upload-${Date.now()}.json`);
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should upload transaction file', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/transaction/upload')
                .attach('transaction', testFilePath)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.transaction).toBeDefined();
            expect(response.body.filePath).toBeDefined();
        });
        it('should return error if no file uploaded', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/transaction/upload')
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('No file uploaded');
        });
    });
    describe('POST /api/transaction/sign', () => {
        let testFilePath;
        beforeEach(async () => {
            // Create a test keypair
            await (0, supertest_1.default)(server_1.default)
                .post('/api/keys/generate')
                .send({
                name: TEST_KEYPAIR_NAME,
            });
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
            testFilePath = path.join(TEST_UPLOADS_DIR, `test-sign-${Date.now()}.json`);
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
        });
        afterEach(async () => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
            try {
                await (0, supertest_1.default)(server_1.default)
                    .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
            }
            catch {
                // Ignore errors
            }
            // Clean up signed transaction files
            const files = fs.readdirSync(TEST_UPLOADS_DIR);
            for (const file of files) {
                if (file.startsWith('signed-tx-')) {
                    fs.unlinkSync(path.join(TEST_UPLOADS_DIR, file));
                }
            }
        });
        it('should sign transaction successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/transaction/sign')
                .send({
                filePath: testFilePath,
                keyName: TEST_KEYPAIR_NAME,
                approve: true,
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.signature).toBeDefined();
            expect(response.body.publicKey).toBeDefined();
            expect(response.body.signedAt).toBeDefined();
            expect(response.body.downloadUrl).toBeDefined();
        });
        it('should decline transaction when approve is false', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/transaction/sign')
                .send({
                filePath: testFilePath,
                keyName: TEST_KEYPAIR_NAME,
                approve: false,
            })
                .expect(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('declined');
        });
    });
    describe('GET /api/download/:filename', () => {
        it('should return 404 for non-existent file', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/download/non-existent-file.json')
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('File not found');
        });
    });
    describe('POST /api/transaction/details', () => {
        let testFilePath;
        beforeEach(() => {
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
            testFilePath = path.join(TEST_UPLOADS_DIR, `test-details-${Date.now()}.json`);
            fs.writeFileSync(testFilePath, JSON.stringify(txData));
        });
        afterEach(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });
        it('should get transaction details', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/transaction/details')
                .send({ filePath: testFilePath })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.details).toBeDefined();
            expect(response.body.details.network).toBe('DEVNET');
            expect(response.body.details.type).toBe('SOL Transfer');
        });
    });
});
//# sourceMappingURL=api.test.js.map