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
Object.defineProperty(exports, "__esModule", { value: true });
exports.signTransaction = signTransaction;
exports.verifySignature = verifySignature;
exports.createSigningPreview = createSigningPreview;
const nacl = __importStar(require("tweetnacl"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3_js_1 = require("@solana/web3.js");
const keyManager = __importStar(require("./keyManager"));
const txProcessor = __importStar(require("./txProcessor"));
/**
 * Sign a transaction
 * @param transactionFilePath - Path to unsigned transaction file
 * @param keyName - Name of the keypair to use
 * @returns Signature and output file path
 */
async function signTransaction(transactionFilePath, keyName) {
    // Load keypair
    const keypair = keyManager.loadKeypair(keyName);
    // Parse transaction
    const txData = txProcessor.parseTransactionFile(transactionFilePath);
    // Get message buffer
    const messageBuffer = txData.messageBuffer;
    // Sign the message
    const signature = nacl.sign.detached(new Uint8Array(messageBuffer), new Uint8Array(keypair.secretKey));
    const signatureBase64 = Buffer.from(signature).toString('base64');
    // Prepare signed transaction data (self-contained for broadcasting)
    const signedTxData = {
        signature: signatureBase64,
        publicKey: keypair.publicKey.toBase58(),
        signedAt: new Date().toISOString(),
        network: txData.network,
        description: txData.description,
        messageBase64: txData.messageBase64,
        meta: txData.details.amountFormatted ? {
            // Try to reconstruct meta from details if available
            tokenSymbol: txData.details.type.includes('Token') ? 'TOKEN' : 'SOL',
            decimals: txData.details.type.includes('Token') ? 6 : 9,
            amount: parseFloat(txData.details.amountFormatted?.replace(/[^0-9.]/g, '') || '0')
        } : undefined
    };
    // Save signed transaction
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const outputFilename = `signed-tx-${Date.now()}.json`;
    const outputPath = path.join(uploadsDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(signedTxData, null, 2));
    return {
        signature: signatureBase64,
        publicKey: keypair.publicKey.toBase58(),
        outputPath,
        outputFilename,
        signedAt: signedTxData.signedAt
    };
}
/**
 * Verify a signature
 * @param messageBase64 - Base64 encoded message
 * @param signatureBase64 - Base64 encoded signature
 * @param publicKeyBase58 - Public key in base58
 * @returns True if signature is valid
 */
function verifySignature(messageBase64, signatureBase64, publicKeyBase58) {
    try {
        const message = Buffer.from(messageBase64, 'base64');
        const signature = Buffer.from(signatureBase64, 'base64');
        const publicKey = new web3_js_1.PublicKey(publicKeyBase58);
        return nacl.sign.detached.verify(new Uint8Array(message), new Uint8Array(signature), new Uint8Array(publicKey.toBuffer()));
    }
    catch (error) {
        return false;
    }
}
/**
 * Create a preview of what will be signed
 * @param transactionFilePath - Path to transaction file
 * @param keyName - Name of keypair to use
 * @returns Preview data
 */
function createSigningPreview(transactionFilePath, keyName) {
    // Parse transaction
    const txData = txProcessor.parseTransactionFile(transactionFilePath);
    // Get public key
    const publicKey = keyManager.getPublicKey(keyName);
    // Extract parties
    const parties = extractParties(txData);
    return {
        signer: {
            name: keyName,
            publicKey,
            publicKeyShort: txProcessor.shortenAddress(publicKey)
        },
        transaction: {
            type: txData.details.type,
            network: txData.details.network,
            description: txData.details.description,
            amount: txData.details.amountFormatted || 'N/A',
            sender: parties.sender,
            senderShort: parties.senderShort,
            recipient: parties.recipient,
            recipientShort: parties.recipientShort,
            feePayer: txData.details.feePayer,
            feePayerShort: txProcessor.shortenAddress(txData.details.feePayer)
        },
        security: {
            verifiedSigner: publicKey === parties.sender,
            warning: publicKey !== parties.sender ?
                'WARNING: Signing key does not match transaction sender!' : null
        }
    };
}
/**
 * Extract sender and recipient from transaction
 * @param txData - Parsed transaction data
 * @returns Sender and recipient info
 */
function extractParties(txData) {
    // Fee payer is typically the sender (we can't access message directly here)
    // For simplicity, we'll use feePayer as sender
    const sender = txData.details.feePayer;
    // Recipient is unknown from just the details
    const recipient = null;
    return {
        sender,
        senderShort: txProcessor.shortenAddress(sender),
        recipient,
        recipientShort: null
    };
}
//# sourceMappingURL=signer.js.map