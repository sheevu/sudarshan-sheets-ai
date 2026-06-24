// ============================================
// MEMORY MANAGER - 3 Layer System
// ============================================

export class MemoryManager {
  constructor() {
    this.sessionKey = 'session_history';
  }

  // ── Save any key ─────────────────────────────
  async save(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  // ── Get any key ──────────────────────────────
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }

  // ── Session Memory ───────────────────────────
  async appendSession(message) {
    const history = await this.get(this.sessionKey) || [];
    history.push({ ...message, timestamp: Date.now() });
    // Keep last 20 messages
    const trimmed = history.slice(-20);
    await this.save(this.sessionKey, trimmed);
  }

  async getSession() {
    return await this.get(this.sessionKey) || [];
  }

  async clearSession() {
    await this.save(this.sessionKey, []);
    return { cleared: true };
  }

  // ── User Memory ──────────────────────────────
  async saveUserProfile(profile) {
    const existing = await this.get('user_profile') || {};
    await this.save('user_profile', { ...existing, ...profile, updated: Date.now() });
  }

  async learnLanguage(lang) {
    await this.saveUserProfile({ language_preference: lang });
  }

  async trackCommand(command) {
    const commands = await this.get('frequent_commands') || {};
    commands[command] = (commands[command] || 0) + 1;
    await this.save('frequent_commands', commands);
  }

  // ── Workbook Memory ──────────────────────────
  async saveWorkbookContext(sheetId, context) {
    const key = `workbook_${sheetId}`;
    const existing = await this.get(key) || {};
    await this.save(key, {
      ...existing,
      ...context,
      lastAccessed: Date.now()
    });
  }

  async getWorkbookContext(sheetId) {
    return await this.get(`workbook_${sheetId}`) || {};
  }

  async saveColumnMeaning(sheetId, column, meaning) {
    const context = await this.getWorkbookContext(sheetId);
    const columns = context.columnMeanings || {};
    columns[column] = meaning;
    await this.saveWorkbookContext(sheetId, { columnMeanings: columns });
  }
}
