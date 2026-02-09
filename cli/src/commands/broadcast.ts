import { Connection, VersionedTransaction, VersionedMessage, PublicKey } from '@solana/web3.js';
import * as fs from "fs";
import { getConnection } from "../utils/connection";
import { loadJson, UnsignedTxJson } from "../utils/io";

export async function broadcast(
    env: string, 
    unsignedPath: string, 
    signaturePath: string
) {
    console.log(`\nBroadcasting Transaction on ${env.toUpperCase()}...`);

    const connection: Connection = getConnection(env);

    // 1. Load Message
    const unsignedData: UnsignedTxJson = loadJson<UnsignedTxJson>(unsignedPath);
    const messageBuffer = Buffer.from(unsignedData.messageBase64, 'base64');
    const messageV0: VersionedMessage = VersionedMessage.deserialize(messageBuffer);

    // 2. Load Signature
    const signatureData = JSON.parse(fs.readFileSync(signaturePath, 'utf-8'));
    const signatureBuffer = Buffer.from(signatureData.signature, 'base64');
    const signerPubkey: PublicKey = new PublicKey(signatureData.publicKey);

    console.log(`  Signer: ${signerPubkey.toBase58()}`);

    // 3. Create Versioned Transaction
    const transaction: VersionedTransaction = new VersionedTransaction(messageV0);

    // 4. Insert Signature
    const signerIndex: number = messageV0.staticAccountKeys.findIndex(key => 
        key.equals(signerPubkey)
    );

    if (signerIndex === -1) {
        console.error("Error: The signature provided does not belong to any account required by this transaction.");
        process.exit(1);
    }

    transaction.signatures[signerIndex] = signatureBuffer;

    // 5. Send
    try {
        const txid = await connection.sendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        console.log(`\nTransaction Sent!`);
        console.log(`Explorer: https://explorer.solana.com/tx/${txid}?cluster=${env}`);
        
        await connection.confirmTransaction(txid);
        console.log("  Confirmed.");

    } catch (err: any) {
        console.error("\nBroadcast Failed:");
        if (err) console.error(err);
        else console.error(err);
    }
}