import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import type { TabProps, StatusMessage, UnsignedTransaction, NonceAccountInfo } from '../types';
import { getConnection, constructTokenTransferMessage } from '../utils/solana';
import { downloadJson } from '../utils/download';

interface TokenTransferTabProps extends TabProps {
  nonceAccounts: NonceAccountInfo[];
}

// Common token mints for quick select
const COMMON_TOKENS: Record<string, { mint: string; symbol: string; decimals: number }> = {
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6
  },
  USDT: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    decimals: 6
  }
};

export const TokenTransferTab: React.FC<TokenTransferTabProps> = ({ network, nonceAccounts }) => {
  const [senderPubkey, setSenderPubkey] = useState('');
  const [recipient, setRecipient] = useState('');
  const [nonceAddress, setNonceAddress] = useState('');
  const [mintAddress, setMintAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [decimals, setDecimals] = useState(6);
  const [amount, setAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [createdTx, setCreatedTx] = useState<UnsignedTransaction | null>(null);

  const handleQuickSelectToken = (tokenKey: string) => {
    console.log('[TokenTransferTab] Quick select token:', tokenKey);
    const token = COMMON_TOKENS[tokenKey];
    if (token) {
      setMintAddress(token.mint);
      setTokenSymbol(token.symbol);
      setDecimals(token.decimals);
      console.log('[TokenTransferTab] Set token:', token);
    }
  };

  const handleCreateTransaction = async () => {
    console.log('[TokenTransferTab] Starting token transfer creation...');

    if (!senderPubkey.trim()) {
      setStatus({ type: 'error', message: 'Please enter the sender (cold wallet) public key' });
      return;
    }

    let sender: PublicKey;
    try {
      sender = new PublicKey(senderPubkey);
      console.log('[TokenTransferTab] Using cold wallet sender:', sender.toBase58());
    } catch {
      setStatus({ type: 'error', message: 'Invalid sender public key' });
      return;
    }

    if (!recipient.trim() || !nonceAddress.trim() || !mintAddress.trim() || !amount.trim()) {
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
      new PublicKey(mintAddress);
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
      const mintPubkey = new PublicKey(mintAddress);

      console.log('[TokenTransferTab] Constructing token transfer message...');
      console.log('[TokenTransferTab] Sender:', sender.toBase58());
      console.log('[TokenTransferTab] Recipient:', recipientPubkey.toBase58());
      console.log('[TokenTransferTab] Mint:', mintPubkey.toBase58());
      console.log('[TokenTransferTab] Nonce:', noncePubkey.toBase58());
      console.log('[TokenTransferTab] Amount:', amountNum);

      const { messageV0, description } = await constructTokenTransferMessage(
        connection,
        sender,
        recipientPubkey,
        mintPubkey,
        noncePubkey,
        amountNum,
        sender // fee payer is sender
      );

      // Serialize the message
      const serialized = messageV0.serialize();
      const messageBase64 = Buffer.from(serialized).toString('base64');
      console.log('[TokenTransferTab] Message serialized, length:', messageBase64.length);

      const unsignedTx: UnsignedTransaction = {
        description,
        network,
        messageBase64,
        meta: {
          tokenSymbol: tokenSymbol,
          decimals: decimals,
          amount: amountNum
        }
      };

      setCreatedTx(unsignedTx);
      const filename = `unsigned-token-transfer-${Date.now()}.json`;
      downloadJson(filename, unsignedTx);
      console.log('[TokenTransferTab] Downloaded unsigned transaction as:', filename);

      setStatus({ type: 'success', message: 'Unsigned transaction created and downloaded!' });
    } catch (error) {
      console.error('[TokenTransferTab] Failed to create transaction:', error);
      setStatus({
        type: 'error',
        message: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearAll = () => {
    console.log('[TokenTransferTab] Clearing all fields');
    setSenderPubkey('');
    setRecipient('');
    setNonceAddress('');
    setMintAddress('');
    setTokenSymbol('TOKEN');
    setDecimals(6);
    setAmount('');
    setStatus(null);
    setCreatedTx(null);
  };

  return (
    <div className="tab-content active">
      <section className="card">
        <h2>Create Token Transfer</h2>
        <p>
          Create an unsigned SPL token transfer transaction using a durable nonce. This transaction will be signed offline by your cold wallet.
        </p>

        <div className="form-group">
          <label htmlFor="token-sender-pubkey">Sender (Cold Wallet):</label>
          <input
            type="text"
            id="token-sender-pubkey"
            value={senderPubkey}
            onChange={(e) => setSenderPubkey(e.target.value)}
            placeholder="Enter cold wallet public key"
            disabled={isCreating}
          />
          <small>Enter the cold wallet address that will sign this transaction offline</small>
        </div>

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
          <label htmlFor="token-mint">Token Mint Address:</label>
          <input
            type="text"
            id="token-mint"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            placeholder="Enter token mint address"
            disabled={isCreating}
          />
          <small>
            Common mints: {' '}
            {Object.keys(COMMON_TOKENS).map((token) => (
              <button
                key={token}
                onClick={() => handleQuickSelectToken(token)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8em',
                  padding: '4px 8px',
                  marginRight: '5px',
                  display: 'inline-block'
                }}
              >
                {token}
              </button>
            ))}
          </small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label htmlFor="token-symbol">Token Symbol:</label>
            <input
              type="text"
              id="token-symbol"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="TOKEN"
              disabled={isCreating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="token-decimals">Decimals:</label>
            <input
              type="number"
              id="token-decimals"
              value={decimals}
              onChange={(e) => setDecimals(parseInt(e.target.value) || 0)}
              placeholder="6"
              min="0"
              max="9"
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="token-recipient">Recipient:</label>
          <input
            type="text"
            id="token-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient public key"
            disabled={isCreating}
          />
        </div>

        <div className="form-group">
          <label htmlFor="token-amount">Amount:</label>
          <input
            type="number"
            id="token-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step={`0.${'0'.repeat(decimals - 1)}1`}
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
