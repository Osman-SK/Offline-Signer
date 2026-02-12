import { VersionedMessage } from '@solana/web3.js';
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
export declare function parseTransactionFile(filePath: string): ParsedTransaction;
/**
 * Shorten an address for display
 * @param address - Full address
 * @returns Shortened address
 */
export declare function shortenAddress(address: string): string;
/**
 * Get transaction details for display
 * @param filePath - Path to transaction file
 * @returns Transaction details
 */
export declare function getTransactionDetails(filePath: string): TransactionDetails;
/**
 * Validate transaction file format
 * @param filePath - Path to transaction file
 * @returns True if valid
 */
export declare function validateTransactionFile(filePath: string): boolean;
/**
 * Extract sender and recipient from transaction
 * @param txData - Parsed transaction data
 * @returns Sender and recipient info
 */
export declare function extractParties(txData: ParsedTransaction): TransactionParties;
export {};
//# sourceMappingURL=txProcessor.d.ts.map