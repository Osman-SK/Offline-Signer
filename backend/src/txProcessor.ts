import { VersionedMessage } from '@solana/web3.js';
import * as fs from 'fs';

/**
 * Account information extracted from transaction
 */
interface AccountInfo {
  index: number;
  pubkey: string;
  pubkeyShort: string;
}

/**
 * Instruction information extracted from transaction
 */
interface InstructionInfo {
  index: number;
  programId: string;
  programIdShort: string;
  accounts: number[];
  data: string;
}

/**
 * Human-readable transaction details
 */
interface TransactionDetails {
  network: string;
  description: string;
  feePayer: string;
  type: string;
  amount?: number;
  tokenSymbol?: string;
  decimals?: number;
  amountFormatted?: string;
  accounts: AccountInfo[];
  instructions: InstructionInfo[];
}

/**
 * Unsigned transaction file format
 */
interface UnsignedTransaction {
  description: string;
  network: string;
  messageBase64: string;
  meta?: {
    tokenSymbol: string;
    decimals: number;
    amount: number;
  };
}

/**
 * Parsed transaction data with deserialized message
 */
interface ParsedTransaction extends UnsignedTransaction {
  messageBuffer: Buffer;
  message: VersionedMessage;
  details: TransactionDetails;
  rawFilePath: string;
}

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
 * Parse transaction file (unsigned-tx.json format)
 * @param filePath - Path to transaction file
 * @returns Parsed transaction data
 */
export function parseTransactionFile(filePath: string): ParsedTransaction {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Transaction file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let txData: UnsignedTransaction;
  
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
function extractTransactionDetails(
  message: VersionedMessage,
  txData: UnsignedTransaction
): TransactionDetails {
  const details: TransactionDetails = {
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
 * @param message - Transaction message
 * @param txData - Transaction data
 * @returns Transaction type
 */
function identifyTransactionType(
  _message: VersionedMessage,
  txData: UnsignedTransaction
): string {
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
 * @param address - Full address
 * @returns Shortened address
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get transaction details for display
 * @param filePath - Path to transaction file
 * @returns Transaction details
 */
export function getTransactionDetails(filePath: string): TransactionDetails {
  const txData = parseTransactionFile(filePath);
  return txData.details;
}

/**
 * Validate transaction file format
 * @param filePath - Path to transaction file
 * @returns True if valid
 */
export function validateTransactionFile(filePath: string): boolean {
  try {
    parseTransactionFile(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract sender and recipient from transaction
 * @param txData - Parsed transaction data
 * @returns Sender and recipient info
 */
export function extractParties(txData: ParsedTransaction): TransactionParties {
  const message = txData.message;
  
  // Fee payer is typically the sender
  const sender = message.staticAccountKeys[0].toBase58();
  
  // Recipient is typically in the instructions
  let recipient: string | null = null;
  
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
