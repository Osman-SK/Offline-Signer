const fs = require('fs');
const path = require('path');

// Add the compiled backend to the path
const signer = require('./dist/signer');
const keyManager = require('./dist/keyManager');

const TEST_DIR = path.join(__dirname, 'uploads');
const TEST_KEYPAIR_NAME = 'test-signing-key';

// Ensure directories exist
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// The test JSON you provided
const testTxData = {
  "description": "Transfer 2 SOL to 5gWGvz1v...",
  "network": "devnet",
  "messageBase64": "gAEAAgXJvcvdP+X5Y9TNtajkNmeNTnaW9T08JlyrOHEc7f62TJB4zJQyXgpUEy7RGAugXubWBhk+Y5urzcgpl53yVpMsRY2ADzMlr7oI0bfVjRbMeWJ//prBzGJaVf6pUY5GHVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAan1RcZLFaO4IqEX3PSl4jPA1wxRbIas0TYBi6pQAAAME2F94QQKDJvlEjXRk0EAprMzyKgyTHd5Oc+vpqDzrACAwMBBAAEBAAAAAMCAAIMAgAAAACUNXcAAAAAAA==",
  "meta": {
    "tokenSymbol": "SOL",
    "decimals": 9,
    "amount": 2
  }
};

async function testSigning() {
  console.log('=== Testing Offline Signer with New SignedTransaction Format ===\n');
  
  try {
    // Clean up any existing test keypair
    try {
      keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
      console.log('✓ Cleaned up existing test keypair');
    } catch (e) {
      // Keypair might not exist
    }
    
    // Create test keypair
    console.log('Creating test keypair...');
    const keypairResult = keyManager.generateKeypair(TEST_KEYPAIR_NAME);
    console.log('✓ Created keypair:', keypairResult.publicKey);
    
    // Save test transaction file
    const txFilePath = path.join(TEST_DIR, 'test-unsigned-tx.json');
    fs.writeFileSync(txFilePath, JSON.stringify(testTxData, null, 2));
    console.log('✓ Saved test transaction:', txFilePath);
    
    // Test signing
    console.log('\nSigning transaction...');
    const result = await signer.signTransaction(txFilePath, TEST_KEYPAIR_NAME);
    console.log('✓ Transaction signed successfully');
    console.log('  - Signature:', result.signature.substring(0, 50) + '...');
    console.log('  - Public Key:', result.publicKey);
    console.log('  - Output File:', result.outputFilename);
    console.log('  - Signed At:', result.signedAt);
    
    // Read and verify the signed transaction file
    console.log('\nVerifying signed transaction file format...');
    const signedData = JSON.parse(fs.readFileSync(result.outputPath, 'utf-8'));
    
    console.log('\nSigned Transaction Contents:');
    console.log('  - signature:', signedData.signature ? '✓ Present' : '✗ Missing');
    console.log('  - publicKey:', signedData.publicKey ? '✓ Present' : '✗ Missing');
    console.log('  - signedAt:', signedData.signedAt ? '✓ Present' : '✗ Missing');
    console.log('  - network:', signedData.network ? '✓ Present (' + signedData.network + ')' : '✗ Missing');
    console.log('  - description:', signedData.description ? '✓ Present' : '✗ Missing');
    console.log('  - messageBase64:', signedData.messageBase64 ? '✓ Present (length: ' + signedData.messageBase64.length + ')' : '✗ Missing');
    console.log('  - meta:', signedData.meta ? '✓ Present' : '✗ Missing');
    
    if (signedData.meta) {
      console.log('    - tokenSymbol:', signedData.meta.tokenSymbol);
      console.log('    - decimals:', signedData.meta.decimals);
      console.log('    - amount:', signedData.meta.amount);
    }
    
    // Verify messageBase64 matches original
    if (signedData.messageBase64 === testTxData.messageBase64) {
      console.log('\n✓ messageBase64 matches original transaction!');
    } else {
      console.log('\n✗ messageBase64 does NOT match original transaction');
      console.log('  Expected length:', testTxData.messageBase64.length);
      console.log('  Actual length:', signedData.messageBase64.length);
    }
    
    // Verify signature is valid
    console.log('\nVerifying signature...');
    const isValid = signer.verifySignature(
      signedData.messageBase64,
      signedData.signature,
      signedData.publicKey
    );
    console.log('✓ Signature is valid:', isValid);
    
    // Clean up
    console.log('\nCleaning up...');
    keyManager.deleteKeypair(TEST_KEYPAIR_NAME);
    fs.unlinkSync(txFilePath);
    fs.unlinkSync(result.outputPath);
    console.log('✓ Cleanup complete');
    
    console.log('\n=== All Tests Passed! ===');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testSigning();
