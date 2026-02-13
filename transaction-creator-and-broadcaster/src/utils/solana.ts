import {
  Connection,
  PublicKey,
  SystemProgram,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  TransactionMessage,
  MessageV0,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  VersionedMessage
} from '@solana/web3.js';
import type { SignedTransaction } from '../types';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
  Mint
} from '@solana/spl-token';

export const getConnection = (network: string): Connection => {
  let endpoint: string;
  
  switch (network) {
    case 'devnet':
      endpoint = 'https://api.devnet.solana.com';
      break;
    case 'mainnet':
      endpoint = 'https://api.mainnet-beta.solana.com';
      break;
    case 'testnet':
      endpoint = 'https://api.testnet.solana.com';
      break;
    default:
      endpoint = network;
  }

  return new Connection(endpoint, 'confirmed');
};

export const createNonceAccountInstructions = async (
  connection: Connection,
  payer: PublicKey,
  authority: PublicKey
): Promise<{ instructions: TransactionInstruction[]; nonceKeypair: { publicKey: PublicKey; secretKey: Uint8Array } }> => {
  const minRent = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
  
  // Generate a new keypair for the nonce account
  // Note: In a real implementation, the secret key would be managed by the wallet
  // For this demo, we're just creating the instructions - the actual nonce account
  // creation happens via wallet transaction
  const noncePubkey = new PublicKey('11111111111111111111111111111111'); // placeholder
  
  const instructions: TransactionInstruction[] = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: noncePubkey,
      lamports: minRent,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: noncePubkey,
      authorizedPubkey: authority,
    })
  ];

  // Return placeholder - actual implementation needs wallet integration
  return { 
    instructions, 
    nonceKeypair: { 
      publicKey: noncePubkey, 
      secretKey: new Uint8Array(64) 
    } 
  };
};

export const constructSolTransferMessage = async (
  connection: Connection,
  sender: PublicKey,
  recipient: PublicKey,
  noncePubkey: PublicKey,
  amount: number
): Promise<{ messageV0: MessageV0; description: string }> => {
  // Fetch Nonce Data
  const nonceInfo = await connection.getAccountInfo(noncePubkey);
  
  if (!nonceInfo) {
    throw new Error(`Nonce account ${noncePubkey.toBase58()} not found. Create it first.`);
  }
  
  const nonceAccount = NonceAccount.fromAccountData(nonceInfo.data);

  // Build Instructions
  const instructions: TransactionInstruction[] = [
    SystemProgram.nonceAdvance({
      noncePubkey: noncePubkey,
      authorizedPubkey: sender,
    }),
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: amount * LAMPORTS_PER_SOL
    })
  ];

  // Compile V0 Message
  const messageV0 = new TransactionMessage({
    payerKey: sender,
    recentBlockhash: nonceAccount.nonce,
    instructions: instructions
  }).compileToV0Message();

  const description = `Transfer ${amount} SOL to ${recipient.toBase58().slice(0, 8)}...`;

  return { messageV0, description };
};

export const constructTokenTransferMessage = async (
  connection: Connection,
  sender: PublicKey,
  recipient: PublicKey,
  mint: PublicKey,
  noncePubkey: PublicKey,
  amount: number,
  feePayer?: PublicKey
): Promise<{ messageV0: MessageV0; description: string; decimals: number; symbol: string }> => {
  const actualFeePayer = feePayer || sender;
  
  // Fetch Mint Info
  const mintInfo: Mint = await getMint(connection, mint);
  const decimals = mintInfo.decimals;
  const amountRaw = BigInt(Math.round(amount * Math.pow(10, decimals)));
  
  // Fetch token symbol (simplified - in production would use token registry)
  const symbol = 'TOKEN';

  // Fetch Nonce
  const nonceAccountInfo = await connection.getAccountInfo(noncePubkey);
  if (!nonceAccountInfo) {
    throw new Error('Nonce account not found. Create it first.');
  }
  const nonceAccount = NonceAccount.fromAccountData(nonceAccountInfo.data);

  // Build Instructions
  const instructions: TransactionInstruction[] = [];
  
  instructions.push(
    SystemProgram.nonceAdvance({
      noncePubkey: noncePubkey,
      authorizedPubkey: sender,
    })
  );

  const sourceATA = await getAssociatedTokenAddress(mint, sender);
  const destinationATA = await getAssociatedTokenAddress(mint, recipient);

  const [sourceAccount, destAccount] = await connection.getMultipleAccountsInfo([
    sourceATA,
    destinationATA
  ]);

  if (!sourceAccount) {
    throw new Error(`Source token account (${sourceATA.toBase58()}) does not exist.`);
  }

  if (!destAccount) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        actualFeePayer,
        destinationATA,
        recipient,
        mint
      )
    );
  }

  instructions.push(
    createTransferInstruction(
      sourceATA,
      destinationATA,
      sender,
      amountRaw
    )
  );

  // Compile V0 Message
  const messageV0 = new TransactionMessage({
    payerKey: actualFeePayer,
    recentBlockhash: nonceAccount.nonce,
    instructions: instructions
  }).compileToV0Message();

  const description = `Transfer ${amount} ${symbol} to ${recipient.toBase58().slice(0, 8)}...`;

  return { messageV0, description, decimals, symbol };
};

export const broadcastSignedTransaction = async (
  connection: Connection,
  signedData: SignedTransaction
): Promise<string> => {
  const messageBuffer = Buffer.from(signedData.messageBase64, 'base64');
  const messageV0 = VersionedMessage.deserialize(messageBuffer);

  const signatureBuffer = Buffer.from(signedData.signature, 'base64');
  const signerPubkey = new PublicKey(signedData.publicKey);

  const transaction = new VersionedTransaction(messageV0);

  const signerIndex = messageV0.staticAccountKeys.findIndex(key =>
    key.equals(signerPubkey)
  );

  if (signerIndex === -1) {
    throw new Error('Signature does not belong to any account required by this transaction.');
  }

  transaction.signatures[signerIndex] = Uint8Array.from(signatureBuffer);

  const txid = await connection.sendTransaction(transaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });

  return txid;
};
