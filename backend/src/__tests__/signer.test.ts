/**
 * Tests for signer module
 * Tests transaction signing, signature verification, and preview generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { Keypair, SystemProgram, TransactionMessage } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as signer from '../signer';
import * as keyManager from '../keyManager';

describe('signer', () => {
  const TEST_KEYS_DIR = path.join(__dirname, '../../keys');
  const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');
  const TEST_KEYPAIR_NAME = 'test-signing-keypair';
  const TEST_PASSWORD = 'test-password-123';

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
    } catch {
      // Keypair might not exist
    }

    // Create test keypair fresh
    keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
  });

  // Clean up after all tests
  afterAll(() => {
    try {
      keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
    } catch {
      // Keypair might not exist
    }
  });

  describe('signTransaction', () => {
    let testTxFilePath: string;

    beforeEach(() => {
      // Ensure test keypair exists for signTransaction tests
      try {
        keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
      } catch {
        // Keypair might already exist
      }
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
      const result = await signer.signTransaction(
        testTxFilePath,
        TEST_KEYPAIR_NAME,
        TEST_PASSWORD
      );

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.signature.length).toBeGreaterThan(0);
      expect(result.publicKey).toBeDefined();
      expect(result.outputPath).toBeDefined();
      expect(result.outputFilename).toBeDefined();
      expect(result.signedAt).toBeDefined();
    });

    it('should create signed transaction file', async () => {
      const result = await signer.signTransaction(
        testTxFilePath,
        TEST_KEYPAIR_NAME,
        TEST_PASSWORD
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);

      const signedData = JSON.parse(fs.readFileSync(result.outputPath, 'utf-8'));
      expect(signedData.signature).toBe(result.signature);
      expect(signedData.publicKey).toBe(result.publicKey);
      expect(signedData.signedAt).toBe(result.signedAt);
      expect(signedData.network).toBe('devnet');
    });

    it('should throw error if transaction file does not exist', async () => {
      await expect(
        signer.signTransaction('/non/existent/file.json', TEST_KEYPAIR_NAME, TEST_PASSWORD)
      ).rejects.toThrow();
    });

    it('should throw error if keypair does not exist', async () => {
      await expect(
        signer.signTransaction(testTxFilePath, 'non-existent-keypair', TEST_PASSWORD)
      ).rejects.toThrow("Keypair 'non-existent-keypair' not found");
    });

    it('should throw error if password is incorrect', async () => {
      await expect(
        signer.signTransaction(testTxFilePath, TEST_KEYPAIR_NAME, 'wrong-password')
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const keypair = Keypair.generate();
      const message = Buffer.from('test message');
      const signature = nacl.sign.detached(
        new Uint8Array(message),
        new Uint8Array(keypair.secretKey)
      );

      const isValid = signer.verifySignature(
        message.toString('base64'),
        Buffer.from(signature).toString('base64'),
        keypair.publicKey.toBase58()
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const keypair = Keypair.generate();
      const message = Buffer.from('test message');
      const wrongSignature = Buffer.from('invalid signature');

      const isValid = signer.verifySignature(
        message.toString('base64'),
        wrongSignature.toString('base64'),
        keypair.publicKey.toBase58()
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', () => {
      const keypair1 = Keypair.generate();
      const keypair2 = Keypair.generate();
      const message = Buffer.from('test message');
      const signature = nacl.sign.detached(
        new Uint8Array(message),
        new Uint8Array(keypair1.secretKey)
      );

      const isValid = signer.verifySignature(
        message.toString('base64'),
        Buffer.from(signature).toString('base64'),
        keypair2.publicKey.toBase58()
      );

      expect(isValid).toBe(false);
    });

    it('should return false for invalid base64', () => {
      const isValid = signer.verifySignature(
        'not-valid-base64!!!',
        'not-valid-base64!!!',
        Keypair.generate().publicKey.toBase58()
      );

      expect(isValid).toBe(false);
    });

    it('should return false for invalid public key', () => {
      const keypair = Keypair.generate();
      const message = Buffer.from('test message');
      const signature = nacl.sign.detached(
        new Uint8Array(message),
        new Uint8Array(keypair.secretKey)
      );

      const isValid = signer.verifySignature(
        message.toString('base64'),
        Buffer.from(signature).toString('base64'),
        'invalid-public-key'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('createSigningPreview', () => {
    let testTxFilePath: string;

    beforeEach(() => {
      // Ensure test keypair exists for createSigningPreview tests
      try {
        keyManager.generateKeypair(TEST_KEYPAIR_NAME, TEST_PASSWORD);
      } catch {
        // Keypair might already exist
      }
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
