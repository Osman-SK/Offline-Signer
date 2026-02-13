"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const keyManager = __importStar(require("../keyManager"));
const TEST_MNEMONIC = 'fall auto thrive mobile proud cart dance broom seminar captain beach over then biology goose wrap town area quit among trick prize icon turn';
const TEST_KEYPAIR_NAME = 'test-export-wallet';
describe('Export Functionality Test', () => {
    afterEach(() => {
        // Cleanup
        try {
            keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
        }
        catch (e) {
            // Ignore if doesn't exist
        }
    });
    it('should import from mnemonic and export both seed phrase and private keys', () => {
        // Import from mnemonic
        const result = keyManager.importFromMnemonic(TEST_KEYPAIR_NAME, TEST_MNEMONIC, 0, '', 'backpack', '', true);
        expect(result.name).toBe(TEST_KEYPAIR_NAME);
        expect(result.publicKey).toBeDefined();
        // List keypairs and check hasSeedPhrase
        const keypairs = keyManager.listKeypairs();
        const importedKeypair = keypairs.find((k) => k.name === TEST_KEYPAIR_NAME);
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
//# sourceMappingURL=export.test.js.map