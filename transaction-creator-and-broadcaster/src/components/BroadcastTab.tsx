import { useState, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { TabProps, StatusMessage, UnsignedTransaction, SignedTransaction } from '../types';
import { broadcastSignedTransaction } from '../utils/solana';
import { readJsonFile } from '../utils/download';
import { WalletButton } from './WalletButton';

export const BroadcastTab: React.FC<TabProps> = ({ network }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [unsignedFile, setUnsignedFile] = useState<File | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  
  const unsignedInputRef = useRef<HTMLInputElement>(null);
  const signedInputRef = useRef<HTMLInputElement>(null);

  const handleUnsignedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[BroadcastTab] Unsigned file selected:', file.name);
      setUnsignedFile(file);
      setStatus(null);
    }
  };

  const handleSignedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[BroadcastTab] Signed file selected:', file.name);
      setSignedFile(file);
      setStatus(null);
    }
  };

  const handleBroadcast = async () => {
    console.log('[BroadcastTab] Starting broadcast...');
    
    if (!connected || !publicKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (!unsignedFile || !signedFile) {
      setStatus({ type: 'error', message: 'Please upload both unsigned and signed transaction files' });
      return;
    }

    setIsBroadcasting(true);
    setStatus({ type: 'info', message: 'Broadcasting transaction...' });
    setTxSignature(null);

    try {
      console.log('[BroadcastTab] Reading unsigned transaction file...');
      const unsignedData = await readJsonFile<UnsignedTransaction>(unsignedFile);
      console.log('[BroadcastTab] Unsigned data:', {
        description: unsignedData.description,
        network: unsignedData.network,
        messageLength: unsignedData.messageBase64?.length
      });

      console.log('[BroadcastTab] Reading signed transaction file...');
      const signedData = await readJsonFile<SignedTransaction>(signedFile);
      console.log('[BroadcastTab] Signed data:', {
        signature: signedData.signature?.slice(0, 20) + '...',
        publicKey: signedData.publicKey
      });

      // Validate network match
      if (unsignedData.network !== network) {
        console.warn('[BroadcastTab] Network mismatch:', unsignedData.network, 'vs', network);
        setStatus({ 
          type: 'error', 
          message: `Network mismatch: Transaction is for ${unsignedData.network} but current network is ${network}` 
        });
        setIsBroadcasting(false);
        return;
      }

      console.log('[BroadcastTab] Broadcasting signed transaction...');
      const txid = await broadcastSignedTransaction(connection, unsignedData, signedData);
      console.log('[BroadcastTab] Transaction broadcasted successfully:', txid);
      
      setTxSignature(txid);
      setStatus({ 
        type: 'success', 
        message: 'Transaction broadcasted successfully!' 
      });
    } catch (error) {
      console.error('[BroadcastTab] Failed to broadcast transaction:', error);
      setStatus({ 
        type: 'error', 
        message: `Failed to broadcast: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const getExplorerUrl = (signature: string) => {
    const baseUrl = 'https://explorer.solana.com/tx/';
    const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
    return `${baseUrl}${signature}${cluster}`;
  };

  return (
    <div className="tab-content active">
      <section className="card">
        <h2>Broadcast Transaction</h2>
        <p>
          Upload your signed transaction and broadcast it to the network. The connected wallet will pay the transaction fee.
        </p>

        <div className="form-group">
          <label>Connected Wallet (Fee Payer):</label>
          <WalletButton />
          <small>
            This wallet will pay the transaction fee (~0.000005 SOL). Click Disconnect to switch wallets.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="unsigned-file">Unsigned Transaction File:</label>
          <input
            type="file"
            id="unsigned-file"
            accept=".json"
            onChange={handleUnsignedFileChange}
            ref={unsignedInputRef}
            disabled={isBroadcasting}
          />
          <small>Upload the unsigned-tx.json file</small>
        </div>

        <div className="form-group">
          <label htmlFor="signed-file">Signed Transaction File:</label>
          <input
            type="file"
            id="signed-file"
            accept=".json"
            onChange={handleSignedFileChange}
            ref={signedInputRef}
            disabled={isBroadcasting}
          />
          <small>Upload the signed-tx.json file from your offline signer</small>
        </div>

        <button
          onClick={handleBroadcast}
          disabled={isBroadcasting || !connected || !unsignedFile || !signedFile}
          className="btn btn-success"
        >
          {isBroadcasting ? 'Broadcasting...' : 'Broadcast Transaction'}
        </button>

        {status && (
          <div className={`status-message ${status.type}`} style={{ position: 'static', marginTop: '20px' }}>
            {status.message}
          </div>
        )}

        {txSignature && (
          <div className="result-info" style={{ marginTop: '20px' }}>
            <h3>Transaction Broadcasted!</h3>
            <p><strong>Signature:</strong></p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
              {txSignature}
            </p>
            <p style={{ marginTop: '15px' }}>
              <a 
                href={getExplorerUrl(txSignature)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-block', textDecoration: 'none' }}
              >
                View on Explorer
              </a>
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
