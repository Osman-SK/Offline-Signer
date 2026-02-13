import * as nacl from 'tweetnacl';
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import * as keyManager from './keyManager';
import * as txProcessor from './txProcessor';

/**
 * Transaction parties
 */
interface TransactionParties {
  sender: string;
  senderShort: string;
  recipient: string | null;
  recipientShort: string | null;
}

/**
 * Signing preview data
 */
interface SigningPreview {
  signer: {
    name: string;
    publicKey: string;
    publicKeyShort: string;
  };
  transaction: {
    type: string;
    network: string;
    description: string;
    amount: string;
    sender: string;
    senderShort: string;
    recipient: string | null;
    recipientShort: string | null;
    feePayer: string;
    feePayerShort: string;
  };
  security: {
    verifiedSigner: boolean;
    warning: string | null;
  };
}

/**
 * Sign result
 */
interface SignResult {
  signature: string;
  publicKey: string;
  outputPath: string;
  outputFilename: string;
  signedAt: string;
}

/**
 * Parsed transaction data (minimal interface)
 */
interface ParsedTransaction {
  description: string;
  network: string;
  messageBase64: string;
  messageBuffer: Buffer;
  details: {
    type: string;
    network: string;
    description: string;
    amountFormatted?: string;
    feePayer: string;
  };
}

/**
 * Sign a transaction
 * @param transactionFilePath - Path to unsigned transaction file
 * @param keyName - Name of the keypair to use
 * @returns Signature and output file path
 */
export async function signTransaction(
  transactionFilePath: string,
  keyName: string
): Promise<SignResult> {
  // Load keypair
  const keypair = keyManager.loadKeypair(keyName);
  
  // Parse transaction
  const txData = txProcessor.parseTransactionFile(transactionFilePath) as ParsedTransaction;
  
  // Get message buffer
  const messageBuffer = txData.messageBuffer;
  
  // Sign the message
  const signature = nacl.sign.detached(
    new Uint8Array(messageBuffer),
    new Uint8Array(keypair.secretKey)
  );
  const signatureBase64 = Buffer.from(signature).toString('base64');
  
  // Prepare signed transaction data
  const signedTxData = {
    signature: signatureBase64,
    publicKey: keypair.publicKey.toBase58(),
    signedAt: new Date().toISOString(),
    network: txData.network,
    description: txData.description
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
export function verifySignature(
  messageBase64: string,
  signatureBase64: string,
  publicKeyBase58: string
): boolean {
  try {
    const message = Buffer.from(messageBase64, 'base64');
    const signature = Buffer.from(signatureBase64, 'base64');
    const publicKey = new PublicKey(publicKeyBase58);
    
    return nacl.sign.detached.verify(
      new Uint8Array(message),
      new Uint8Array(signature),
      new Uint8Array(publicKey.toBuffer())
    );
  } catch (error) {
    return false;
  }
}

/**
 * Create a preview of what will be signed
 * @param transactionFilePath - Path to transaction file
 * @param keyName - Name of keypair to use
 * @returns Preview data
 */
export function createSigningPreview(
  transactionFilePath: string,
  keyName: string
): SigningPreview {
  // Parse transaction
  const txData = txProcessor.parseTransactionFile(transactionFilePath) as ParsedTransaction;
  
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
function extractParties(txData: ParsedTransaction): TransactionParties {
  // Fee payer is typically the sender (we can't access message directly here)
  // For simplicity, we'll use feePayer as sender
  const sender = txData.details.feePayer;
  
  // Recipient is unknown from just the details
  const recipient: string | null = null;

  return {
    sender,
    senderShort: txProcessor.shortenAddress(sender),
    recipient,
    recipientShort: null
  };
}
