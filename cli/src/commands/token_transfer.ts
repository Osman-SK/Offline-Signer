import { 
    PublicKey, 
    SystemProgram,
    NonceAccount, 
    Connection,
    TransactionInstruction,
    TransactionMessage,
    MessageV0,
} from '@solana/web3.js';
import {
    createAssociatedTokenAccountInstruction, 
    createTransferInstruction, 
    getAssociatedTokenAddress, 
    getMint, 
    Mint
} from '@solana/spl-token';
import { getConnection } from "../utils/connection";
import { getTokenSymbol } from "../utils/tokenSymbol"
import { saveJson, UnsignedTxJson } from "../utils/io";

export async function constructTokenTransfer(
    env: string,
    senderStr: string,
    recipientStr: string,
    mintStr: string,
    amount: number,
    nonceStr: string,
    feePayerStr?: string
) {
    const connection: Connection = getConnection(env);
    
    const sender: PublicKey = new PublicKey(senderStr);
    const recipient: PublicKey = new PublicKey(recipientStr);
    const mint: PublicKey = new PublicKey(mintStr);
    const noncePubkey: PublicKey = new PublicKey(nonceStr);
    const feePayer: PublicKey = feePayerStr ? new PublicKey(feePayerStr) : sender;

    console.log(`\nConstructing Token Transfer on ${env.toUpperCase()}`);
    console.log(`  Mint: ${mint.toBase58()}`);

    // 1. Fetch Mint Info & Calculate Amount
    const mintInfo: Mint = await getMint(connection, mint);
    const decimals: number = mintInfo.decimals;
    const amountRaw = BigInt(Math.round(amount * Math.pow(10, decimals)));
    const symbol = await getTokenSymbol(connection, mint);

    // 2. Fetch Nonce
    const nonceAccountInfo = await connection.getAccountInfo(noncePubkey);
    if (!nonceAccountInfo) throw new Error("Nonce account not found. Run 'create-nonce' first.");
    const nonceAccount: NonceAccount = NonceAccount.fromAccountData(nonceAccountInfo.data);


    // 3. Instructions
    const ix: TransactionInstruction[] = [];   
    ix.push(
        SystemProgram.nonceAdvance({
            noncePubkey: noncePubkey,
            authorizedPubkey: sender,
        })
    );

    const sourceATA: PublicKey = await getAssociatedTokenAddress(mint, sender);
    const destinationATA: PublicKey = await getAssociatedTokenAddress(mint, recipient);

    const [sourceAccount, destAccount] = await connection.getMultipleAccountsInfo([
        sourceATA, 
        destinationATA
    ]);    
    if (!sourceAccount) {
        throw new Error(`\nERROR: Your source token account (${sourceATA.toBase58()}) does not exist. You don't have these tokens.`);
    }    
    if (!destAccount) {
        ix.push(
            createAssociatedTokenAccountInstruction(
                feePayer,       
                destinationATA, 
                recipient,      
                mint           
            )
        );
    }

    ix.push(
        createTransferInstruction(
            sourceATA,
            destinationATA,
            sender,
            amountRaw
        )
    );

    // 4. Compile to V0 message
    const messageV0: MessageV0 = new TransactionMessage({
        payerKey: feePayer,
        recentBlockhash: nonceAccount.nonce,
        instructions: ix  
    }).compileToV0Message();

    // 4. Save
    const payload: UnsignedTxJson = {
        description: `Transfer ${amount} Tokens to ${recipientStr.slice(0, 8)}...`,
        network: env,
        messageBase64: Buffer.from(messageV0.serialize()).toString("base64"),
        meta: {
            tokenSymbol: symbol,
            decimals: decimals,
            amount
        }
    };

    saveJson("unsigned-tx.json", payload);
    console.log(`NEXT STEP: Move 'unsigned-tx.json' to your OFFLINE machine.`);
}