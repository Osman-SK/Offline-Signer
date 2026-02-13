import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, NONCE_ACCOUNT_LENGTH, Keypair } from '@solana/web3.js';
import type { TabProps, StatusMessage, NonceAccountInfo } from '../types';
import { downloadJson } from '../utils/download';
import { WalletButton } from './WalletButton';

interface CreateNonceTabProps extends TabProps {
  onNonceCreated: (nonce: NonceAccountInfo) => void;
}

export const CreateNonceTab: React.FC<CreateNonceTabProps> = ({ network, onNonceCreated }) => {
  console.log('[CreateNonceTab] Network:', network);
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [authorityPubkey, setAuthorityPubkey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [createdNonce, setCreatedNonce] = useState<NonceAccountInfo | null>(null);

  const handleCreateNonce = async () => {
    console.log('[CreateNonceTab] Starting nonce account creation...');
    console.log('[CreateNonceTab] Connected:', connected, 'PublicKey:', publicKey?.toBase58());
    
    if (!connected || !publicKey) {
      console.log('[CreateNonceTab] Wallet not connected');
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (!authorityPubkey.trim()) {
      console.log('[CreateNonceTab] Authority pubkey is empty');
      setStatus({ type: 'error', message: 'Please enter the cold wallet authority public key' });
      return;
    }

    try {
      const authority = new PublicKey(authorityPubkey);
      console.log('[CreateNonceTab] Authority public key validated:', authority.toBase58());
    } catch (error) {
      console.error('[CreateNonceTab] Invalid authority public key:', authorityPubkey);
      setStatus({ type: 'error', message: 'Invalid authority public key' });
      return;
    }

    setIsCreating(true);
    setStatus({ type: 'info', message: 'Creating nonce account...' });

    try {
      const authority = new PublicKey(authorityPubkey);
      
      // Generate a new keypair for the nonce account
      const nonceKeypair = Keypair.generate();
      console.log('[CreateNonceTab] Generated nonce keypair:', nonceKeypair.publicKey.toBase58());
      
      // Get minimum rent exemption
      const minRent = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
      console.log('[CreateNonceTab] Minimum rent required:', minRent / 1e9, 'SOL');
      
      // Build the transaction
      const { Transaction } = await import('@solana/web3.js');
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: nonceKeypair.publicKey,
          lamports: minRent,
          space: NONCE_ACCOUNT_LENGTH,
          programId: SystemProgram.programId,
        }),
        SystemProgram.nonceInitialize({
          noncePubkey: nonceKeypair.publicKey,
          authorizedPubkey: authority,
        })
      );
      
      // Set fee payer
      transaction.feePayer = publicKey;
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      console.log('[CreateNonceTab] Got recent blockhash:', blockhash);
      
      // Partial sign with nonce keypair (since we created it)
      transaction.partialSign(nonceKeypair);
      console.log('[CreateNonceTab] Transaction partially signed with nonce keypair');
      
      // Sign with connected wallet
      if (signTransaction) {
        console.log('[CreateNonceTab] Requesting wallet signature...');
        const signed = await signTransaction(transaction);
        console.log('[CreateNonceTab] Transaction signed by wallet');
        
        // Send the transaction
        console.log('[CreateNonceTab] Sending transaction...');
        const signature = await connection.sendRawTransaction(signed.serialize());
        console.log('[CreateNonceTab] Transaction sent, signature:', signature);
        
        // Wait for confirmation
        console.log('[CreateNonceTab] Waiting for confirmation...');
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('[CreateNonceTab] Transaction confirmed!');
        
        const nonceInfo: NonceAccountInfo = {
          address: nonceKeypair.publicKey.toBase58(),
          authority: authority.toBase58(),
          savedAt: new Date().toISOString()
        };
        
        setCreatedNonce(nonceInfo);
        
        // Download the nonce info
        const filename = `nonce-account-${Date.now()}.json`;
        downloadJson(filename, nonceInfo);
        console.log('[CreateNonceTab] Downloaded nonce info as:', filename);
        
        // Save to localStorage via parent callback
        onNonceCreated(nonceInfo);
        
        setStatus({ 
          type: 'success', 
          message: `Nonce account created successfully! Address: ${nonceKeypair.publicKey.toBase58()}` 
        });
      }
    } catch (error) {
      console.error('[CreateNonceTab] Failed to create nonce account:', error);
      setStatus({ 
        type: 'error', 
        message: `Failed to create nonce account: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="tab-content active">
      <section className="card">
        <h2>Create Nonce Account</h2>
        <p>
          Create a durable nonce account for offline signing. This allows transactions to be valid for hours or days instead of minutes.
        </p>

        <div className="form-group">
          <label>Connected Wallet (Payer):</label>
          <WalletButton />
          <small>
            This wallet will pay for the nonce account rent (~0.0015 SOL). Click Disconnect to switch wallets.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="authority-pubkey">Authority (Cold Wallet):</label>
          <input
            type="text"
            id="authority-pubkey"
            value={authorityPubkey}
            onChange={(e) => setAuthorityPubkey(e.target.value)}
            placeholder="Enter cold wallet public key"
            disabled={isCreating}
          />
          <small>The cold wallet that will authorize transactions using this nonce</small>
        </div>

        <button
          onClick={handleCreateNonce}
          disabled={isCreating || !connected}
          className="btn btn-primary"
        >
          {isCreating ? 'Creating...' : 'Create Nonce Account'}
        </button>

        {status && (
          <div className={`status-message ${status.type}`} style={{ position: 'static', marginTop: '20px' }}>
            {status.message}
          </div>
        )}

        {createdNonce && (
          <div className="result-info" style={{ marginTop: '20px' }}>
            <h3>Nonce Account Created!</h3>
            <p><strong>Address:</strong> {createdNonce.address}</p>
            <p><strong>Authority:</strong> {createdNonce.authority}</p>
            <p style={{ marginTop: '10px' }}>
              <small>The nonce account details have been downloaded to your computer and saved to the app. Save this file - you'll need the nonce address to create transactions.</small>
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
