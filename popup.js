// ============================================
// POPUP SCRIPT
// ============================================

async function init() {
  const content = document.getElementById('main-content');

  // Check if on Google Sheets
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isSheets = tab?.url?.includes('docs.google.com/spreadsheets');

  if (!isSheets) {
    content.innerHTML = `
      <div class="not-sheets">
        <div class="emoji">📊</div>
        <p>Open a Google Sheets file to use Sudarshan Sheets AI</p>
        <button class="open-sheets-btn" id="open-sheets">Open Google Sheets</button>
      </div>
    `;
    document.getElementById('open-sheets').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://sheets.google.com' });
    });
    return;
  }

  // Get auth status
  const storage = await chrome.storage.local.get(['auth_token', 'user_profile']);
  const isAuthed = !!storage.auth_token;
  const profile = storage.user_profile || {};

  content.innerHTML = `
    <div class="status-section">
      <div class="status-row">
        <span class="status-label">Google Sheets</span>
        <span class="status-badge badge-green">✓ Active</span>
      </div>
      <div class="status-row">
        <span class="status-label">Google Account</span>
        <span class="status-badge ${isAuthed ? 'badge-green' : 'badge-red'}">${isAuthed ? '✓ Connected' : '✗ Not Connected'}</span>
      </div>
      <div class="status-row">
        <span class="status-label">AI Engine</span>
        <span class="status-badge badge-green">✓ Gemini Ready</span>
      </div>
      <div class="status-row">
        <span class="status-label">Plan</span>
        <span class="status-badge badge-yellow">Free</span>
      </div>
    </div>

    <div class="actions">
      <button class="action-btn" id="btn-open-sidebar">
        <span class="icon">💬</span>
        <span class="text">
          Open AI Sidebar
          <small>Chat with your spreadsheet</small>
        </span>
      </button>

      ${!isAuthed ? `
      <button class="action-btn" id="btn-auth">
        <span class="icon">🔐</span>
        <span class="text">
          Connect Google Account
          <small>Required to read/write sheet data</small>
        </span>
      </button>` : ''}

      <button class="action-btn" id="btn-analyze">
        <span class="icon">📊</span>
        <span class="text">
          Analyze Current Sheet
          <small>Get instant insights</small>
        </span>
      </button>

      <button class="action-btn" id="btn-formulas">
        <span class="icon">fx</span>
        <span class="text">
          Formula Helper
          <small>Get the right formula</small>
        </span>
      </button>
    </div>

    <div class="footer">
      <span class="plan-info">Plan: <span class="plan-name">Free</span></span>
      <button class="upgrade-btn">Upgrade to Pro →</button>
    </div>
  `;

  // Button handlers
  document.getElementById('btn-open-sidebar').addEventListener('click', async () => {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
    window.close();
  });

  document.getElementById('btn-analyze')?.addEventListener('click', async () => {
    await chrome.tabs.sendMessage(tab.id, { type: 'QUICK_ANALYZE' });
    window.close();
  });

  document.getElementById('btn-formulas')?.addEventListener('click', async () => {
    await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_FORMULA_MODE' });
    window.close();
  });

  document.getElementById('btn-auth')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
    window.close();
  });
}

init();
