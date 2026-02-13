import * as keyManager from '../keyManager';
import { KeypairInfo } from '../keyManager';

const TEST_MNEMONIC = 'fall auto thrive mobile proud cart dance broom seminar captain beach over then biology goose wrap town area quit among trick prize icon turn';
const TEST_KEYPAIR_NAME = 'test-export-wallet';

describe('Export Functionality Test', () => {
  afterEach(() => {
    // Cleanup
    try {
      keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  it('should import from mnemonic and export both seed phrase and private keys', () => {
    // Import from mnemonic
    const result = keyManager.importFromMnemonic(
      TEST_KEYPAIR_NAME,
      TEST_MNEMONIC,
      0,
      '',
      'backpack',
      '',
      true
    );

    expect(result.name).toBe(TEST_KEYPAIR_NAME);
    expect(result.publicKey).toBeDefined();

    // List keypairs and check hasSeedPhrase
    const keypairs = keyManager.listKeypairs();
    const importedKeypair = keypairs.find((k: KeypairInfo) => k.name === TEST_KEYPAIR_NAME);
    expect(importedKeypair).toBeDefined();
    expect(importedKeypair?.hasSeedPhrase).toBe(true);

    // Export seed phrase
    const exportedMnemonic = keyManager.exportSeedPhrase(TEST_KEYPAIR_NAME);
    expect(exportedMnemonic).toBe(TEST_MNEMONIC);

    // Export private key in all formats
    const base58Key = keyManager.exportPrivateKey(TEST_KEYPAIR_NAME, 'base58');
    expect(base58Key).toBeDefined();
    expect(base58Key.length).toBeGreaterThan(0);

    const base64Key = keyManager.exportPrivateKey(TEST_KEYPAIR_NAME, 'base64');
    expect(base64Key).toBeDefined();
    expect(base64Key.length).toBeGreaterThan(0);

    const jsonKey = keyManager.exportPrivateKey(TEST_KEYPAIR_NAME, 'json');
    expect(jsonKey).toBeDefined();
    expect(jsonKey.length).toBeGreaterThan(0);
  });
});
