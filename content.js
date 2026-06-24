// ============================================
// CONTENT SCRIPT - Injected into Google Sheets
// ============================================

const connector = new window.GoogleSheetsConnector();
let sidebarOpen = false;
let sidebarEl = null;
let floatBtn = null;
let authToken = null;
let sessionHistory = [];

// ── Initialize ────────────────────────────────
function init() {
  injectFloatingButton();
  injectSidebar();
  loadAuthToken();
}

// ── Auth Token ────────────────────────────────
function loadAuthToken() {
  chrome.storage.local.get(['auth_token'], (result) => {
    if (result.auth_token) authToken = result.auth_token;
  });
}

// ── Floating Button ───────────────────────────
function injectFloatingButton() {
  floatBtn = document.createElement('div');
  floatBtn.id = 'sudarshan-float-btn';
  floatBtn.innerHTML = `
    <div class="ss-float-inner">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="ss-float-pulse"></span>
    </div>
  `;
  floatBtn.title = 'Sudarshan Sheets AI';
  floatBtn.addEventListener('click', toggleSidebar);
  document.body.appendChild(floatBtn);
}

// ── Sidebar HTML ──────────────────────────────
function injectSidebar() {
  sidebarEl = document.createElement('div');
  sidebarEl.id = 'sudarshan-sidebar';
  sidebarEl.innerHTML = getSidebarHTML();
  document.body.appendChild(sidebarEl);
  bindSidebarEvents();
}

function getSidebarHTML() {
  return `
    <div class="ss-sidebar-inner">
      <!-- Header -->
      <div class="ss-header">
        <div class="ss-header-left">
          <div class="ss-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="ss-title-block">
            <span class="ss-title">Sudarshan Sheets AI</span>
            <span class="ss-subtitle" id="ss-sheet-name">Loading...</span>
          </div>
        </div>
        <div class="ss-header-right">
          <button class="ss-icon-btn" id="ss-context-btn" title="Read Sheet">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </button>
          <button class="ss-icon-btn" id="ss-clear-btn" title="Clear Chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
          <button class="ss-icon-btn" id="ss-close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Sheet Context Bar -->
      <div class="ss-context-bar" id="ss-context-bar" style="display:none">
        <div class="ss-context-info">
          <span id="ss-row-count">— rows</span>
          <span>·</span>
          <span id="ss-col-count">— cols</span>
          <span>·</span>
          <span id="ss-sheet-title">—</span>
        </div>
        <button class="ss-refresh-btn" id="ss-refresh-btn">↻ Refresh</button>
      </div>

      <!-- Auth Banner -->
      <div class="ss-auth-banner" id="ss-auth-banner">
        <div class="ss-auth-icon">🔐</div>
        <p>Connect Google Sheets to read your data</p>
        <button class="ss-auth-btn" id="ss-auth-btn">Connect Google Account</button>
      </div>

      <!-- Quick Actions -->
      <div class="ss-quick-actions" id="ss-quick-actions">
        <button class="ss-chip" data-prompt="Analyze this sheet and give me key insights">📊 Analyze</button>
        <button class="ss-chip" data-prompt="Find and show me duplicate rows">🔍 Duplicates</button>
        <button class="ss-chip" data-prompt="What formulas should I use for this data?">fx Formula</button>
        <button class="ss-chip" data-prompt="Create a summary report of this sheet">📋 Report</button>
        <button class="ss-chip" data-prompt="Clean this data — fix formatting and remove blanks">🧹 Clean Data</button>
        <button class="ss-chip" data-prompt="Suggest a chart for this data">📈 Chart</button>
      </div>

      <!-- Chat Messages -->
      <div class="ss-messages" id="ss-messages">
        <div class="ss-welcome">
          <div class="ss-welcome-icon">✨</div>
          <h3>Namaste! Main hoon Sudarshan Sheets AI</h3>
          <p>Ask me anything about your spreadsheet in English, Hindi, or Hinglish.</p>
          <p class="ss-examples">
            <em>"Top 10 customers dikhao"</em><br>
            <em>"Revenue ka trend kya hai?"</em><br>
            <em>"Create a SUMIF formula for column B"</em>
          </p>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div class="ss-typing" id="ss-typing" style="display:none">
        <span></span><span></span><span></span>
        <small>Sudarshan is thinking...</small>
      </div>

      <!-- Action Confirmation -->
      <div class="ss-confirm-bar" id="ss-confirm-bar" style="display:none">
        <div class="ss-confirm-text" id="ss-confirm-text"></div>
        <div class="ss-confirm-btns">
          <button class="ss-btn-danger" id="ss-confirm-yes">✓ Execute</button>
          <button class="ss-btn-ghost" id="ss-confirm-no">✗ Cancel</button>
        </div>
      </div>

      <!-- Input Area -->
      <div class="ss-input-area">
        <div class="ss-input-row">
          <button class="ss-voice-btn" id="ss-voice-btn" title="Voice command">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
          <textarea 
            id="ss-input" 
            class="ss-textarea" 
            placeholder="Ask about your sheet... (English/Hindi/Hinglish)" 
            rows="1"
          ></textarea>
          <button class="ss-send-btn" id="ss-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="ss-input-hint">
          <span id="ss-lang-indicator">🌐 Auto-detect language</span>
          <span class="ss-plan-badge">Free Plan</span>
        </div>
      </div>
    </div>
  `;
}

// ── Sidebar Events ────────────────────────────
function bindSidebarEvents() {
  // Close
  document.getElementById('ss-close-btn').addEventListener('click', closeSidebar);

  // Clear chat
  document.getElementById('ss-clear-btn').addEventListener('click', clearChat);

  // Auth
  document.getElementById('ss-auth-btn').addEventListener('click', handleAuth);

  // Read sheet context
  document.getElementById('ss-context-btn').addEventListener('click', loadSheetContext);
  document.getElementById('ss-refresh-btn')?.addEventListener('click', loadSheetContext);

  // Send message
  document.getElementById('ss-send-btn').addEventListener('click', sendMessage);

  // Enter to send
  document.getElementById('ss-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  document.getElementById('ss-input').addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  });

  // Quick action chips
  document.querySelectorAll('.ss-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('ss-input').value = chip.dataset.prompt;
      sendMessage();
    });
  });

  // Voice
  document.getElementById('ss-voice-btn').addEventListener('click', startVoice);

  // Update sheet name
  updateSheetName();
}

// ── Toggle Sidebar ────────────────────────────
function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}

function openSidebar() {
  sidebarEl.classList.add('open');
  floatBtn.classList.add('active');
  sidebarOpen = true;
  updateSheetName();
  // Auto-load context if token exists
  if (authToken) {
    setTimeout(loadSheetContext, 500);
  }
}

function closeSidebar() {
  sidebarEl.classList.remove('open');
  floatBtn.classList.remove('active');
  sidebarOpen = false;
}

function updateSheetName() {
  const name = connector.getActiveSheetName();
  const el = document.getElementById('ss-sheet-name');
  if (el) el.textContent = name;
}

// ── Google Auth ───────────────────────────────
function handleAuth() {
  chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (response) => {
    if (response?.token) {
      authToken = response.token;
      chrome.storage.local.set({ auth_token: authToken });
      document.getElementById('ss-auth-banner').style.display = 'none';
      addMessage('assistant', '✅ Google Sheets connected! I can now read your spreadsheet data. Click the document icon to load your sheet.');
      loadSheetContext();
    } else {
      addMessage('assistant', '❌ Authentication failed. Please try again.');
    }
  });
}

// ── Load Sheet Context ────────────────────────
let currentSheetContext = null;

async function loadSheetContext() {
  if (!authToken) {
    showStatus('Please connect Google account first');
    return;
  }

  showStatus('Reading sheet...');
  try {
    currentSheetContext = await connector.readSheetData(authToken);
    showContextBar(currentSheetContext);
    showStatus('');
    addMessage('assistant', `📊 Sheet loaded! I can see **${currentSheetContext.totalRows} rows** and **${currentSheetContext.totalColumns} columns**.\n\nColumns: ${currentSheetContext.headers.map(h => h.label).join(', ')}\n\nWhat would you like to know?`);
  } catch (err) {
    showStatus('');
    if (err.message.includes('401') || err.message.includes('auth')) {
      authToken = null;
      document.getElementById('ss-auth-banner').style.display = 'flex';
      addMessage('assistant', '🔐 Session expired. Please reconnect your Google account.');
    } else {
      addMessage('assistant', `⚠️ Could not read sheet: ${err.message}`);
    }
  }
}

function showContextBar(context) {
  const bar = document.getElementById('ss-context-bar');
  bar.style.display = 'flex';
  document.getElementById('ss-row-count').textContent = `${context.totalRows} rows`;
  document.getElementById('ss-col-count').textContent = `${context.totalColumns} cols`;
  document.getElementById('ss-sheet-title').textContent = context.sheetName;
}

// ── Send Message ──────────────────────────────
async function sendMessage() {
  const input = document.getElementById('ss-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);
  showTyping(true);

  // Hide quick actions after first message
  document.getElementById('ss-quick-actions').style.display = 'none';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHAT',
      userMessage: text,
      sheetContext: currentSheetContext,
      sessionHistory
    });

    showTyping(false);

    if (response.error) {
      addMessage('assistant', `❌ Error: ${response.error}`);
      return;
    }

    addMessage('assistant', response.text);
    sessionHistory.push({ role: 'user', content: text });
    sessionHistory.push({ role: 'assistant', content: response.text });

    // Handle actions
    if (response.actions?.length > 0) {
      response.actions.forEach(action => {
        if (action.type === 'formula') {
          showFormulaAction(action.value);
        }
      });
    }

  } catch (err) {
    showTyping(false);
    addMessage('assistant', `❌ Could not connect to AI. Check your API key in background.js`);
  }
}

// ── Add Message to Chat ───────────────────────
function addMessage(role, text) {
  const messages = document.getElementById('ss-messages');

  // Remove welcome screen on first real message
  const welcome = messages.querySelector('.ss-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `ss-msg ss-msg-${role}`;

  const formatted = formatMessage(text);
  div.innerHTML = `
    <div class="ss-msg-bubble">
      ${role === 'assistant' ? '<span class="ss-msg-icon">✨</span>' : ''}
      <div class="ss-msg-content">${formatted}</div>
    </div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/(=\w+\([^)]*\))/g, '<code class="ss-formula">$1</code>');
}

// ── Formula Action Bar ────────────────────────
function showFormulaAction(formula) {
  const bar = document.getElementById('ss-confirm-bar');
  document.getElementById('ss-confirm-text').innerHTML = `
    <strong>Formula Ready:</strong> <code>${formula}</code><br>
    <small>Enter target cell (e.g., D2):</small>
    <input type="text" id="ss-cell-target" placeholder="D2" class="ss-cell-input">
  `;
  bar.style.display = 'flex';

  document.getElementById('ss-confirm-yes').onclick = async () => {
    const cell = document.getElementById('ss-cell-target')?.value || 'A1';
    if (!authToken) {
      addMessage('assistant', '🔐 Please connect Google account to write formulas');
      bar.style.display = 'none';
      return;
    }
    try {
      await connector.insertFormula(authToken, cell, formula);
      addMessage('assistant', `✅ Formula inserted in ${cell}!`);
    } catch (e) {
      addMessage('assistant', `❌ Could not insert formula: ${e.message}`);
    }
    bar.style.display = 'none';
  };

  document.getElementById('ss-confirm-no').onclick = () => {
    bar.style.display = 'none';
  };
}

// ── Voice Input ───────────────────────────────
let recognition = null;

function startVoice() {
  const btn = document.getElementById('ss-voice-btn');

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    addMessage('assistant', '🎤 Voice not supported in this browser. Use Chrome for voice commands.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'hi-IN'; // Hindi + English support

  btn.classList.add('recording');
  btn.title = 'Listening...';

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    btn.classList.remove('recording');
    btn.title = 'Voice command';

    addMessage('user', `🎤 ${transcript}`);
    showTyping(true);

    const response = await chrome.runtime.sendMessage({
      type: 'VOICE_INPUT',
      transcript,
      sheetContext: currentSheetContext
    });

    showTyping(false);
    if (response?.response) {
      addMessage('assistant', response.response);
    }
  };

  recognition.onerror = () => {
    btn.classList.remove('recording');
    btn.title = 'Voice command';
    addMessage('assistant', '🎤 Could not hear clearly. Please try again.');
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    btn.title = 'Voice command';
  };

  recognition.start();
}

// ── UI Helpers ────────────────────────────────
function showTyping(show) {
  document.getElementById('ss-typing').style.display = show ? 'flex' : 'none';
  if (show) {
    document.getElementById('ss-messages').scrollTop = document.getElementById('ss-messages').scrollHeight;
  }
}

function showStatus(msg) {
  const subtitle = document.getElementById('ss-sheet-name');
  if (subtitle) subtitle.textContent = msg || connector.getActiveSheetName();
}

function clearChat() {
  const messages = document.getElementById('ss-messages');
  messages.innerHTML = `
    <div class="ss-welcome">
      <div class="ss-welcome-icon">✨</div>
      <h3>Chat cleared!</h3>
      <p>Start a new conversation about your spreadsheet.</p>
    </div>
  `;
  document.getElementById('ss-quick-actions').style.display = 'flex';
  sessionHistory = [];
  chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' });
}

// ── Start ─────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle auth message from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'AUTH_SUCCESS') {
    authToken = message.token;
    document.getElementById('ss-auth-banner').style.display = 'none';
  }
});
