# Sudarshan Sheets AI — Chrome Extension
## Setup Guide for Gillu (No-Code Friendly)

---

## STEP 1 — Add Your Gemini API Key

1. Open `background.js`
2. Find line: `GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE'`
3. Replace with your actual key from: https://aistudio.google.com/app/apikey

Also open `.env` and paste your key there for reference.

---

## STEP 2 — Google Cloud Setup (Required for Sheet Read/Write)

### A. Create Google Cloud Project
1. Go to: https://console.cloud.google.com
2. Click "New Project" → Name it "Sudarshan Sheets AI"
3. Click "Create"

### B. Enable APIs
1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Google Sheets API**
   - **Google Drive API**

### C. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth Client ID"
3. Application type: **Chrome Extension**
4. Name: Sudarshan Sheets AI
5. Copy the **Client ID** (looks like: 1234567890-abc.apps.googleusercontent.com)

### D. Add Client ID to Extension
1. Open `manifest.json`
2. Find: `"client_id": "YOUR_GOOGLE_CLIENT_ID_HERE"`
3. Replace with your actual Client ID
4. Do the same in `.env` file

### E. Configure OAuth Consent Screen
1. Go to "OAuth consent screen"
2. User Type: External
3. App name: Sudarshan Sheets AI
4. Add your email
5. Scopes: Add `spreadsheets` and `drive.file`
6. Add your Gmail as test user

---

## STEP 3 — Load Extension in Chrome

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (toggle top right)
3. Click **"Load unpacked"**
4. Select the `sudarshan-sheets-ai` folder
5. Extension appears in toolbar!

---

## STEP 4 — Test It

1. Open any Google Sheet: https://sheets.google.com
2. Click the blue ✨ floating button (bottom right)
3. Click "Connect Google Account"
4. Grant permissions
5. Click the document icon to read your sheet
6. Start chatting!

---

## HOW TO USE

### Chat Examples (English)
- "Analyze this sheet and give me insights"
- "Create a VLOOKUP formula to match names"
- "Show me the top 5 values in column B"
- "Find duplicate rows"
- "What formula should I use to calculate average?"

### Chat Examples (Hindi/Hinglish)
- "Is sheet ka analysis karo"
- "Top 10 customers dikhao"
- "Revenue ka sum nikalo column C mein"
- "Duplicate rows hata do"
- "Sales report banao"

### Voice Commands
- Click the 🎤 microphone button
- Speak your command
- Works in English, Hindi, Hinglish

---

## FILE STRUCTURE

```
sudarshan-sheets-ai/
├── manifest.json          ← Extension config
├── background.js          ← AI brain (Gemini)
├── content.js             ← Sidebar UI logic
├── sidebar.css            ← Sidebar styling
├── popup.html             ← Toolbar popup
├── popup.js               ← Popup logic
├── auth.js                ← Google OAuth
├── .env                   ← Your API keys (reference)
├── agents/
│   └── gemini-agent.js    ← Gemini API wrapper
├── connectors/
│   └── google-sheets.js   ← Sheets read/write
├── memory/
│   └── memory-manager.js  ← 3-layer memory
└── icons/                 ← Extension icons
```

---

## TROUBLESHOOTING

**"Cannot read sheet" error**
→ Make sure you clicked "Connect Google Account" first

**"Gemini API error"**
→ Check your API key in background.js
→ Make sure key is active at aistudio.google.com

**Floating button not showing**
→ Refresh the Google Sheets page
→ Check extension is enabled in chrome://extensions

**Auth not working**
→ Add your Gmail as test user in Google Cloud Console
→ Make sure Client ID is correct in manifest.json

---

## UPCOMING (Build 2)
- Cloudflare Worker backend (API key security)
- Team collaboration
- Workflow automation
- Pro plan billing

---

Built by Sudarshan AI Labs | Lucknow, India 🇮🇳
