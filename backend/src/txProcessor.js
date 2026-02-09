const { VersionedMessage, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

/**
 * Parse transaction file (unsigned-tx.json format)
 * @param {string} filePath - Path to transaction file
 * @returns {object} - Parsed transaction data
 */
function parseTransactionFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Transaction file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let txData;
  
  try {
    txData = JSON.parse(fileContent);
  } catch (error) {
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
  const message = VersionedMessage.deserialize(messageBuffer);

  // Extract human-readable details
  const details = extractTransactionDetails(message, txData);

  return {
    ...txData,
    messageBuffer: messageBuffer,
    message: message,
    details: details,
    rawFilePath: filePath
  };
}

/**
 * Extract human-readable transaction details
 * @param {VersionedMessage} message - Deserialized transaction message
 * @param {object} txData - Original transaction data
 * @returns {object} - Human-readable details
 */
function extractTransactionDetails(message, txData) {
  const details = {
    network: txData.network.toUpperCase(),
    description: txData.description || 'Unknown transaction',
    feePayer: message.staticAccountKeys[0].toBase58(),
    instructions: [],
    accounts: []
  };

  // Extract account keys
  message.staticAccountKeys.forEach((key, index) => {
    details.accounts.push({
      index: index,
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
    } else {
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
 * @param {VersionedMessage} message - Transaction message
 * @param {object} txData - Transaction data
 * @returns {string} - Transaction type
 */
function identifyTransactionType(message, txData) {
  if (txData.meta?.tokenSymbol === 'SOL') {
    return 'SOL Transfer';
  } else if (txData.meta?.tokenSymbol) {
    return 'SPL Token Transfer';
  } else if (txData.description?.includes('Transfer')) {
    return 'Transfer';
  } else {
    return 'Unknown';
  }
}

/**
 * Shorten an address for display
 * @param {string} address - Full address
 * @returns {string} - Shortened address
 */
function shortenAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get transaction details for display
 * @param {string} filePath - Path to transaction file
 * @returns {object} - Transaction details
 */
function getTransactionDetails(filePath) {
  const txData = parseTransactionFile(filePath);
  return txData.details;
}

/**
 * Validate transaction file format
 * @param {string} filePath - Path to transaction file
 * @returns {boolean} - True if valid
 */
function validateTransactionFile(filePath) {
  try {
    const txData = parseTransactionFile(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract sender and recipient from transaction
 * @param {object} txData - Parsed transaction data
 * @returns {object} - Sender and recipient info
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
    sender: sender,
    senderShort: shortenAddress(sender),
    recipient: recipient,
    recipientShort: recipient ? shortenAddress(recipient) : null
  };
}

module.exports = {
  parseTransactionFile,
  getTransactionDetails,
  validateTransactionFile,
  extractTransactionDetails,
  extractParties,
  shortenAddress
};