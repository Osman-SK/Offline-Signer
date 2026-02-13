import { useState } from 'react';
import { WalletProvider } from './components/WalletProvider';
import { CreateNonceTab } from './components/CreateNonceTab';
import { SolTransferTab } from './components/SolTransferTab';
import { TokenTransferTab } from './components/TokenTransferTab';
import { BroadcastTab } from './components/BroadcastTab';
import { useNonceAccounts, useStoredNetwork } from './hooks/useLocalStorage';
import type { NonceAccountInfo } from './types';

type Tab = 'create-nonce' | 'sol-transfer' | 'token-transfer' | 'broadcast';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('create-nonce');
  const { network, setNetwork } = useStoredNetwork();
  const { nonceAccounts, addNonceAccount } = useNonceAccounts();

  console.log('[App] Rendering with network:', network, 'active tab:', activeTab);
  console.log('[App] Nonce accounts:', nonceAccounts);

  const handleNonceCreated = (nonce: NonceAccountInfo) => {
    console.log('[App] New nonce account created:', nonce);
    addNonceAccount(nonce);
    // Optionally switch to transfer tab
    // setActiveTab('sol-transfer');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create-nonce':
        return (
          <CreateNonceTab 
            network={network} 
            onNonceCreated={handleNonceCreated}
          />
        );
      case 'sol-transfer':
        return (
          <SolTransferTab 
            network={network} 
            nonceAccounts={nonceAccounts}
          />
        );
      case 'token-transfer':
        return (
          <TokenTransferTab 
            network={network} 
            nonceAccounts={nonceAccounts}
          />
        );
      case 'broadcast':
        return <BroadcastTab network={network} />;
      default:
        return null;
    }
  };

  return (
    <WalletProvider network={network}>
      <div className="container">
        <div id="main-app">
          <header>
            <h1>Transaction Creator & Broadcaster</h1>
            <p className="subtitle">Create unsigned transactions and broadcast signed ones</p>
            
            <div className="network-selector">
              <label htmlFor="network">Network:</label>
              <select
                id="network"
                value={network}
                onChange={(e) => {
                  const newNetwork = e.target.value as 'mainnet' | 'devnet' | 'testnet';
                  console.log('[App] Network changed to:', newNetwork);
                  setNetwork(newNetwork);
                }}
              >
                <option value="devnet">Devnet</option>
                <option value="mainnet">Mainnet</option>
                <option value="testnet">Testnet</option>
              </select>
            </div>
          </header>

          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'create-nonce' ? 'active' : ''}`}
              onClick={() => setActiveTab('create-nonce')}
            >
              1. Create Nonce
            </button>
            <button
              className={`tab-button ${activeTab === 'sol-transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('sol-transfer')}
            >
              2. SOL Transfer
            </button>
            <button
              className={`tab-button ${activeTab === 'token-transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('token-transfer')}
            >
              3. Token Transfer
            </button>
            <button
              className={`tab-button ${activeTab === 'broadcast' ? 'active' : ''}`}
              onClick={() => setActiveTab('broadcast')}
            >
              4. Broadcast
            </button>
          </div>

          {renderTabContent()}
        </div>

        <footer>
          <p>
            <strong>Workflow:</strong> Create Nonce → Create Transaction → Sign Offline → Broadcast
          </p>
          {nonceAccounts.length > 0 && (
            <p className="footer-note">
              {nonceAccounts.length} nonce account(s) stored locally
            </p>
          )}
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
