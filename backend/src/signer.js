const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');
const keyManager = require('./keyManager');
const txProcessor = require('./txProcessor');

/**
 * Sign a transaction
 * @param {string} transactionFilePath - Path to unsigned transaction file
 * @param {string} keyName - Name of the keypair to use
 * @param {string} password - Password to decrypt the keypair
 * @returns {object} - Signature and output file path
 */
async function signTransaction(transactionFilePath, keyName, password) {
  // Load keypair
  const keypair = keyManager.loadKeypair(keyName, password);
  
  // Parse transaction
  const txData = txProcessor.parseTransactionFile(transactionFilePath);
  
  // Get message buffer
  const messageBuffer = txData.messageBuffer;
  
  // Sign the message
  const signature = nacl.sign.detached(messageBuffer, keypair.secretKey);
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
    outputPath: outputPath,
    outputFilename: outputFilename,
    signedAt: signedTxData.signedAt
  };
}

/**
 * Verify a signature
 * @param {string} messageBase64 - Base64 encoded message
 * @param {string} signatureBase64 - Base64 encoded signature
 * @param {string} publicKeyBase58 - Public key in base58
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(messageBase64, signatureBase64, publicKeyBase58) {
  try {
    const message = Buffer.from(messageBase64, 'base64');
    const signature = Buffer.from(signatureBase64, 'base64');
    const { PublicKey } = require('@solana/web3.js');
    const publicKey = new PublicKey(publicKeyBase58);
    
    return nacl.sign.detached.verify(
      message,
      signature,
      publicKey.toBuffer()
    );
  } catch (error) {
    return false;
  }
}

/**
 * Create a preview of what will be signed
 * @param {string} transactionFilePath - Path to transaction file
 * @param {string} keyName - Name of keypair to use
 * @returns {object} - Preview data
 */
function createSigningPreview(transactionFilePath, keyName) {
  // Parse transaction
  const txData = txProcessor.parseTransactionFile(transactionFilePath);
  
  // Get public key
  const publicKey = keyManager.getPublicKey(keyName);
  
  // Extract parties
  const parties = txProcessor.extractParties(txData);
  
  return {
    signer: {
      name: keyName,
      publicKey: publicKey,
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

module.exports = {
  signTransaction,
  verifySignature,
  createSigningPreview
};