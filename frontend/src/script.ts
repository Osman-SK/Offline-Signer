import {
  KeypairInfo,
  KeypairListResponse,
  ParsedTransaction,
  GenerateKeypairResponse,
  ImportKeypairResponse,
  UploadTransactionResponse,
  SignTransactionResponse,
  PrivateKeyFormat,
  StatusType
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
