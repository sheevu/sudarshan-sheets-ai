// ============================================
// AUTH HANDLER - ES Module for background.js
// ============================================
// This file handles Google OAuth via Chrome Identity API

export function handleGetAuthToken(sendResponse) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      sendResponse({ error: chrome.runtime.lastError?.message || 'Auth failed' });
      return;
    }
    // Save token
    chrome.storage.local.set({ auth_token: token });
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'AUTH_SUCCESS', token });
      }
    });
    sendResponse({ token });
  });
}

// Token refresh on expiry
export async function refreshToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(token);
    });
  });
}

// Remove cached token (force re-auth)
export async function clearToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}
