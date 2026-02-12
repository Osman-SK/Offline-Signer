/**
 * Backend-specific type definitions
 */
import { VersionedMessage } from '@solana/web3.js';
/**
 * Extended parsed transaction with Solana types
 */
export interface ParsedTransactionExtended {
    description: string;
    network: string;
    messageBase64: string;
    meta?: {
        tokenSymbol: string;
        decimals: number;
        amount: number;
    };
    messageBuffer: Buffer;
    message: VersionedMessage;
    details: TransactionDetailsExtended;
    rawFilePath: string;
}
/**
 * Extended transaction details
 */
export interface TransactionDetailsExtended {
    network: string;
    description: string;
    feePayer: string;
    type: string;
    amount?: number;
    tokenSymbol?: string;
    decimals?: number;
    amountFormatted?: string;
    accounts: AccountInfoExtended[];
    instructions: InstructionInfoExtended[];
}
/**
 * Extended account info
 */
export interface AccountInfoExtended {
    index: number;
    pubkey: string;
    pubkeyShort: string;
}
/**
 * Extended instruction info
 */
export interface InstructionInfoExtended {
    index: number;
    programId: string;
    programIdShort: string;
    accounts: number[];
    data: string;
}
/**
 * Transaction parties
 */
export interface TransactionPartiesExtended {
    sender: string;
    senderShort: string;
    recipient: string | null;
    recipientShort: string | null;
}
/**
 * Keypair file data structure
 */
export interface KeypairFileData {
    name: string;
    publicKey: string;
    encryptedSecretKey: string;
    createdAt?: string;
    importedAt?: string;
}
/**
 * API Error response
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
}
/**
 * API Success response with data
 */
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}
/**
 * Express request body types
 */
export interface GenerateKeypairBody {
    name: string;
    password: string;
}
export interface ImportKeypairBody {
    name: string;
    privateKey: string;
    password: string;
    format?: 'base58' | 'base64' | 'json';
}
export interface SignTransactionBody {
    filePath: string;
    keyName: string;
    password: string;
    approve: boolean;
}
export interface TransactionDetailsBody {
    filePath: string;
}
//# sourceMappingURL=types.d.ts.map