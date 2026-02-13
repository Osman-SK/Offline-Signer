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

// Simplified global state
const state = {
  transaction: null as ParsedTransaction | null,
  filePath: null as string | null,
  hasPassword: false,
  navStack: ['method-grid'] as string[],
  flowMode: null as 'import' | 'generate' | null,
  mnemonic: '',
  passphrase: '',
  derivedAddresses: [] as DerivedAddress[],
  exportKeypairName: null as string | null,
  exportHasSeedPhrase: false,
  verificationPositions: [] as number[]
};

function showPasswordGate(): void {
  const gate = document.getElementById('password-gate');
  const mainApp = document.getElementById('main-app');
  if (gate) gate.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';
}

function hidePasswordGate(): void {
  const gate = document.getElementById('password-gate');
  const mainApp = document.getElementById('main-app');
  if (gate) gate.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp(): Promise<void> {
  await checkPasswordStatus();
  
  // Setup event listeners first (always needed for gate form)
  setupEventListeners();
  
  if (!state.hasPassword) {
    // Show gate page, hide main app
    showPasswordGate();
  } else {
    // Hide gate page, show main app, proceed with initialization
    hidePasswordGate();
    loadKeypairs();
  }
}

// ============================================================================
// Simplified Navigation
// ============================================================================

function navigateTo(step: string): void {
  state.navStack.push(step);
  showStep(step);
}

function navigateBack(): void {
  if (state.navStack.length > 1) {
    state.navStack.pop();
    const currentStep = state.navStack[state.navStack.length - 1];
    showStep(currentStep);
  }
}

function showStep(step: string): void {
  const grid = document.getElementById('method-selection-grid');
  
  // Hide all steps/forms
  document.querySelectorAll('.inline-method-form, .seed-step').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // Show requested step and handle grid visibility
  switch (step) {
    case 'method-grid':
      if (grid) grid.style.display = 'grid';
      break;
    case 'seed-flow':
      if (grid) grid.style.display = 'none';
      (document.getElementById('seed-flow-container') as HTMLElement).style.display = 'block';
      (document.getElementById('seed-step-mnemonic') as HTMLElement).style.display = 'block';
      // Ensure correct section is visible based on flow mode
      const inputSection = document.getElementById('mnemonic-input-section');
      const displaySection = document.getElementById('mnemonic-display-section');
      if (inputSection && displaySection) {
        if (state.flowMode === 'import') {
          inputSection.style.display = 'block';
          displaySection.style.display = 'none';
        } else if (state.flowMode === 'generate') {
          inputSection.style.display = 'none';
          displaySection.style.display = 'block';
        }
      }
      break;
    case 'seed-verify':
      if (grid) grid.style.display = 'none';
      (document.getElementById('seed-flow-container') as HTMLElement).style.display = 'block';
      (document.getElementById('seed-step-verify') as HTMLElement).style.display = 'block';
      break;
    case 'seed-derivation':
      if (grid) grid.style.display = 'none';
      (document.getElementById('seed-flow-container') as HTMLElement).style.display = 'block';
      (document.getElementById('seed-step-derivation') as HTMLElement).style.display = 'block';
      break;
    case 'seed-addresses':
      if (grid) grid.style.display = 'none';
      (document.getElementById('seed-flow-container') as HTMLElement).style.display = 'block';
      (document.getElementById('seed-step-addresses') as HTMLElement).style.display = 'block';
      break;
    case 'private-key':
      if (grid) grid.style.display = 'none';
      (document.getElementById('private-key-form') as HTMLElement).style.display = 'block';
      break;
    case 'keypair':
      if (grid) grid.style.display = 'none';
      (document.getElementById('keypair-form') as HTMLElement).style.display = 'block';
      break;
  }
}

function backToMethodGrid(): void {
  state.navStack = ['method-grid'];
  state.flowMode = null;
  state.mnemonic = '';
  state.derivedAddresses = [];
  
  // Reset all forms
  document.querySelectorAll('form').forEach(f => f.reset());
  document.querySelectorAll('textarea').forEach(t => t.value = '');
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb as HTMLInputElement).checked = false);
  
  // Hide all inline forms, show grid
  document.querySelectorAll('.inline-method-form, .seed-step').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  (document.getElementById('method-selection-grid') as HTMLElement).style.display = 'grid';
}

// ============================================================================
// Tab Navigation
// ============================================================================

function showTab(tabName: string): void {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

  const tabElement = document.getElementById(`${tabName}-tab`);
  const buttonElement = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  
  if (tabElement) tabElement.classList.add('active');
  if (buttonElement) buttonElement.classList.add('active');

  if (tabName === 'sign') {
    loadKeypairsForSigning();
    updateSigningPasswordHint();
  }
}

// ============================================================================
// Password Management (Settings Dropdown)
// ============================================================================

async function checkPasswordStatus(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/password/status`);
    const data = await response.json();
    state.hasPassword = data.hasPassword;
  } catch (error) {
    console.error('Failed to check password status:', error);
  }
}

async function handleGatePasswordSet(e: Event): Promise<void> {
  e.preventDefault();
  const passwordInput = document.getElementById('gate-password') as HTMLInputElement;
  const errorEl = document.getElementById('gate-password-error');
  const password = passwordInput.value;
  
  if (!password) {
    if (errorEl) errorEl.style.display = 'block';
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/password/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    if (data.success) {
      state.hasPassword = true;
      passwordInput.value = '';
      if (errorEl) errorEl.style.display = 'none';
      hidePasswordGate();
      loadKeypairs();
      showStatus('Password set successfully! Welcome to Offline Solana Transaction Signer.', 'success');
    } else {
      showStatus('Failed to set password: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error setting password: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

async function verifyPassword(password: string): Promise<boolean> {
  if (!state.hasPassword) return true;
  if (!password) return false;
  
  try {
    const response = await fetch(`${API_BASE}/password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    return data.valid;
  } catch {
    return false;
  }
}

// ============================================================================
// Seed Phrase Flow (Unified Import/Generate)
// ============================================================================

function startSeedFlow(mode: 'import' | 'generate'): void {
  state.flowMode = mode;
  state.navStack = ['method-grid'];
  
  const inputSection = document.getElementById('mnemonic-input-section');
  const displaySection = document.getElementById('mnemonic-display-section');
  const title = document.getElementById('mnemonic-step-title');
  
  if (mode === 'import') {
    if (title) title.textContent = 'Enter Your Seed Phrase';
    if (inputSection) inputSection.style.display = 'block';
    if (displaySection) displaySection.style.display = 'none';
    navigateTo('seed-flow');
  } else {
    if (title) title.textContent = 'Your New Seed Phrase';
    if (inputSection) inputSection.style.display = 'none';
    if (displaySection) displaySection.style.display = 'block';
    generateNewMnemonic();
    navigateTo('seed-flow');
  }
}

function showMethodForm(method: 'private-key' | 'keypair'): void {
  state.navStack = ['method-grid'];
  if (method === 'private-key') {
    navigateTo('private-key');
  } else {
    navigateTo('keypair');
  }
}

async function generateNewMnemonic(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/keys/generate-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    if (data.success) {
      state.mnemonic = data.mnemonic;
      displayGeneratedMnemonic(data.mnemonic);
    } else {
      showStatus('Failed to generate mnemonic: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function displayGeneratedMnemonic(mnemonic: string): void {
  const display = document.getElementById('generated-mnemonic-display');
  if (!display) return;
  
  const words = mnemonic.split(' ');
  display.innerHTML = words.map((word, idx) => `
    <div class="mnemonic-word">
      <span class="word-number">${idx + 1}</span>
      <span class="word-text">${word}</span>
    </div>
  `).join('');
}

function showMnemonicVerification(): void {
  // Randomly select 4 positions for verification
  const positions: number[] = [];
  while (positions.length < 4) {
    const pos = Math.floor(Math.random() * 24) + 1;
    if (!positions.includes(pos)) positions.push(pos);
  }
  positions.sort((a, b) => a - b);
  state.verificationPositions = positions;
  
  const container = document.getElementById('mnemonic-verification-container');
  if (!container) return;
  
  container.innerHTML = positions.map(pos => `
    <div class="form-group verification-word-group">
      <label for="verify-word-${pos}">Word #${pos}:</label>
      <input type="text" id="verify-word-${pos}" class="verification-word-input" data-position="${pos}" placeholder="Enter word ${pos}">
    </div>
  `).join('');
  
  // Enable verify button when all inputs filled
  const inputs = container.querySelectorAll('.verification-word-input');
  const verifyBtn = document.getElementById('verify-mnemonic-btn') as HTMLButtonElement;
  verifyBtn.disabled = true;
  
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const allFilled = Array.from(inputs).every(inp => (inp as HTMLInputElement).value.trim() !== '');
      verifyBtn.disabled = !allFilled;
    });
  });
  
  navigateTo('seed-verify');
}

function verifyMnemonicWords(): void {
  const words = state.mnemonic.split(' ');
  let allCorrect = true;
  
  for (const pos of state.verificationPositions) {
    const input = document.getElementById(`verify-word-${pos}`) as HTMLInputElement;
    const entered = input.value.trim().toLowerCase();
    const correct = words[pos - 1].toLowerCase();
    
    if (entered !== correct) {
      allCorrect = false;
      input.classList.add('error');
    } else {
      input.classList.remove('error');
      input.classList.add('success');
    }
  }
  
  if (allCorrect) {
    showStatus('Verification successful!', 'success');
    setTimeout(() => navigateTo('seed-derivation'), 500);
  } else {
    showStatus('Some words are incorrect. Please check your written phrase.', 'error');
  }
}

// ============================================================================
// Derivation Path (Shared for Import/Generate)
// ============================================================================

function handleDerivationPresetChange(): void {
  const preset = (document.getElementById('derivation-preset') as HTMLSelectElement).value;
  const customContainer = document.getElementById('custom-path-container');
  const description = document.getElementById('preset-description');
  
  const descriptions: Record<string, string> = {
    'backpack': 'Backpack wallet standard path',
    'backpack-legacy': 'Backpack wallet legacy format',
    'solana-legacy': 'Legacy Solana wallets',
    'ledger-live': 'Ledger hardware wallets',
    'custom': 'Enter your custom derivation path below'
  };
  
  if (description) description.textContent = descriptions[preset] || '';
  if (customContainer) customContainer.style.display = preset === 'custom' ? 'block' : 'none';
}

function getDerivationConfig(): { preset: string; customPath: string } {
  const presetSelect = document.getElementById('derivation-preset') as HTMLSelectElement;
  const customInput = document.getElementById('custom-path-input') as HTMLInputElement;
  const preset = presetSelect.value;
  const customPath = preset === 'custom' ? (customInput?.value?.trim() || "m/44'/501'/{index}'") : '';
  return { preset, customPath };
}

async function previewDerivedAddresses(): Promise<void> {
  const { preset, customPath } = getDerivationConfig();
  const passphrase = state.flowMode === 'import' 
    ? (document.getElementById('mnemonic-passphrase') as HTMLInputElement)?.value || ''
    : '';
  
  try {
    showStatus('Deriving addresses...', 'info');
    
    const response = await fetch(`${API_BASE}/keys/derive-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mnemonic: state.mnemonic,
        passphrase,
        preset,
        customPath,
        startIndex: 0,
        count: 5
      })
    });
    
    const data: DerivePreviewResponse = await response.json();
    
    if (data.success) {
      state.derivedAddresses = data.addresses;
      displayAddressTable(data.addresses, 'address-list');
      navigateTo('seed-addresses');
      showStatus('', 'info');
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function displayAddressTable(addresses: DerivedAddress[], tbodyId: string): void {
  const tbody = document.getElementById(tbodyId) as HTMLTableSectionElement;
  if (!tbody) return;
  
  tbody.innerHTML = addresses.map((addr, idx) => `
    <tr>
      <td><input type="radio" name="selected-address" value="${addr.index}" ${idx === 0 ? 'checked' : ''}></td>
      <td>${addr.index}</td>
      <td>${addr.path}</td>
      <td>${shortenAddress(addr.publicKey)}</td>
    </tr>
  `).join('');
}

async function loadMoreAddresses(): Promise<void> {
  const { preset, customPath } = getDerivationConfig();
  const passphrase = state.flowMode === 'import' 
    ? (document.getElementById('mnemonic-passphrase') as HTMLInputElement)?.value || ''
    : '';
  
  const startIndex = state.derivedAddresses.length;
  const loadMoreBtn = document.getElementById('load-more-addresses-btn') as HTMLButtonElement;
  loadMoreBtn.textContent = 'Loading...';
  loadMoreBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/keys/derive-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mnemonic: state.mnemonic,
        passphrase,
        preset,
        customPath,
        startIndex,
        count: 5
      })
    });
    
    const data: DerivePreviewResponse = await response.json();
    
    if (data.success) {
      state.derivedAddresses = [...state.derivedAddresses, ...data.addresses];
      const tbody = document.getElementById('address-list') as HTMLTableSectionElement;
      const newRows = data.addresses.map(addr => `
        <tr>
          <td><input type="radio" name="selected-address" value="${addr.index}"></td>
          <td>${addr.index}</td>
          <td>${addr.path}</td>
          <td>${shortenAddress(addr.publicKey)}</td>
        </tr>
      `).join('');
      tbody.innerHTML += newRows;
    }
  } catch (error) {
    showStatus('Error loading more addresses', 'error');
  } finally {
    loadMoreBtn.textContent = 'Load More Addresses';
    loadMoreBtn.disabled = false;
  }
}

function getSelectedAddressIndex(): number | null {
  const selected = document.querySelector('input[name="selected-address"]:checked') as HTMLInputElement;
  return selected ? parseInt(selected.value) : null;
}

async function handleSeedPhraseImport(): Promise<void> {
  const nameInput = document.getElementById('seed-import-name') as HTMLInputElement;
  const name = nameInput?.value;
  
  if (!name?.trim()) {
    showStatus('Please enter a keypair name', 'error');
    return;
  }
  
  const accountIndex = getSelectedAddressIndex();
  if (accountIndex === null) {
    showStatus('Please select an address', 'error');
    return;
  }
  
  const { preset, customPath } = getDerivationConfig();
  const passphrase = state.flowMode === 'import'
    ? (document.getElementById('mnemonic-passphrase') as HTMLInputElement)?.value || ''
    : '';
  
  try {
    const response = await fetch(`${API_BASE}/keys/import-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mnemonic: state.mnemonic,
        accountIndex,
        passphrase,
        preset,
        customPath,
        storeMnemonic: state.flowMode === 'generate'
      })
    });
    
    const data: ImportMnemonicResponse = await response.json();
    
    if (data.success) {
      const msg = state.flowMode === 'generate' 
        ? 'Wallet created successfully!' 
        : 'Keypair imported from seed phrase!';
      showStatus(msg, 'success');
      backToMethodGrid();
      await loadKeypairs();
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

// ============================================================================
// Key Management Functions
// ============================================================================

async function loadKeypairs(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/keys`);
    const data: KeypairListResponse = await response.json();
    
    const container = document.getElementById('keypair-list') as HTMLDivElement;
    
    if (!data.success || data.keys.length === 0) {
      container.innerHTML = '<p class="loading">No keypairs found. Generate or import one to get started.</p>';
      return;
    }
    
    container.innerHTML = data.keys.map((key: KeypairInfo) => {
      const seedIndicator = key.hasSeedPhrase ? '🌱 ' : '';
      const date = new Date(key.createdAt || key.importedAt || '').toLocaleString();
      const dateLabel = key.createdAt ? 'Created' : 'Imported';
      
      return `
        <div class="keypair-item">
          <div class="keypair-info">
            <h3>${seedIndicator}${key.name}</h3>
            <p>${key.publicKey}</p>
            <small>${dateLabel}: ${date}</small>
          </div>
          <div class="keypair-actions">
            <button class="btn btn-secondary" onclick="copyPublicKey('${key.publicKey}')">Copy</button>
            <button class="btn btn-secondary" onclick="showInlineExport('${key.name}', ${key.hasSeedPhrase || false})">Export</button>
            <button class="btn btn-danger" onclick="deleteKeypair('${key.name}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    showStatus('Failed to load keypairs', 'error');
  }
}

async function handleGenerateKeypair(e: Event): Promise<void> {
  e.preventDefault();
  
  const nameInput = document.getElementById('gen-name') as HTMLInputElement;
  const name = nameInput?.value;
  
  if (!name?.trim()) {
    showStatus('Please enter a keypair name', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keys/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data: GenerateKeypairResponse = await response.json();
    
    if (data.success) {
      showStatus('Keypair generated!', 'success');
      (document.getElementById('gen-keypair-form') as HTMLFormElement).reset();
      backToMethodGrid();
      await loadKeypairs();
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

async function handlePrivateKeyImport(e: Event): Promise<void> {
  e.preventDefault();
  
  const nameInput = document.getElementById('pk-import-name') as HTMLInputElement;
  const keyInput = document.getElementById('pk-private-key') as HTMLTextAreaElement;
  const formatSelect = document.getElementById('pk-format-select') as HTMLSelectElement;
  
  const name = nameInput?.value;
  const privateKey = keyInput?.value;
  const format = (formatSelect?.value || 'base58') as PrivateKeyFormat;
  
  if (!name?.trim() || !privateKey?.trim()) {
    showStatus('Please fill in all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keys/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, privateKey, format })
    });
    
    const data: ImportKeypairResponse = await response.json();
    
    if (data.success) {
      showStatus('Keypair imported!', 'success');
      (document.getElementById('pk-form') as HTMLFormElement).reset();
      backToMethodGrid();
      await loadKeypairs();
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

async function deleteKeypair(name: string): Promise<void> {
  if (!confirm(`Delete keypair "${name}"? This cannot be undone!`)) return;
  
  try {
    const response = await fetch(`${API_BASE}/keys/${name}`, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.success) {
      showStatus(`Keypair "${name}" deleted`, 'success');
      await loadKeypairs();
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function copyPublicKey(publicKey: string): void {
  navigator.clipboard.writeText(publicKey);
  showStatus('Public key copied!', 'success');
}

function handlePKFormatChange(): void {
  const format = (document.getElementById('pk-format-select') as HTMLSelectElement).value as PrivateKeyFormat;
  const hint = document.getElementById('pk-format-hint');
  const input = document.getElementById('pk-private-key') as HTMLTextAreaElement;
  
  const hints: Record<PrivateKeyFormat, string> = {
    'base58': 'Base58 encoded (e.g., from Phantom, Solflare, Solana CLI)',
    'base64': 'Base64 encoded private key',
    'json': 'JSON array of numbers (byte array format)'
  };
  
  const placeholders: Record<PrivateKeyFormat, string> = {
    'base58': 'e.g., 5Maii9c...',
    'base64': 'e.g., AAAAAA...',
    'json': '[1, 2, 3, 4, ...]'
  };
  
  if (hint) hint.textContent = hints[format];
  if (input) input.placeholder = placeholders[format];
}

// ============================================================================
// Inline Export Functions
// ============================================================================

function showInlineExport(name: string, hasSeedPhrase: boolean): void {
  state.exportKeypairName = name;
  state.exportHasSeedPhrase = hasSeedPhrase;

  const card = document.getElementById('inline-export-card');
  const passwordSection = document.getElementById('inline-export-password-section');
  const options = document.getElementById('inline-export-options');
  const result = document.getElementById('inline-export-result');
  const seedOption = document.getElementById('inline-export-seed-option') as HTMLOptionElement;

  if (card) {
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (options) options.style.display = 'block';
  if (result) result.style.display = 'none';
  if (passwordSection) passwordSection.style.display = state.hasPassword ? 'block' : 'none';
  if (seedOption) seedOption.style.display = hasSeedPhrase ? 'block' : 'none';

  // Reset
  (document.getElementById('inline-export-password') as HTMLInputElement).value = '';
  (document.getElementById('inline-export-result-text') as HTMLTextAreaElement).value = '';
  (document.getElementById('export-keypair-name-display') as HTMLElement).textContent = name;
}

function closeInlineExport(): void {
  const card = document.getElementById('inline-export-card');
  if (card) card.style.display = 'none';
  state.exportKeypairName = null;
  state.exportHasSeedPhrase = false;
}

async function handleConfirmExport(): Promise<void> {
  if (!state.exportKeypairName) return;

  const format = (document.getElementById('inline-export-format') as HTMLSelectElement).value;
  const password = (document.getElementById('inline-export-password') as HTMLInputElement).value;

  try {
    showStatus('Exporting...', 'info');

    const endpoint = format === 'seed-phrase'
      ? `${API_BASE}/keys/export/seed-phrase`
      : `${API_BASE}/keys/export/private-key`;

    const body: Record<string, string> = { name: state.exportKeypairName };
    if (format !== 'seed-phrase') body.format = format;
    if (password) body.password = password;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.success) {
      const textarea = document.getElementById('inline-export-result-text') as HTMLTextAreaElement;
      textarea.value = data.privateKey || data.mnemonic || '';

      document.getElementById('inline-export-options')!.style.display = 'none';
      document.getElementById('inline-export-result')!.style.display = 'block';
      showStatus('Export successful!', 'success');
    } else {
      showStatus('Export failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function handleExportFormatChange(): void {
  const format = (document.getElementById('inline-export-format') as HTMLSelectElement).value;
  const hint = document.getElementById('export-format-hint');
  
  const hints: Record<string, string> = {
    'base58': 'Base58 encoded private key (e.g., from Phantom, Solflare)',
    'base64': 'Base64 encoded private key',
    'json': 'JSON array format (byte array)',
    'seed-phrase': 'Full recovery phrase for wallet backup'
  };
  
  if (hint) hint.textContent = hints[format] || '';
}

function copyInlineExportResult(): void {
  const textarea = document.getElementById('inline-export-result-text') as HTMLTextAreaElement;
  if (textarea?.value) {
    navigator.clipboard.writeText(textarea.value);
    showStatus('Copied!', 'success');
  }
}

function downloadInlineExportResult(): void {
  const textarea = document.getElementById('inline-export-result-text') as HTMLTextAreaElement;
  if (!textarea?.value) return;
  
  const blob = new Blob([textarea.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-${state.exportKeypairName || 'key'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('Downloaded!', 'success');
}

// ============================================================================
// Transaction Signing Functions
// ============================================================================

function updateSigningPasswordHint(): void {
  const hint = document.getElementById('password-required-hint');
  if (hint) hint.style.display = state.hasPassword ? 'block' : 'none';
}

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
        option.textContent = `${key.name} (${shortenAddress(key.publicKey)})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    showStatus('Failed to load keypairs', 'error');
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
  if (files?.length) uploadTransaction(files[0]);
}

function handleFileSelect(e: Event): void {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) uploadTransaction(files[0]);
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
      state.transaction = data.transaction;
      state.filePath = data.filePath;
      displayTransactionDetails(data.transaction);
      showStatus('Transaction loaded!', 'success');
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function displayTransactionDetails(tx: ParsedTransaction): void {
  const details = tx.details;
  const html = `
    <div class="tx-detail"><span class="tx-detail-label">Network:</span><span class="tx-detail-value">${details.network}</span></div>
    <div class="tx-detail"><span class="tx-detail-label">Type:</span><span class="tx-detail-value">${details.type}</span></div>
    <div class="tx-detail"><span class="tx-detail-label">Description:</span><span class="tx-detail-value">${details.description}</span></div>
    ${details.amountFormatted ? `<div class="tx-detail"><span class="tx-detail-label">Amount:</span><span class="tx-detail-value tx-amount">${details.amountFormatted}</span></div>` : ''}
    <div class="tx-detail"><span class="tx-detail-label">Fee Payer:</span><span class="tx-detail-value">${details.feePayer}</span></div>
  `;
  
  const txInfo = document.getElementById('tx-info');
  const txDetails = document.getElementById('transaction-details');
  
  if (txInfo) txInfo.innerHTML = html;
  if (txDetails) txDetails.style.display = 'block';
}

async function handleApprove(): Promise<void> {
  const keySelect = document.getElementById('signing-key') as HTMLSelectElement;
  const passwordInput = document.getElementById('global-signing-password') as HTMLInputElement;
  
  const keyName = keySelect?.value;
  const password = passwordInput?.value;
  
  if (!keyName) {
    showStatus('Please select a keypair', 'error');
    return;
  }
  
  if (state.hasPassword && !password) {
    showStatus('Please enter your password', 'error');
    return;
  }
  
  if (!state.filePath) {
    showStatus('No transaction loaded', 'error');
    return;
  }
  
  if (state.hasPassword) {
    const isValid = await verifyPassword(password);
    if (!isValid) {
      showStatus('Invalid password', 'error');
      return;
    }
  }
  
  try {
    const response = await fetch(`${API_BASE}/transaction/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: state.filePath,
        keyName,
        password,
        approve: true
      })
    });
    
    const data: SignTransactionResponse = await response.json();
    
    if (data.success) {
      displaySigningResult(data);
      showStatus('Transaction signed!', 'success');
    } else {
      showStatus('Failed: ' + data.error, 'error');
    }
  } catch (error) {
    showStatus('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
}

function handleDecline(): void {
  document.getElementById('transaction-details')!.style.display = 'none';
  document.getElementById('signing-result')!.style.display = 'none';
  (document.getElementById('transaction-file') as HTMLInputElement).value = '';
  (document.getElementById('global-signing-password') as HTMLInputElement).value = '';
  state.transaction = null;
  state.filePath = null;
  showStatus('Transaction declined', 'info');
}

function displaySigningResult(data: SignTransactionResponse): void {
  if (!data.signature || !data.publicKey || !data.signedAt || !data.downloadUrl) {
    showStatus('Invalid signing result', 'error');
    return;
  }
  
  const html = `
    <h3>✓ Transaction Signed Successfully</h3>
    <p><strong>Public Key:</strong> ${data.publicKey}</p>
    <p><strong>Signature:</strong> ${shortenAddress(data.signature)}</p>
    <p><strong>Signed At:</strong> ${new Date(data.signedAt).toLocaleString()}</p>
    <a href="${data.downloadUrl}" class="download-link" download>⬇ Download Signed Transaction</a>
    <p style="margin-top: 20px; color: #666;"><small>Next: Transfer the signed transaction file to your online machine and broadcast it.</small></p>
  `;
  
  const resultInfo = document.getElementById('result-info');
  if (resultInfo) resultInfo.innerHTML = html;
  document.getElementById('transaction-details')!.style.display = 'none';
  document.getElementById('signing-result')!.style.display = 'block';
}

// ============================================================================
// Mnemonic Validation
// ============================================================================

async function validateMnemonicInput(): Promise<void> {
  const input = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  const validation = document.getElementById('mnemonic-validation');
  const continueBtn = document.getElementById('continue-to-derivation-btn') as HTMLButtonElement;
  
  const mnemonic = input?.value?.trim();
  
  if (!mnemonic) {
    if (validation) {
      validation.textContent = '';
      validation.className = 'validation-status';
    }
    if (continueBtn) continueBtn.disabled = true;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keys/validate-mnemonic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic })
    });
    
    const data: MnemonicValidationResponse = await response.json();
    
    if (data.success && validation) {
      const val = data.validation;
      validation.textContent = val.message;
      
      if (val.valid) {
        validation.className = val.checksumValid ? 'validation-status valid' : 'validation-status warning';
        state.mnemonic = mnemonic;
        if (continueBtn) continueBtn.disabled = false;
      } else {
        validation.className = 'validation-status invalid';
        if (continueBtn) continueBtn.disabled = true;
      }
    }
  } catch {
    if (validation) {
      validation.textContent = 'Error validating';
      validation.className = 'validation-status invalid';
    }
    if (continueBtn) continueBtn.disabled = true;
  }
}

function continueToDerivation(): void {
  navigateTo('seed-derivation');
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

function setupEventListeners(): void {
  // Gate password form
  const gateForm = document.getElementById('gate-password-form') as HTMLFormElement;
  if (gateForm) {
    gateForm.addEventListener('submit', handleGatePasswordSet);
  }
  
  // Generate keypair form
  document.getElementById('gen-keypair-form')?.addEventListener('submit', handleGenerateKeypair);
  
  // Private key form
  document.getElementById('pk-form')?.addEventListener('submit', handlePrivateKeyImport);
  document.getElementById('pk-format-select')?.addEventListener('change', handlePKFormatChange);
  
  // File upload
  const fileArea = document.getElementById('file-upload-area');
  const fileInput = document.getElementById('transaction-file') as HTMLInputElement;
  
  if (fileArea && fileInput) {
    fileArea.addEventListener('click', () => fileInput.click());
    fileArea.addEventListener('dragover', handleDragOver);
    fileArea.addEventListener('dragleave', handleDragLeave);
    fileArea.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Signing
  document.getElementById('approve-btn')?.addEventListener('click', handleApprove);
  document.getElementById('decline-btn')?.addEventListener('click', handleDecline);
  
  // Mnemonic validation (debounced)
  const mnemonicInput = document.getElementById('mnemonic-input') as HTMLTextAreaElement;
  if (mnemonicInput) {
    let timer: ReturnType<typeof setTimeout>;
    mnemonicInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(validateMnemonicInput, 300);
    });
  }
  
  // Seed flow navigation
  document.getElementById('continue-to-derivation-btn')?.addEventListener('click', continueToDerivation);
  document.getElementById('continue-to-verify-btn')?.addEventListener('click', showMnemonicVerification);
  document.getElementById('mnemonic-written-check')?.addEventListener('change', (e) => {
    (document.getElementById('continue-to-verify-btn') as HTMLButtonElement).disabled = !(e.target as HTMLInputElement).checked;
  });
  document.getElementById('verify-mnemonic-btn')?.addEventListener('click', verifyMnemonicWords);
  
  // Derivation path
  document.getElementById('derivation-preset')?.addEventListener('change', handleDerivationPresetChange);
  document.getElementById('preview-addresses-btn')?.addEventListener('click', previewDerivedAddresses);
  document.getElementById('load-more-addresses-btn')?.addEventListener('click', loadMoreAddresses);
  document.getElementById('import-seed-btn')?.addEventListener('click', handleSeedPhraseImport);
  
  // Export
  document.getElementById('inline-confirm-export-btn')?.addEventListener('click', handleConfirmExport);
  document.getElementById('inline-export-format')?.addEventListener('change', handleExportFormatChange);
}

// ============================================================================
// Utility Functions
// ============================================================================

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return address.slice(0, 4) + '...' + address.slice(-4);
}

function showStatus(message: string, type: StatusType = 'info'): void {
  const statusEl = document.getElementById('status-message') as HTMLDivElement;
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    setTimeout(() => statusEl.classList.remove('show'), 5000);
  }
}

// Make functions available globally for HTML onclick handlers
(window as any).showTab = showTab;
(window as any).startSeedFlow = startSeedFlow;
(window as any).showMethodForm = showMethodForm;
(window as any).navigateBack = navigateBack;
(window as any).backToMethodGrid = backToMethodGrid;
(window as any).copyPublicKey = copyPublicKey;
(window as any).deleteKeypair = deleteKeypair;
(window as any).showInlineExport = showInlineExport;
(window as any).closeInlineExport = closeInlineExport;
(window as any).copyInlineExportResult = copyInlineExportResult;
(window as any).downloadInlineExportResult = downloadInlineExportResult;
