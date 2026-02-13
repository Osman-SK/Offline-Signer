import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import type { TabProps, StatusMessage, UnsignedTransaction, NonceAccountInfo } from '../types';
import { getConnection, constructSolTransferMessage } from '../utils/solana';
import { downloadJson } from '../utils/download';
import { WalletButton } from './WalletButton';

interface SolTransferTabProps extends TabProps {
  nonceAccounts: NonceAccountInfo[];
}

export const SolTransferTab: React.FC<SolTransferTabProps> = ({ network, nonceAccounts }) => {
  const { publicKey, connected } = useWallet();
  const [useConnectedWallet, setUseConnectedWallet] = useState(false);
  const [senderPubkey, setSenderPubkey] = useState('');
  const [recipient, setRecipient] = useState('');
  const [nonceAddress, setNonceAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [createdTx, setCreatedTx] = useState<UnsignedTransaction | null>(null);

  const handleCreateTransaction = async () => {
    console.log('[SolTransferTab] Starting SOL transfer creation...');
    
    let sender: PublicKey;
    
    if (useConnectedWallet) {
      if (!connected || !publicKey) {
        setStatus({ type: 'error', message: 'Please connect your wallet first' });
        return;
      }
      sender = publicKey;
      console.log('[SolTransferTab] Using connected wallet as sender:', sender.toBase58());
    } else {
      if (!senderPubkey.trim()) {
        setStatus({ type: 'error', message: 'Please enter the sender (cold wallet) public key' });
        return;
      }
      try {
        sender = new PublicKey(senderPubkey);
        console.log('[SolTransferTab] Using manual sender:', sender.toBase58());
      } catch {
        setStatus({ type: 'error', message: 'Invalid sender public key' });
        return;
      }
    }

    if (!recipient.trim() || !nonceAddress.trim() || !amount.trim()) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    try {
      new PublicKey(recipient);
      new PublicKey(nonceAddress);
    } catch {
      setStatus({ type: 'error', message: 'Invalid public key format' });
      return;
    }

    setIsCreating(true);
    setStatus({ type: 'info', message: 'Creating unsigned transaction...' });

    try {
      const connection = getConnection(network);
      const recipientPubkey = new PublicKey(recipient);
      const noncePubkey = new PublicKey(nonceAddress);

      console.log('[SolTransferTab] Constructing SOL transfer message...');
      console.log('[SolTransferTab] Sender:', sender.toBase58());
      console.log('[SolTransferTab] Recipient:', recipientPubkey.toBase58());
      console.log('[SolTransferTab] Nonce:', noncePubkey.toBase58());
      console.log('[SolTransferTab] Amount:', amountNum, 'SOL');

      const { messageV0, description } = await constructSolTransferMessage(
        connection,
        sender,
        recipientPubkey,
        noncePubkey,
        amountNum
      );

      // Serialize the message
      const serialized = messageV0.serialize();
      const messageBase64 = Buffer.from(serialized).toString('base64');
      console.log('[SolTransferTab] Message serialized, length:', messageBase64.length);

      const unsignedTx: UnsignedTransaction = {
        description,
        network,
        messageBase64,
        meta: {
          tokenSymbol: 'SOL',
          decimals: 9,
          amount: amountNum
        }
      };

      setCreatedTx(unsignedTx);
      const filename = `unsigned-sol-transfer-${Date.now()}.json`;
      downloadJson(filename, unsignedTx);
      console.log('[SolTransferTab] Downloaded unsigned transaction as:', filename);

      setStatus({ type: 'success', message: 'Unsigned transaction created and downloaded!' });
    } catch (error) {
      console.error('[SolTransferTab] Failed to create transaction:', error);
      setStatus({ 
        type: 'error', 
        message: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearAll = () => {
    console.log('[SolTransferTab] Clearing all fields');
    setSenderPubkey('');
    setRecipient('');
    setNonceAddress('');
    setAmount('');
    setStatus(null);
    setCreatedTx(null);
  };

  return (
    <div className="tab-content active">
      <section className="card">
        <h2>Create SOL Transfer</h2>
        <p>
          Create an unsigned SOL transfer transaction using a durable nonce. This transaction will be signed offline by your cold wallet.
        </p>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useConnectedWallet}
              onChange={(e) => {
                setUseConnectedWallet(e.target.checked);
                console.log('[SolTransferTab] Use connected wallet:', e.target.checked);
              }}
            />
            <span>Use Connected Wallet</span>
          </label>
          <small>
            {useConnectedWallet 
              ? 'Sender will be your connected wallet' 
              : 'Enter sender manually (offline/air-gapped signing)'}
          </small>
        </div>

        {useConnectedWallet ? (
          <div className="form-group">
            <label>Connected Wallet:</label>
            <WalletButton />
            <small>Click Disconnect to switch wallets</small>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="sender-pubkey">Sender (Cold Wallet):</label>
            <input
              type="text"
              id="sender-pubkey"
              value={senderPubkey}
              onChange={(e) => setSenderPubkey(e.target.value)}
              placeholder="Enter sender public key"
              disabled={isCreating}
            />
            <small>Any valid Solana address - no validation required</small>
          </div>
        )}

        <div className="form-group">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={nonceAddress}
              onChange={(e) => setNonceAddress(e.target.value)}
              disabled={isCreating}
              style={{ flex: 1 }}
            >
              <option value="">Select a nonce account...</option>
              {nonceAccounts.map((nonce) => (
                <option key={nonce.address} value={nonce.address}>
                  {nonce.address.slice(0, 12)}...{nonce.address.slice(-6)} (Auth: {nonce.authority.slice(0, 6)}...)
                </option>
              ))}
            </select>
            <button 
              onClick={handleClearAll}
              className="btn btn-danger"
              style={{ fontSize: '0.85em', padding: '8px 16px' }}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="recipient">Recipient:</label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient public key"
            disabled={isCreating}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (SOL):</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.000000001"
            min="0"
            disabled={isCreating}
          />
        </div>

        <button
          onClick={handleCreateTransaction}
          disabled={isCreating}
          className="btn btn-primary"
        >
          {isCreating ? 'Creating...' : 'Create Transaction'}
        </button>

        {status && (
          <div className={`status-message ${status.type}`} style={{ position: 'static', marginTop: '20px' }}>
            {status.message}
          </div>
        )}

        {createdTx && (
          <div className="result-info" style={{ marginTop: '20px' }}>
            <h3>Transaction Created!</h3>
            <p><strong>Description:</strong> {createdTx.description}</p>
            <p><strong>Network:</strong> {createdTx.network}</p>
            <p><strong>Amount:</strong> {createdTx.meta?.amount} {createdTx.meta?.tokenSymbol}</p>
            <p style={{ marginTop: '10px' }}>
              <small>The unsigned transaction has been downloaded. Transfer it to your offline machine for signing.</small>
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
