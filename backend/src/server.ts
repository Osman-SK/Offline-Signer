import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import * as keyManager from './keyManager';
import * as txProcessor from './txProcessor';
import * as signer from './signer';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password Management
app.get('/api/password/status', (_req: Request, res: Response) => {
  try {
    const hasPassword = keyManager.hasGlobalPassword();
    res.json({ success: true, hasPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/password/set', (req: Request, res: Response) => {
  try {
    const { password } = req.body as { password: string };
    
    // Check if password already exists - one time setup only
    if (keyManager.hasGlobalPassword()) {
      res.status(400).json({ 
        success: false, 
        error: 'Password already set. Password can only be configured once during initial setup.' 
      });
      return;
    }
    
    keyManager.setGlobalPassword(password);
    res.json({ success: true, message: 'Password set successfully. This password cannot be changed later.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/password/verify', (req: Request, res: Response) => {
  try {
    const { password } = req.body as { password: string };
    const valid = keyManager.verifyGlobalPassword(password);
    res.json({ success: true, valid });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Key Management
app.post('/api/keys/generate', (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };
    const keypair = keyManager.generateKeypair(name);
    res.json({
      success: true,
      publicKey: keypair.publicKey,
      message: 'Keypair generated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/keys/import', (req: Request, res: Response) => {
  try {
    const { name, privateKey, format } = req.body as {
      name: string;
      privateKey: string;
      format?: 'base58' | 'base64' | 'json';
    };
    const keypair = keyManager.importKeypair(name, privateKey, format);
    res.json({
      success: true,
      publicKey: keypair.publicKey,
      message: 'Keypair imported successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/keys', (_req: Request, res: Response) => {
  try {
    const keys = keyManager.listKeypairs();
    res.json({ success: true, keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/keys/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    keyManager.deleteKeypair(name);
    res.json({ success: true, message: `Keypair '${name}' deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Export Endpoints
app.post('/api/keys/export/private-key', (req: Request, res: Response) => {
  try {
    const { name, format, password } = req.body as {
      name: string;
      format: 'base58' | 'base64' | 'json';
      password?: string;
    };
    
    // Verify password if set
    if (keyManager.hasGlobalPassword()) {
      if (!password || !keyManager.verifyGlobalPassword(password)) {
        res.status(401).json({ success: false, error: 'Invalid password' });
        return;
      }
    }
    
    const exportedKey = keyManager.exportPrivateKey(name, format);
    res.json({ success: true, privateKey: exportedKey, format });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/keys/export/seed-phrase', (req: Request, res: Response) => {
  try {
    const { name, password } = req.body as {
      name: string;
      password?: string;
    };
    
    // Verify password if set
    if (keyManager.hasGlobalPassword()) {
      if (!password || !keyManager.verifyGlobalPassword(password)) {
        res.status(401).json({ success: false, error: 'Invalid password' });
        return;
      }
    }
    
    const mnemonic = keyManager.exportSeedPhrase(name);
    if (mnemonic === null) {
      res.status(404).json({ success: false, error: 'No seed phrase stored for this keypair' });
      return;
    }
    
    res.json({ success: true, mnemonic });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Mnemonic Endpoints

// Generate new mnemonic
app.post('/api/keys/generate-mnemonic', (_req: Request, res: Response) => {
  try {
    const mnemonic = keyManager.generateNewMnemonic();
    res.json({ success: true, mnemonic });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Validate mnemonic
app.post('/api/keys/validate-mnemonic', (req: Request, res: Response) => {
  try {
    const { mnemonic } = req.body as { mnemonic: string };
    const validation = keyManager.validateMnemonic(mnemonic);
    res.json({ success: true, validation });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Get derivation path presets
app.get('/api/keys/derivation-presets', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, presets: keyManager.DERIVATION_PRESETS });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Derive addresses from mnemonic
app.post('/api/keys/derive-preview', (req: Request, res: Response) => {
  try {
    const { mnemonic, passphrase, preset, customPath, startIndex, count } = req.body as {
      mnemonic: string;
      passphrase?: string;
      preset?: string;
      customPath?: string;
      startIndex?: number;
      count?: number;
    };

    const addresses = keyManager.deriveAddressesFromMnemonic(
      mnemonic,
      passphrase || '',
      preset || 'backpack',
      customPath || '',
      startIndex || 0,
      count || 5
    );

    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Import from mnemonic
app.post('/api/keys/import-mnemonic', (req: Request, res: Response) => {
  try {
    const { name, mnemonic, accountIndex, passphrase, preset, customPath, storeMnemonic } = req.body as {
      name: string;
      mnemonic: string;
      accountIndex: number;
      passphrase?: string;
      preset?: string;
      customPath?: string;
      storeMnemonic?: boolean;
    };

    const keypair = keyManager.importFromMnemonic(
      name,
      mnemonic,
      accountIndex,
      passphrase || '',
      preset || 'backpack',
      customPath || '',
      storeMnemonic !== false // default to true
    );

    res.json({
      success: true,
      publicKey: keypair.publicKey,
      message: 'Keypair imported successfully from mnemonic'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Transaction Processing
app.post('/api/transaction/upload', upload.single('transaction'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    
    const filePath = req.file.path;
    const transactionData = txProcessor.parseTransactionFile(filePath);
    
    res.json({
      success: true,
      transaction: transactionData,
      filePath: filePath
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Signing
app.post('/api/transaction/sign', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, keyName, password, approve } = req.body as {
      filePath: string;
      keyName: string;
      password?: string;
      approve: boolean;
    };
    
    if (!approve) {
      res.json({ success: false, message: 'Transaction declined by user' });
      return;
    }
    
    // Verify password if set
    if (keyManager.hasGlobalPassword()) {
      if (!password || !keyManager.verifyGlobalPassword(password)) {
        res.status(401).json({ success: false, error: 'Invalid password' });
        return;
      }
    }
    
    const result = await signer.signTransaction(filePath, keyName);
    
    res.json({
      success: true,
      signature: result.signature,
      publicKey: result.publicKey,
      signedAt: result.signedAt,
      downloadUrl: `/api/download/${path.basename(result.outputPath)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Download signed transaction
app.get('/api/download/:filename', (req: Request, res: Response): void => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }
    
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Get transaction details for display
app.post('/api/transaction/details', (req: Request, res: Response) => {
  try {
    const { filePath } = req.body as { filePath: string };
    const details = txProcessor.getTransactionDetails(filePath);
    res.json({ success: true, details });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Offline Signer Backend running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to access the signer`);
  });
}

export default app;
