const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const keyManager = require('./keyManager');
const txProcessor = require('./txProcessor');
const signer = require('./signer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Key Management
app.post('/api/keys/generate', (req, res) => {
  try {
    const { name, password } = req.body;
    const keypair = keyManager.generateKeypair(name, password);
    res.json({
      success: true,
      publicKey: keypair.publicKey,
      message: 'Keypair generated successfully. Save your password securely - it cannot be recovered.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/keys/import', (req, res) => {
  try {
    const { name, privateKey, password } = req.body;
    const keypair = keyManager.importKeypair(name, privateKey, password);
    res.json({
      success: true,
      publicKey: keypair.publicKey,
      message: 'Keypair imported successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/keys', (req, res) => {
  try {
    const keys = keyManager.listKeypairs();
    res.json({ success: true, keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/keys/:name', (req, res) => {
  try {
    const { name } = req.params;
    keyManager.deleteKeypair(name);
    res.json({ success: true, message: `Keypair '${name}' deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transaction Processing
app.post('/api/transaction/upload', upload.single('transaction'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const transactionData = txProcessor.parseTransactionFile(filePath);
    
    res.json({
      success: true,
      transaction: transactionData,
      filePath: filePath
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Signing
app.post('/api/transaction/sign', async (req, res) => {
  try {
    const { filePath, keyName, password, approve } = req.body;
    
    if (!approve) {
      return res.json({ success: false, message: 'Transaction declined by user' });
    }
    
    const result = await signer.signTransaction(filePath, keyName, password);
    
    res.json({
      success: true,
      signature: result.signature,
      publicKey: result.publicKey,
      downloadUrl: `/api/download/${path.basename(result.outputPath)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download signed transaction
app.get('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction details for display
app.post('/api/transaction/details', (req, res) => {
  try {
    const { filePath } = req.body;
    const details = txProcessor.getTransactionDetails(filePath);
    res.json({ success: true, details });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Offline Signer Backend running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to access the signer`);
});

module.exports = app;