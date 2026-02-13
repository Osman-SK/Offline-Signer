import { useState, useEffect } from 'react';
import type { NonceAccountInfo } from '../types';

const STORAGE_KEY = 'solana_nonce_accounts';
const NETWORK_KEY = 'solana_network';

export const useNonceAccounts = () => {
  const [nonceAccounts, setNonceAccounts] = useState<NonceAccountInfo[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNonceAccounts(parsed);
        console.log('[useNonceAccounts] Loaded from localStorage:', parsed);
      } catch (error) {
        console.error('[useNonceAccounts] Failed to parse stored nonce accounts:', error);
      }
    }
  }, []);

  const addNonceAccount = (account: NonceAccountInfo) => {
    console.log('[useNonceAccounts] Adding nonce account:', account);
    setNonceAccounts(prev => {
      const updated = [...prev, account];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[useNonceAccounts] Saved to localStorage:', updated);
      return updated;
    });
  };

  const removeNonceAccount = (address: string) => {
    console.log('[useNonceAccounts] Removing nonce account:', address);
    setNonceAccounts(prev => {
      const updated = prev.filter(acc => acc.address !== address);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[useNonceAccounts] Updated localStorage:', updated);
      return updated;
    });
  };

  const clearAllNonceAccounts = () => {
    console.log('[useNonceAccounts] Clearing all nonce accounts');
    setNonceAccounts([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    nonceAccounts,
    addNonceAccount,
    removeNonceAccount,
    clearAllNonceAccounts
  };
};

export const useStoredNetwork = () => {
  const [network, setNetwork] = useState<'mainnet' | 'devnet' | 'testnet'>('devnet');

  useEffect(() => {
    const stored = localStorage.getItem(NETWORK_KEY);
    if (stored) {
      const validNetworks = ['mainnet', 'devnet', 'testnet'];
      if (validNetworks.includes(stored)) {
        setNetwork(stored as 'mainnet' | 'devnet' | 'testnet');
        console.log('[useStoredNetwork] Loaded network from localStorage:', stored);
      }
    }
  }, []);

  const saveNetwork = (newNetwork: 'mainnet' | 'devnet' | 'testnet') => {
    console.log('[useStoredNetwork] Saving network:', newNetwork);
    setNetwork(newNetwork);
    localStorage.setItem(NETWORK_KEY, newNetwork);
  };

  return { network, setNetwork: saveNetwork };
};
