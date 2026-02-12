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
exports.parseTransactionFile = parseTransactionFile;
exports.shortenAddress = shortenAddress;
exports.getTransactionDetails = getTransactionDetails;
exports.validateTransactionFile = validateTransactionFile;
exports.extractParties = extractParties;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
/**
 * Parse transaction file (unsigned-tx.json format)
 * @param filePath - Path to transaction file
 * @returns Parsed transaction data
 */
function parseTransactionFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Transaction file not found: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let txData;
    try {
        txData = JSON.parse(fileContent);
    }
    catch (error) {
        throw new Error('Invalid JSON file format');
    }
    // Validate required fields
    if (!txData.messageBase64) {
        throw new Error('Missing messageBase64 field in transaction file');
    }
    if (!txData.network) {
        throw new Error('Missing network field in transaction file');
    }
    // Deserialize the message to extract details
    const messageBuffer = Buffer.from(txData.messageBase64, 'base64');
    const message = web3_js_1.VersionedMessage.deserialize(messageBuffer);
    // Extract human-readable details
    const details = extractTransactionDetails(message, txData);
    return {
        ...txData,
        messageBuffer,
        message,
        details,
        rawFilePath: filePath
    };
}
/**
 * Extract human-readable transaction details
 * @param message - Deserialized transaction message
 * @param txData - Original transaction data
 * @returns Human-readable details
 */
function extractTransactionDetails(message, txData) {
    const details = {
        network: txData.network.toUpperCase(),
        description: txData.description || 'Unknown transaction',
        feePayer: message.staticAccountKeys[0].toBase58(),
        instructions: [],
        accounts: [],
        type: 'Unknown'
    };
    // Extract account keys
    message.staticAccountKeys.forEach((key, index) => {
        details.accounts.push({
            index,
            pubkey: key.toBase58(),
            pubkeyShort: shortenAddress(key.toBase58())
        });
    });
    // If meta information is available, extract it
    if (txData.meta) {
        details.amount = txData.meta.amount;
        details.tokenSymbol = txData.meta.tokenSymbol || 'SOL';
        details.decimals = txData.meta.decimals || 9;
        // Format amount for display
        if (details.tokenSymbol === 'SOL') {
            details.amountFormatted = `${details.amount} SOL`;
        }
        else {
            details.amountFormatted = `${details.amount} ${details.tokenSymbol}`;
        }
    }
    // Extract instruction details
    message.compiledInstructions.forEach((instruction, idx) => {
        const programId = message.staticAccountKeys[instruction.programIdIndex];
        details.instructions.push({
            index: idx,
            programId: programId.toBase58(),
            programIdShort: shortenAddress(programId.toBase58()),
            accounts: instruction.accountKeyIndexes,
            data: Buffer.from(instruction.data).toString('hex')
        });
    });
    // Try to identify transaction type
    details.type = identifyTransactionType(message, txData);
    return details;
}
/**
 * Identify transaction type
 * @param message - Transaction message
 * @param txData - Transaction data
 * @returns Transaction type
 */
function identifyTransactionType(_message, txData) {
    if (txData.meta?.tokenSymbol === 'SOL') {
        return 'SOL Transfer';
    }
    else if (txData.meta?.tokenSymbol) {
        return 'SPL Token Transfer';
    }
    else if (txData.description?.includes('Transfer')) {
        return 'Transfer';
    }
    else {
        return 'Unknown';
    }
}
/**
 * Shorten an address for display
 * @param address - Full address
 * @returns Shortened address
 */
function shortenAddress(address) {
    if (!address || address.length < 10)
        return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
/**
 * Get transaction details for display
 * @param filePath - Path to transaction file
 * @returns Transaction details
 */
function getTransactionDetails(filePath) {
    const txData = parseTransactionFile(filePath);
    return txData.details;
}
/**
 * Validate transaction file format
 * @param filePath - Path to transaction file
 * @returns True if valid
 */
function validateTransactionFile(filePath) {
    try {
        parseTransactionFile(filePath);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Extract sender and recipient from transaction
 * @param txData - Parsed transaction data
 * @returns Sender and recipient info
 */
function extractParties(txData) {
    const message = txData.message;
    // Fee payer is typically the sender
    const sender = message.staticAccountKeys[0].toBase58();
    // Recipient is typically in the instructions
    let recipient = null;
    // For simple transfers, recipient is usually the second account
    if (message.staticAccountKeys.length > 1) {
        recipient = message.staticAccountKeys[1].toBase58();
    }
    return {
        sender,
        senderShort: shortenAddress(sender),
        recipient,
        recipientShort: recipient ? shortenAddress(recipient) : null
    };
}
//# sourceMappingURL=txProcessor.js.map