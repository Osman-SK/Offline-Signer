import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, NonceAccount, TransactionInstruction, TransactionMessage, Connection, MessageV0 } from "@solana/web3.js";
import { getConnection } from "../utils/connection";
import { saveJson, UnsignedTxJson } from "../utils/io";

export async function constructSolTransfer(
  env: string,
  senderStr: string,
  recipientStr: string,
  nonceStr: string,
  amount: number
) {
  const connection: Connection = getConnection(env);
  const sender: PublicKey = new PublicKey(senderStr);
  const recipient: PublicKey = new PublicKey(recipientStr);
  const noncePubkey: PublicKey = new PublicKey(nonceStr);

  console.log(`\nConstructing SOL Transfer on ${env.toUpperCase()}`);
  console.log(`  From:   ${sender.toBase58()}`);
  console.log(`  To:     ${recipient.toBase58()}`);
  console.log(`  Amount: ${amount} SOL`);

  // 1. Fetch Nonce Data (This gets us the "Durable Blockhash")
  console.log(`Fetching Nonce Hash from ${noncePubkey.toBase58()}...`);
  const nonceInfo = await connection.getAccountInfo(noncePubkey);
  
  if (!nonceInfo) {
      throw new Error(`Nonce account ${nonceStr} not found. Did you run create-nonce?`);
  }
  
  const nonceAccount: NonceAccount = NonceAccount.fromAccountData(nonceInfo.data);

  // 2. Build Tx
  const ix: TransactionInstruction[] = [];
  ix.push(
    // IMPORTANT: The "authorizedPubkey" must match your Cold Wallet
    SystemProgram.nonceAdvance({
      noncePubkey: noncePubkey,
      authorizedPubkey: sender,
    })
  );
  ix.push(
    SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL
    })
  )

  // 3. Compile V0 Message
  const messageV0: MessageV0 = new TransactionMessage({
    payerKey: sender,
    recentBlockhash: nonceAccount.nonce,
    instructions: ix 
  }).compileToV0Message();

  // 4. Serialize & Save with Metadata
  const payload: UnsignedTxJson = {
    description: `Transfer ${amount} SOL to ${recipientStr.slice(0,6)}...`,
    network: env,
    messageBase64: Buffer.from(messageV0.serialize()).toString("base64"),
    meta: {
      tokenSymbol: "SOL",
      decimals: 9,
      amount
    }
  };

  saveJson("unsigned-tx.json", payload);
  console.log(`\nNEXT STEP: Copy 'unsigned-tx.json' to your OFFLINE machine.`);
}