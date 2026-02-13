/**
 * API Integration Tests
 * Tests all API endpoints using supertest
 */

import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { Keypair, SystemProgram, TransactionMessage } from '@solana/web3.js';
import app from '../server';

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
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/keys/generate', () => {
    afterEach(async () => {
      try {
        await request(app)
          .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
      } catch {
        // Ignore errors
      }
    });

    it('should generate a new keypair', async () => {
      const response = await request(app)
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
      const response = await request(app)
        .post('/api/keys/generate')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return error if keypair already exists', async () => {
      // Create first
      await request(app)
        .post('/api/keys/generate')
        .send({
          name: TEST_KEYPAIR_NAME,
        });

      // Try to create again
      const response = await request(app)
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
        await request(app)
          .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
      } catch {
        // Ignore errors
      }
    });

    it('should import keypair with base58 format', async () => {
      const response = await request(app)
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
      const keypair = Keypair.generate();
      const secretKey = JSON.stringify(Array.from(keypair.secretKey));

      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.keys)).toBe(true);
    });
  });

  describe('DELETE /api/keys/:name', () => {
    beforeEach(async () => {
      // Create a test keypair
      await request(app)
        .post('/api/keys/generate')
        .send({
          name: TEST_KEYPAIR_NAME,
        });
    });

    it('should delete existing keypair', async () => {
      const response = await request(app)
        .delete(`/api/keys/${TEST_KEYPAIR_NAME}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return error for non-existent keypair', async () => {
      const response = await request(app)
        .delete('/api/keys/non-existent-keypair')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/transaction/upload', () => {
    let testFilePath: string;

    beforeEach(() => {
      // Create a test transaction file
      const keypair = Keypair.generate();
      const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
      
      const messageV0 = new TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: Keypair.generate().publicKey,
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
      const response = await request(app)
        .post('/api/transaction/upload')
        .attach('transaction', testFilePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toBeDefined();
      expect(response.body.filePath).toBeDefined();
    });

    it('should return error if no file uploaded', async () => {
      const response = await request(app)
        .post('/api/transaction/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });
  });

  describe('POST /api/transaction/sign', () => {
    let testFilePath: string;

    beforeEach(async () => {
      // Create a test keypair
      await request(app)
        .post('/api/keys/generate')
        .send({
          name: TEST_KEYPAIR_NAME,
        });

      // Create a test transaction file
      const keypair = Keypair.generate();
      const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
      
      const messageV0 = new TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: Keypair.generate().publicKey,
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
        await request(app)
          .delete(`/api/keys/${TEST_KEYPAIR_NAME}`);
      } catch {
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
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
        .get('/api/download/non-existent-file.json')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File not found');
    });
  });

  describe('POST /api/transaction/details', () => {
    let testFilePath: string;

    beforeEach(() => {
      // Create a test transaction file
      const keypair = Keypair.generate();
      const recentBlockhash = 'GhtuG8sJd3qeR1VdQWzFy2P1nXy3V9sJd3qeR1VdQWzF';
      
      const messageV0 = new TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: Keypair.generate().publicKey,
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
      const response = await request(app)
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
