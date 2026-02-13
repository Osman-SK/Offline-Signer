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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const keyManager = __importStar(require("./keyManager"));
const txProcessor = __importStar(require("./txProcessor"));
const signer = __importStar(require("./signer"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend')));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
// Routes
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Password Management
app.get('/api/password/status', (_req, res) => {
    try {
        const hasPassword = keyManager.hasGlobalPassword();
        res.json({ success: true, hasPassword });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/api/password/set', (req, res) => {
    try {
        const { password } = req.body;
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/api/password/verify', (req, res) => {
    try {
        const { password } = req.body;
        const valid = keyManager.verifyGlobalPassword(password);
        res.json({ success: true, valid });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Key Management
app.post('/api/keys/generate', (req, res) => {
    try {
        const { name } = req.body;
        const keypair = keyManager.generateKeypair(name);
        res.json({
            success: true,
            publicKey: keypair.publicKey,
            message: 'Keypair generated successfully'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/api/keys/import', (req, res) => {
    try {
        const { name, privateKey, format } = req.body;
        const keypair = keyManager.importKeypair(name, privateKey, format);
        res.json({
            success: true,
            publicKey: keypair.publicKey,
            message: 'Keypair imported successfully'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.get('/api/keys', (_req, res) => {
    try {
        const keys = keyManager.listKeypairs();
        res.json({ success: true, keys });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.delete('/api/keys/:name', (req, res) => {
    try {
        const { name } = req.params;
        keyManager.deleteKeypair(name);
        res.json({ success: true, message: `Keypair '${name}' deleted` });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Export Endpoints
app.post('/api/keys/export/private-key', (req, res) => {
    try {
        const { name, format, password } = req.body;
        // Verify password if set
        if (keyManager.hasGlobalPassword()) {
            if (!password || !keyManager.verifyGlobalPassword(password)) {
                res.status(401).json({ success: false, error: 'Invalid password' });
                return;
            }
        }
        const exportedKey = keyManager.exportPrivateKey(name, format);
        res.json({ success: true, privateKey: exportedKey, format });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/api/keys/export/seed-phrase', (req, res) => {
    try {
        const { name, password } = req.body;
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Mnemonic Endpoints
// Generate new mnemonic
app.post('/api/keys/generate-mnemonic', (_req, res) => {
    try {
        const mnemonic = keyManager.generateNewMnemonic();
        res.json({ success: true, mnemonic });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Validate mnemonic
app.post('/api/keys/validate-mnemonic', (req, res) => {
    try {
        const { mnemonic } = req.body;
        const validation = keyManager.validateMnemonic(mnemonic);
        res.json({ success: true, validation });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Get derivation path presets
app.get('/api/keys/derivation-presets', (_req, res) => {
    try {
        res.json({ success: true, presets: keyManager.DERIVATION_PRESETS });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Derive addresses from mnemonic
app.post('/api/keys/derive-preview', (req, res) => {
    try {
        const { mnemonic, passphrase, preset, customPath, startIndex, count } = req.body;
        const addresses = keyManager.deriveAddressesFromMnemonic(mnemonic, passphrase || '', preset || 'backpack', customPath || '', startIndex || 0, count || 5);
        res.json({ success: true, addresses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Import from mnemonic
app.post('/api/keys/import-mnemonic', (req, res) => {
    try {
        const { name, mnemonic, accountIndex, passphrase, preset, customPath, storeMnemonic } = req.body;
        const keypair = keyManager.importFromMnemonic(name, mnemonic, accountIndex, passphrase || '', preset || 'backpack', customPath || '', storeMnemonic !== false // default to true
        );
        res.json({
            success: true,
            publicKey: keypair.publicKey,
            message: 'Keypair imported successfully from mnemonic'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Transaction Processing
app.post('/api/transaction/upload', upload.single('transaction'), (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Signing
app.post('/api/transaction/sign', async (req, res) => {
    try {
        const { filePath, keyName, password, approve } = req.body;
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
            downloadUrl: `/api/download/${path_1.default.basename(result.outputPath)}`
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Download signed transaction
app.get('/api/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(__dirname, '../uploads', filename);
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ success: false, error: 'File not found' });
            return;
        }
        res.download(filePath);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Get transaction details for display
app.post('/api/transaction/details', (req, res) => {
    try {
        const { filePath } = req.body;
        const details = txProcessor.getTransactionDetails(filePath);
        res.json({ success: true, details });
    }
    catch (error) {
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
exports.default = app;
//# sourceMappingURL=server.js.map