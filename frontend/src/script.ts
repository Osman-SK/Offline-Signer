import {
  KeypairInfo,
  KeypairListResponse,
  ParsedTransaction,
  GenerateKeypairResponse,
  ImportKeypairResponse,
  UploadTransactionResponse,
  SignTransactionResponse,
  PrivateKeyFormat,
  StatusType,
  MnemonicValidationResponse,
  DerivePreviewResponse,
  ImportMnemonicResponse,
  DerivedAddress
} from './types';

const API_BASE = 'http://localhost:3000/api';

// Global state
let currentTransaction: ParsedTransaction | null = null;
let currentFilePath: string | null = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadKeypairs();
  setupEventListeners();
});

// Tab Navigation
function showTab(tabName: string): void {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabElement = document.getElementById(`${tabName}-tab`);
  const buttonElement = event?.target as HTMLElement;
  
  if (tabElement) {
    tabElement.classList.add('active');
  }
  if (buttonElement) {
    buttonElement.classList.add('active');
  }

  // Load keypairs when switching to sign tab
  if (tabName === 'sign') {
    loadKeypairsForSigning();
  }
}

// Setup Event Listeners
function setupEventListeners(): void {
  // Generate form
  const generateForm = document.getElementById('generate-form') as HTMLFormElement;
  if (generateForm) {
    generateForm.addEventListener('submit', handleGenerateKeypair);
  }

  // Import form
  const importForm = document.getElementById('import-form') as HTMLFormElement;
  if (importForm) {
    importForm.addEventListener('submit', handleImportKeypair);
  }

  // Format selector for import
  const importFormat = document.getElementById('import-format') as HTMLSelectElement;
  if (importFormat) {
    importFormat.addEventListener('change', handleFormatChange);
  }

  // File upload
  const fileUploadArea = document.getElementById('file-upload-area') as HTMLDivElement;
  const fileInput = document.getElementById('transaction-file') as HTMLInputElement;

  if (fileUploadArea && fileInput) {
    fileUploadArea.addEventListener('click', () => fileInput.click());
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Signing actions
  const approveBtn = document.getElementById('approve-btn') as HTMLButtonElement;
  const declineBtn = document.getElementById('decline-btn') as HTMLButtonElement;
  
  if (approveBtn) {
    approveBtn.addEventListener('click', handleApprove);
  }
  if (declineBtn) {
    declineBtn.addEventListener('click', handleDecline);
  }
}

// Key Management Functions
async function loadKeypairs(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/keys`);
    const data: KeypairListResponse = await response.json();

    const listContainer = document.getElementById('keypair-list') as HTMLDivElement;

    if (!data.success || data.keys.length === 0) {
      listContainer.innerHTML = '<p class="loading">No keypairs found. Generate or import one to get started.</p>';
      return;
    }

    listContainer.innerHTML = data.keys.map((key: KeypairInfo) => `
      <div class="keypair-item">
        <div class="keypair-info">
          <h3>${key.name}</h3>
          <p>${key.publicKey}</p>
          <small>${key.createdAt ? 'Created' : 'Imported'}: ${new Date(key.createdAt || key.importedAt || '').toLocaleString()}</small>
        </div>
        <div class="keypair-actions">
          <button class="btn btn-secondary" onclick="copyPublicKey('${key.publicKey}')">Copy</button>
          <button class="btn btn-danger" onclick="deleteKeypair('${key.name}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showStatus('Failed to load keypairs: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

async function handleGenerateKeypair(e: Event): Promise<void> {
  e.preventDefault();

  const nameInput = document.getElementById('gen-name') as HTMLInputElement;
  const passwordInput = document.getElementById('gen-password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('gen-password-confirm') as HTMLInputElement;

  const name = nameInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (password !== confirmPassword) {
    showStatus('Passwords do not match!', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/keys/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });

    const data: GenerateKeypairResponse = await response.json();

    if (data.success) {
      showStatus('Keypair generated successfully!', 'success');
      (document.getElementById('generate-form') as HTMLFormElement).reset();
      await loadKeypairs();
    } else {
      showStatus('Failed to generate keypair: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function handleFormatChange(e: Event): void {
  const format = (e.target as HTMLSelectElement).value as PrivateKeyFormat;
  const hintEl = document.getElementById('format-hint') as HTMLSpanElement;
  const keyInput = document.getElementById('import-key') as HTMLTextAreaElement;
  
  switch (format) {
    case 'base58':
      hintEl.textContent = 'Base58 encoded private key (e.g., from Phantom, Solflare, Solana CLI)';
      keyInput.placeholder = 'e.g., 5Mai...';
      break;
    case 'base64':
      hintEl.textContent = 'Base64 encoded private key';
      keyInput.placeholder = 'e.g., AAAAAA...';
      break;
    case 'json':
      hintEl.textContent = 'JSON array of numbers (byte array format)';
      keyInput.placeholder = '[1, 2, 3, 4, ...]';
      break;
  }
}

async function handleImportKeypair(e: Event): Promise<void> {
  e.preventDefault();

  const nameInput = document.getElementById('import-name') as HTMLInputElement;
  const privateKeyInput = document.getElementById('import-key') as HTMLTextAreaElement;
  const passwordInput = document.getElementById('import-password') as HTMLInputElement;
  const formatSelect = document.getElementById('import-format') as HTMLSelectElement;

  const name = nameInput.value;
  const privateKey = privateKeyInput.value;
  const password = passwordInput.value;
  const format = formatSelect.value as PrivateKeyFormat;

  try {
    const response = await fetch(`${API_BASE}/keys/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, privateKey, password, format })
    });

    const data: ImportKeypairResponse = await response.json();

    if (data.success) {
      showStatus('Keypair imported successfully!', 'success');
      (document.getElementById('import-form') as HTMLFormElement).reset();
      await loadKeypairs();
    } else {
      showStatus('Failed to import keypair: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

async function deleteKeypair(name: string): Promise<void> {
  if (!confirm(`Are you sure you want to delete keypair "${name}"? This cannot be undone!`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/keys/${name}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showStatus(`Keypair "${name}" deleted`, 'success');
      await loadKeypairs();
    } else {
      showStatus('Failed to delete keypair: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function copyPublicKey(publicKey: string): void {
  navigator.clipboard.writeText(publicKey);
  showStatus('Public key copied to clipboard!', 'success');
}

// Transaction Signing Functions
async function loadKeypairsForSigning(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/keys`);
    const data: KeypairListResponse = await response.json();

    const select = document.getElementById('signing-key') as HTMLSelectElement;
    select.innerHTML = '<option value="">Select a keypair...</option>';

    if (data.success && data.keys.length > 0) {
      data.keys.forEach((key: KeypairInfo) => {
        const option = document.createElement('option');
        option.value = key.name;
        option.textContent = `${key.name} (${key.publicKey.slice(0, 8)}...)`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    showStatus('Failed to load keypairs: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).classList.add('dragover');
}

function handleDragLeave(e: DragEvent): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).classList.remove('dragover');
}

function handleFileDrop(e: DragEvent): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).classList.remove('dragover');

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadTransaction(files[0]);
  }
}

function handleFileSelect(e: Event): void {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    uploadTransaction(files[0]);
  }
}

async function uploadTransaction(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('transaction', file);

  try {
    const response = await fetch(`${API_BASE}/transaction/upload`, {
      method: 'POST',
      body: formData
    });

    const data: UploadTransactionResponse = await response.json();

    if (data.success && data.transaction && data.filePath) {
      currentTransaction = data.transaction;
      currentFilePath = data.filePath;
      displayTransactionDetails(data.transaction);
      showStatus('Transaction loaded successfully', 'success');
    } else {
      showStatus('Failed to upload transaction: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error uploading transaction: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function displayTransactionDetails(tx: ParsedTransaction): void {
  const details = tx.details;
  const detailsHtml = `
    <div class="tx-detail">
      <span class="tx-detail-label">Network:</span>
      <span class="tx-detail-value">${details.network}</span>
    </div>
    <div class="tx-detail">
      <span class="tx-detail-label">Type:</span>
      <span class="tx-detail-value">${details.type}</span>
    </div>
    <div class="tx-detail">
      <span class="tx-detail-label">Description:</span>
      <span class="tx-detail-value">${details.description}</span>
    </div>
    ${details.amountFormatted ? `
    <div class="tx-detail">
      <span class="tx-detail-label">Amount:</span>
      <span class="tx-detail-value tx-amount">${details.amountFormatted}</span>
    </div>
    ` : ''}
    <div class="tx-detail">
      <span class="tx-detail-label">Fee Payer:</span>
      <span class="tx-detail-value">${details.feePayer}</span>
    </div>
  `;

  const txInfo = document.getElementById('tx-info') as HTMLDivElement;
  const txDetails = document.getElementById('transaction-details') as HTMLDivElement;
  
  if (txInfo) {
    txInfo.innerHTML = detailsHtml;
  }
  if (txDetails) {
    txDetails.style.display = 'block';
  }
}

async function handleApprove(): Promise<void> {
  const keyNameSelect = document.getElementById('signing-key') as HTMLSelectElement;
  const passwordInput = document.getElementById('signing-password') as HTMLInputElement;

  const keyName = keyNameSelect.value;
  const password = passwordInput.value;

  if (!keyName) {
    showStatus('Please select a keypair', 'error');
    return;
  }

  if (!password) {
    showStatus('Please enter your password', 'error');
    return;
  }

  if (!currentFilePath) {
    showStatus('No transaction loaded', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/transaction/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: currentFilePath,
        keyName: keyName,
        password: password,
        approve: true
      })
    });

    const data: SignTransactionResponse = await response.json();

    if (data.success) {
      displaySigningResult(data);
      showStatus('Transaction signed successfully!', 'success');
    } else {
      showStatus('Failed to sign transaction: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error signing transaction: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function handleDecline(): void {
  const txDetails = document.getElementById('transaction-details') as HTMLDivElement;
  const signingResult = document.getElementById('signing-result') as HTMLDivElement;
  const fileInput = document.getElementById('transaction-file') as HTMLInputElement;
  const passwordInput = document.getElementById('signing-password') as HTMLInputElement;

  if (txDetails) {
    txDetails.style.display = 'none';
  }
  if (signingResult) {
    signingResult.style.display = 'none';
  }
  
  currentTransaction = null;
  currentFilePath = null;
  if (fileInput) {
    fileInput.value = '';
  }
  if (passwordInput) {
    passwordInput.value = '';
  }
  
  showStatus('Transaction declined', 'info');
}

function displaySigningResult(data: SignTransactionResponse): void {
  if (!data.signature || !data.publicKey || !data.signedAt || !data.downloadUrl) {
    showStatus('Invalid signing result', 'error');
    return;
  }

  const resultHtml = `
    <h3>✓ Transaction Signed Successfully</h3>
    <p><strong>Public Key:</strong> ${data.publicKey}</p>
    <p><strong>Signature:</strong> ${data.signature.slice(0, 32)}...</p>
    <p><strong>Signed At:</strong> ${new Date(data.signedAt).toLocaleString()}</p>
    <a href="${data.downloadUrl}" class="download-link" download>⬇ Download Signed Transaction</a>
    <p style="margin-top: 20px; color: #666;">
      <small>Next: Transfer the signed transaction file to your online machine and broadcast it to the network.</small>
    </p>
  `;

  const resultInfo = document.getElementById('result-info') as HTMLDivElement;
  const txDetails = document.getElementById('transaction-details') as HTMLDivElement;
  const signingResult = document.getElementById('signing-result') as HTMLDivElement;

  if (resultInfo) {
    resultInfo.innerHTML = resultHtml;
  }
  if (txDetails) {
    txDetails.style.display = 'none';
  }
  if (signingResult) {
    signingResult.style.display = 'block';
  }
}

// Utility Functions
function showStatus(message: string, type: StatusType = 'info'): void {
  const statusEl = document.getElementById('status-message') as HTMLDivElement;
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;

    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 5000);
  }
}

// Make functions available globally for HTML onclick handlers
(window as any).showTab = showTab;
(window as any).copyPublicKey = copyPublicKey;
(window as any).deleteKeypair = deleteKeypair;

// ============================================================================
// Import Method Selection Functions
// ============================================================================

// State for import flow
let currentImportMethod: 'private-key' | 'seed-phrase' | null = null;
let derivedAddressesCache: DerivedAddress[] = [];

/**
 * Handle import method selection (Private Key vs Seed Phrase)
 */
function selectImportMethod(method: 'private-key' | 'seed-phrase'): void {
  currentImportMethod = method;
  
  // Hide method selection, show chosen branch
  const methodSelection = document.getElementById('import-method-selection');
  const privateKeyBranch = document.getElementById('private-key-form');
  const seedPhraseBranch = document.getElementById('seed-phrase-container');
  
  if (methodSelection) {
    methodSelection.style.display = 'none';
  }
  
  // Update card selection styling
  document.querySelectorAll('.method-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById(`method-${method}`)?.classList.add('selected');
  
  // Show appropriate branch
  if (method === 'private-key' && privateKeyBranch) {
    privateKeyBranch.style.display = 'block';
  } else if (method === 'seed-phrase' && seedPhraseBranch) {
    seedPhraseBranch.style.display = 'block';
    // Show first step (mnemonic input)
    showSeedPhraseStep('mnemonic-step');
  }
}

/**
 * Go back to method selection
 */
function backToMethodSelection(): void {
  currentImportMethod = null;
  
  const methodSelection = document.getElementById('import-method-selection');
  const privateKeyBranch = document.getElementById('private-key-form');
  const seedPhraseBranch = document.getElementById('seed-phrase-container');
  
  if (methodSelection) {
    methodSelection.style.display = 'block';
  }
  if (privateKeyBranch) {
    privateKeyBranch.style.display = 'none';
    (privateKeyBranch as HTMLFormElement).reset();
  }
  if (seedPhraseBranch) {
    seedPhraseBranch.style.display = 'none';
  }
  
  // Reset all seed phrase steps
  showSeedPhraseStep('mnemonic-step');
  derivedAddressesCache = [];
}

// Make available globally
(window as any).selectImportMethod = selectImportMethod;
(window as any).backToMethodSelection = backToMethodSelection;

// ============================================================================
// Private Key Import Functions
// ============================================================================

/**
 * Handle private key format selection change
 */
function handlePKFormatChange(): void {
  const formatSelect = document.getElementById('pk-format-select') as HTMLSelectElement;
  const hintEl = document.getElementById('pk-format-hint') as HTMLSpanElement;
  const keyInput = document.getElementById('pk-private-key') as HTMLTextAreaElement;
  
  if (!formatSelect || !hintEl || !keyInput) return;
  
  const format = formatSelect.value as PrivateKeyFormat;
  
  switch (format) {
    case 'base58':
      hintEl.textContent = 'Base58 encoded (e.g., from Phantom, Solflare, Solana CLI)';
      keyInput.placeholder = 'e.g., 5Maii9c...';
      break;
    case 'base64':
      hintEl.textContent = 'Base64 encoded private key';
      keyInput.placeholder = 'e.g., AAAAAA...';
      break;
    case 'json':
      hintEl.textContent = 'JSON array of numbers (byte array format)';
      keyInput.placeholder = '[1, 2, 3, 4, ...]';
      break;
  }
}

/**
 * Handle private key import form submission
 */
async function handlePrivateKeyImport(e: Event): Promise<void> {
  e.preventDefault();
  
  const nameInput = document.getElementById('pk-import-name') as HTMLInputElement;
  const keyInput = document.getElementById('pk-private-key') as HTMLTextAreaElement;
  const passwordInput = document.getElementById('pk-import-password') as HTMLInputElement;
  const formatSelect = document.getElementById('pk-format-select') as HTMLSelectElement;
  
  const name = nameInput.value;
  const privateKey = keyInput.value;
  const password = passwordInput.value;
  const format = (formatSelect?.value || 'base58') as PrivateKeyFormat;
  
  try {
    const response = await fetch(`${API_BASE}/keys/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, privateKey, password, format })
    });
    
    const data: ImportKeypairResponse = await response.json();
    
    if (data.success) {
      showStatus('Keypair imported successfully!', 'success');
      backToMethodSelection();
      await loadKeypairs();
    } else {
      showStatus('Failed to import: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

// ============================================================================
// Seed Phrase (Mnemonic) Import Functions
// ============================================================================

// Current step tracker for back navigation
let currentSeedPhraseStep: 'mnemonic-step' | 'derivation-step' | 'address-selection-step' = 'mnemonic-step';

/**
 * Show specific step in seed phrase import flow
 */
function showSeedPhraseStep(stepId: 'mnemonic-step' | 'derivation-step' | 'address-selection-step'): void {
  currentSeedPhraseStep = stepId;
  const steps = ['mnemonic-step', 'derivation-step', 'address-selection-step'];
  steps.forEach(id => {
    const step = document.getElementById(id);
    if (step) {
      step.style.display = id === stepId ? 'block' : 'none';
    }
  });
}

/**
 * Validate mnemonic in real-time
 */
async function validateMnemonicInput(): Promise<void> {
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const validationEl = document.getElementById('mnemonic-validation') as HTMLDivElement;
  const continueBtn = document.getElementById('continue-to-derivation-btn') as HTMLButtonElement;
  
  const mnemonic = mnemonicInput.value.trim();
  
  if (!mnemonic) {
    validationEl.textContent = '';
    validationEl.className = 'validation-status';
    continueBtn.disabled = true;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keys/validate-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic })
    });
    
    const data: MnemonicValidationResponse = await response.json();
    
    if (data.success) {
      const validation = data.validation;
      validationEl.textContent = validation.message;
      
      if (validation.valid) {
        if (validation.checksumValid) {
          validationEl.className = 'validation-status valid';
        } else {
          validationEl.className = 'validation-status warning';
        }
        continueBtn.disabled = false;
      } else {
        validationEl.className = 'validation-status invalid';
        continueBtn.disabled = true;
      }
    }
  } catch (error) {
    validationEl.textContent = 'Error validating mnemonic';
    validationEl.className = 'validation-status invalid';
    continueBtn.disabled = true;
  }
}

/**
 * Continue to derivation step
 */
function continueToDerivationStep(): void {
  showSeedPhraseStep('derivation-step');
}

/**
 * Go back one step in the seed phrase import flow
 */
function goBackOneStep(): void {
  switch (currentSeedPhraseStep) {
    case 'mnemonic-step':
      // From mnemonic, go back to method selection
      backToMethodSelection();
      break;
    case 'derivation-step':
      // From derivation, go back to mnemonic
      showSeedPhraseStep('mnemonic-step');
      break;
    case 'address-selection-step':
      // From address selection, go back to derivation
      showSeedPhraseStep('derivation-step');
      break;
  }
}

/**
 * Handle derivation preset change
 */
function handleDerivationPresetChange(): void {
  const presetSelect = document.getElementById('derivation-preset') as HTMLSelectElement;
  const customInputContainer = document.getElementById('custom-path-input-container') as HTMLDivElement;
  const descriptionEl = document.getElementById('preset-description') as HTMLSpanElement;
  
  const preset = presetSelect.value;
  
  // Show/hide custom path input
  if (customInputContainer) {
    customInputContainer.style.display = preset === 'custom' ? 'block' : 'none';
  }
  
  // Update description
  const descriptions: Record<string, string> = {
    'backpack': 'Backpack wallet standard path',
    'backpack-legacy': 'Backpack wallet legacy format',
    'solana-legacy': 'Legacy Solana wallets',
    'ledger-live': 'Ledger hardware wallets',
    'custom': 'Enter your custom derivation path below'
  };
  
  if (descriptionEl) {
    descriptionEl.textContent = descriptions[preset] || '';
  }
}

/**
 * Build custom derivation path from input
 */
function buildCustomPath(): string {
  const customPathInput = document.getElementById('custom-path-input') as HTMLInputElement;
  return customPathInput?.value?.trim() || "m/44'/501'/{index}'";
}

/**
 * Get current derivation path
 */
function getDerivationPath(): string {
  const presetSelect = document.getElementById('derivation-preset') as HTMLSelectElement;
  
  if (presetSelect.value === 'custom') {
    return buildCustomPath();
  }
  
  // Return preset path (actual path will be handled by backend)
  return presetSelect.value;
}

/**
 * Preview derived addresses
 */
async function previewDerivedAddresses(): Promise<void> {
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const passphraseInput = document.getElementById('mnemonic-passphrase') as HTMLInputElement;
  
  const mnemonic = mnemonicInput.value.trim();
  const passphrase = passphraseInput.value;
  const preset = (document.getElementById('derivation-preset') as HTMLSelectElement).value;
  const customPath = preset === 'custom' ? buildCustomPath() : '';
  
  try {
    showStatus('Deriving addresses...', 'info');
    
    const response = await fetch(`${API_BASE}/keys/derive-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mnemonic,
        passphrase,
        preset,
        customPath,
        startIndex: 0,
        count: 5
      })
    });
    
    const data: DerivePreviewResponse = await response.json();
    
    if (data.success) {
      derivedAddressesCache = data.addresses;
      displayDerivedAddresses(data.addresses);
      showSeedPhraseStep('address-selection-step');
      showStatus('', 'info'); // Clear status
    } else {
      showStatus('Failed to derive addresses: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

/**
 * Display derived addresses in table
 */
function displayDerivedAddresses(addresses: DerivedAddress[]): void {
  const tbody = document.getElementById('address-list') as HTMLTableSectionElement;
  
  if (!tbody) return;
  
  tbody.innerHTML = addresses.map((addr, idx) => `
    <tr>
      <td><input type="radio" name="selected-address" value="${addr.index}" ${idx === 0 ? 'checked' : ''}></td>
      <td>${addr.index}</td>
      <td>${addr.path}</td>
      <td>${shortenAddressForDisplay(addr.publicKey)}</td>
    </tr>
  `).join('');
}

/**
 * Shorten address for display (first 4 + last 4 chars)
 */
function shortenAddressForDisplay(address: string): string {
  if (address.length < 10) return address;
  return address.slice(0, 4) + '...' + address.slice(-4);
}

/**
 * Load more addresses
 */
async function loadMoreAddresses(): Promise<void> {
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const passphraseInput = document.getElementById('mnemonic-passphrase') as HTMLInputElement;
  
  const mnemonic = mnemonicInput.value.trim();
  const passphrase = passphraseInput.value;
  const preset = (document.getElementById('derivation-preset') as HTMLSelectElement).value;
  const customPath = preset === 'custom' ? buildCustomPath() : '';
  
  const startIndex = derivedAddressesCache.length;
  
  try {
    const loadMoreBtn = document.getElementById('load-more-addresses-btn') as HTMLButtonElement;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    const response = await fetch(`${API_BASE}/keys/derive-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mnemonic,
        passphrase,
        preset,
        customPath,
        startIndex,
        count: 5
      })
    });
    
    const data: DerivePreviewResponse = await response.json();
    
    if (data.success) {
      derivedAddressesCache = [...derivedAddressesCache, ...data.addresses];
      
      // Append to table
      const tbody = document.getElementById('address-list') as HTMLTableSectionElement;
      const newRows = data.addresses.map(addr => `
        <tr>
          <td><input type="radio" name="selected-address" value="${addr.index}"></td>
          <td>${addr.index}</td>
          <td>${addr.path}</td>
          <td>${shortenAddressForDisplay(addr.publicKey)}</td>
        </tr>
      `).join('');
      tbody.innerHTML += newRows;
    }
    
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
  } catch (error) {
    showStatus('Error loading more addresses', 'error');
  }
}

/**
 * Get selected address index from radio buttons
 */
function getSelectedAddressIndex(): number | null {
  const selected = document.querySelector('input[name="selected-address"]:checked') as HTMLInputElement;
  return selected ? parseInt(selected.value) : null;
}

/**
 * Handle seed phrase import
 */
async function handleSeedPhraseImport(): Promise<void> {
  const nameInput = document.getElementById('sp-import-name') as HTMLInputElement;
  const passwordInput = document.getElementById('sp-import-password') as HTMLInputElement;
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const passphraseInput = document.getElementById('mnemonic-passphrase') as HTMLInputElement;
  
  const name = nameInput.value;
  const password = passwordInput.value;
  const mnemonic = mnemonicInput.value.trim();
  const passphrase = passphraseInput.value;
  const accountIndex = getSelectedAddressIndex();
  const preset = (document.getElementById('derivation-preset') as HTMLSelectElement).value;
  const customPath = preset === 'custom' ? buildCustomPath() : '';
  
  if (accountIndex === null) {
    showStatus('Please select an address to import', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keys/import-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mnemonic,
        accountIndex,
        password,
        passphrase,
        preset,
        customPath
      })
    });
    
    const data: ImportMnemonicResponse = await response.json();
    
    if (data.success) {
      showStatus('Keypair imported successfully from seed phrase!', 'success');
      backToMethodSelection();
      await loadKeypairs();
    } else {
      showStatus('Failed to import: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

// ============================================================================
// Additional Event Listeners Setup
// ============================================================================

// Setup additional event listeners after DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Private key format dropdown
  const pkFormatSelect = document.getElementById('pk-format-select') as HTMLSelectElement;
  if (pkFormatSelect) {
    pkFormatSelect.addEventListener('change', handlePKFormatChange);
  }
  
  // Private key form
  const privateKeyForm = document.getElementById('private-key-form') as HTMLFormElement;
  if (privateKeyForm) {
    privateKeyForm.addEventListener('submit', handlePrivateKeyImport);
  }
  
  // Mnemonic input validation (debounced)
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  if (mnemonicInput) {
    let debounceTimer: ReturnType<typeof setTimeout>;
    mnemonicInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(validateMnemonicInput, 500);
    });
  }
  
  // Continue to derivation step
  const continueBtn = document.getElementById('continue-to-derivation-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', continueToDerivationStep);
  }
  
  // Derivation preset change
  const presetSelect = document.getElementById('derivation-preset');
  if (presetSelect) {
    presetSelect.addEventListener('change', handleDerivationPresetChange);
  }
  
  // Preview addresses
  const previewBtn = document.getElementById('preview-addresses-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', previewDerivedAddresses);
  }
  
  // Load more addresses
  const loadMoreBtn = document.getElementById('load-more-addresses-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreAddresses);
  }
  
  // Import seed phrase
  const importSeedBtn = document.getElementById('import-seed-phrase-btn');
  if (importSeedBtn) {
    importSeedBtn.addEventListener('click', handleSeedPhraseImport);
  }
});

// Make functions available globally
(window as any).validateMnemonicInput = validateMnemonicInput;
(window as any).continueToDerivationStep = continueToDerivationStep;
(window as any).goBackOneStep = goBackOneStep;
(window as any).previewDerivedAddresses = previewDerivedAddresses;
(window as any).loadMoreAddresses = loadMoreAddresses;
(window as any).handleSeedPhraseImport = handleSeedPhraseImport;
(window as any).handleDerivationPresetChange = handleDerivationPresetChange;