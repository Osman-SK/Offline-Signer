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
 * Sign a transaction
 * @param transactionFilePath - Path to unsigned transaction file
 * @param keyName - Name of the keypair to use
 * @returns Signature and output file path
 */
export declare function signTransaction(transactionFilePath: string, keyName: string): Promise<SignResult>;
/**
 * Verify a signature
 * @param messageBase64 - Base64 encoded message
 * @param signatureBase64 - Base64 encoded signature
 * @param publicKeyBase58 - Public key in base58
 * @returns True if signature is valid
 */
export declare function verifySignature(messageBase64: string, signatureBase64: string, publicKeyBase58: string): boolean;
/**
 * Create a preview of what will be signed
 * @param transactionFilePath - Path to transaction file
 * @param keyName - Name of keypair to use
 * @returns Preview data
 */
export declare function createSigningPreview(transactionFilePath: string, keyName: string): SigningPreview;
export {};
//# sourceMappingURL=signer.d.ts.map