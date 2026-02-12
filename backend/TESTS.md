# Test Suite Documentation

This document describes the comprehensive test suite for the Offline Solana Transaction Signer.

## Overview

- **Total Test Suites**: 4
- **Total Tests**: 82 tests
- **Test Framework**: Jest with TypeScript support
- **Coverage**: Backend modules, API endpoints, and integration tests

## Test Structure

```
backend/src/__tests__/
├── setup.ts              # Test setup and cleanup
├── keyManager.test.ts    # Key management tests (24 tests)
├── txProcessor.test.ts   # Transaction processing tests (22 tests)
├── signer.test.ts        # Signing operations tests (18 tests)
└── api.test.ts          # API integration tests (18 tests)
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
};
```

## Running Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- keyManager.test.ts

# Run with coverage
npm test -- --coverage

# Run in test environment (prevents server from starting)
NODE_ENV=test npm test
```

## Test Categories

### 1. keyManager Tests (`keyManager.test.ts`)

Tests for keypair generation, import, encryption, and management.

**Test Coverage**:
- ✅ Generate new keypairs
- ✅ Import keypairs from base58 format
- ✅ Import keypairs from base64 format
- ✅ Import keypairs from JSON format
- ✅ Load keypairs with correct password
- ✅ Reject incorrect passwords
- ✅ List all keypairs (without sensitive data)
- ✅ Delete keypairs
- ✅ Get public keys
- ✅ Error handling for all edge cases

**Sample Tests**:
```typescript
it('should generate a new keypair successfully', () => {
  const result = keyManager.generateKeypair('test-key', 'password');
  expect(result.publicKey).toBeDefined();
});

it('should import keypair from base58 format', () => {
  const result = keyManager.importKeypair(
    'test-key',
    '5sinxM3PVEzRGSqfdZ4HM1B8M4TQg26onCqBUMoUN97jByHEgWTEeGZtbnM1PWuh6vpX6rLZrphyyigwe5p4wvos',
    'password',
    'base58'
  );
  expect(result.publicKey).toBe('BhJpHMEGBWo1fJusPTjqhZKmvM2ZNyRj712kWiVq9Gc9');
});
```

### 2. txProcessor Tests (`txProcessor.test.ts`)

Tests for transaction parsing, validation, and detail extraction.

**Test Coverage**:
- ✅ Parse valid transaction files
- ✅ Handle missing files
- ✅ Handle invalid JSON
- ✅ Handle missing required fields
- ✅ Extract human-readable details
- ✅ Identify transaction types (SOL, SPL, Generic)
- ✅ Shorten addresses for display
- ✅ Extract sender and recipient
- ✅ Format amounts correctly

**Sample Tests**:
```typescript
it('should parse valid transaction file', () => {
  const result = txProcessor.parseTransactionFile(testFilePath);
  expect(result.description).toBe('Test SOL transfer');
  expect(result.details.network).toBe('DEVNET');
});

it('should identify SOL transfer type', () => {
  const details = txProcessor.getTransactionDetails(testFilePath);
  expect(details.type).toBe('SOL Transfer');
});
```

### 3. signer Tests (`signer.test.ts`)

Tests for transaction signing and signature verification.

**Test Coverage**:
- ✅ Sign transactions successfully
- ✅ Create signed transaction files
- ✅ Verify valid signatures
- ✅ Reject invalid signatures
- ✅ Reject wrong public keys
- ✅ Create signing previews
- ✅ Show security warnings
- ✅ Handle incorrect passwords

**Sample Tests**:
```typescript
it('should sign transaction successfully', async () => {
  const result = await signer.signTransaction(
    txFilePath,
    'test-keypair',
    'password'
  );
  expect(result.signature).toBeDefined();
  expect(result.publicKey).toBeDefined();
});

it('should verify valid signature', () => {
  const isValid = signer.verifySignature(
    messageBase64,
    signatureBase64,
    publicKeyBase58
  );
  expect(isValid).toBe(true);
});
```

### 4. API Integration Tests (`api.test.ts`)

End-to-end tests for all API endpoints using supertest.

**Test Coverage**:
- ✅ Health check endpoint
- ✅ Generate keypair endpoint
- ✅ Import keypair endpoint
- ✅ List keypairs endpoint
- ✅ Delete keypair endpoint
- ✅ Upload transaction endpoint
- ✅ Sign transaction endpoint
- ✅ Download signed transaction endpoint
- ✅ Get transaction details endpoint
- ✅ Error responses

**Sample Tests**:
```typescript
it('should generate a new keypair', async () => {
  const response = await request(app)
    .post('/api/keys/generate')
    .send({ name: 'test-key', password: 'password' })
    .expect(200);
  
  expect(response.body.success).toBe(true);
  expect(response.body.publicKey).toBeDefined();
});

it('should sign transaction successfully', async () => {
  const response = await request(app)
    .post('/api/transaction/sign')
    .send({
      filePath: testFilePath,
      keyName: 'test-key',
      password: 'password',
      approve: true
    })
    .expect(200);
  
  expect(response.body.signature).toBeDefined();
});
```

## Test Data

### Sample Keypairs

**Test Keypair (Base58)**:
- Private Key: `5sinxM3PVEzRGSqfdZ4HM1B8M4TQg26onCqBUMoUN97jByHEgWTEeGZtbnM1PWuh6vpX6rLZrphyyigwe5p4wvos`
- Public Key: `BhJpHMEGBWo1fJusPTjqhZKmvM2ZNyRj712kWiVq9Gc9`

### Sample Transactions

**SOL Transfer Transaction**:
```json
{
  "description": "Test SOL transfer",
  "network": "devnet",
  "messageBase64": "<base64-encoded-message>",
  "meta": {
    "tokenSymbol": "SOL",
    "decimals": 9,
    "amount": 0.001
  }
}
```

## Test Environment

### Environment Variables

```bash
NODE_ENV=test  # Prevents server from starting during tests
```

### Test Directories

- `backend/keys/` - Test keypair storage (cleaned up after tests)
- `backend/uploads/` - Test transaction files (cleaned up after tests)

## Coverage Report

Run coverage report:

```bash
npm test -- --coverage
```

Expected coverage areas:
- **keyManager.ts**: 90%+ coverage
- **txProcessor.ts**: 85%+ coverage
- **signer.ts**: 80%+ coverage
- **server.ts**: Excluded from coverage (integration tests cover API)

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend
          npm install
      - name: Run tests
        run: |
          cd backend
          NODE_ENV=test npm test
      - name: Generate coverage report
        run: |
          cd backend
          npm test -- --coverage
```

## Adding New Tests

### Unit Test Template

```typescript
import * as moduleToTest from '../moduleToTest';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test-input';
      
      // Act
      const result = moduleToTest.functionName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.value).toBe('expected-value');
    });

    it('should handle errors', () => {
      expect(() => {
        moduleToTest.functionName('invalid-input');
      }).toThrow('Expected error message');
    });
  });
});
```

### Integration Test Template

```typescript
import request from 'supertest';
import app from '../server';

describe('API Endpoint', () => {
  it('should return expected response', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ key: 'value' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean Up**: Always clean up test data in `afterEach` or `afterAll`
3. **Use Descriptive Names**: Test names should describe what is being tested
4. **Test Edge Cases**: Include tests for error conditions and boundary cases
5. **Keep Tests Fast**: Tests should run quickly for rapid feedback
6. **Use Fixtures**: Create reusable test data
7. **Mock External Dependencies**: Use mocks for external services

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Solution: Use NODE_ENV=test
NODE_ENV=test npm test
```

**2. Test Files Not Found**
```bash
# Check test file location and naming
ls backend/src/__tests__/*.test.ts
```

**3. TypeScript Compilation Errors**
```bash
# Run type check first
npm run typecheck
```

**4. Tests Timing Out**
```bash
# Increase timeout
npm test -- --testTimeout=60000
```

## Summary

The test suite provides comprehensive coverage of:

- ✅ All key management operations
- ✅ Transaction parsing and validation
- ✅ Signing operations with cryptographic verification
- ✅ All API endpoints
- ✅ Error handling and edge cases
- ✅ Type safety with TypeScript

**Total Coverage**: 82 tests across 4 test suites, all passing ✅

## Future Improvements

1. **Frontend Tests**: Add browser-based tests with Puppeteer or Playwright
2. **E2E Tests**: Add end-to-end workflow tests
3. **Performance Tests**: Add benchmarks for signing operations
4. **Security Tests**: Add penetration testing for API endpoints
5. **Load Tests**: Test with concurrent requests

## Contributing

When adding new features:

1. Write tests before implementation (TDD)
2. Ensure all tests pass before submitting PR
3. Maintain or improve code coverage
4. Follow existing test patterns and naming conventions
5. Update this documentation with new test information
