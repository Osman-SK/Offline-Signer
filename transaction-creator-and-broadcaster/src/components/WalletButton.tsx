import type React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: React.FC = () => {
  const { publicKey, connected, disconnect } = useWallet();

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="wallet-info">
        <WalletMultiButton />
      </div>
    );
  }

  const address = publicKey.toBase58();
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;

  return (
    <div className="wallet-info">
      <div className="wallet-address">
        {shortAddress}
      </div>
      <button onClick={handleDisconnect} className="btn btn-disconnect">
        Disconnect
      </button>
    </div>
  );
};
