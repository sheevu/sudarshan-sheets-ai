# Gemini API Secure Proxy — Cloudflare Worker

This directory contains the code to deploy a secure backend proxy to Cloudflare Workers. 

The proxy intercepts requests from the Chrome Extension, injects your Gemini API Key securely on the server side, and forwards the request to Google's AI endpoints. This prevents users from extracting your API key from the Chrome Extension client.

## Files

- `index.js`: The worker script that handles request validation, CORS, and endpoint redirection.
- `wrangler.json`: Worker configuration file.

## Deployment Guide

### STEP 1 — Install Wrangler
Ensure you have Node.js installed, then install the Cloudflare Wrangler CLI:
```bash
npm install -g wrangler
```

### STEP 2 — Log in to Cloudflare
Authenticate wrangler with your Cloudflare Account:
```bash
npx wrangler login
```

### STEP 3 — Deploy the Worker
Navigate into this directory and run the deploy command:
```bash
npx wrangler deploy
```
Once deployed, Cloudflare will display your Worker URL, for example:
`https://sudarshan-sheets-ai-proxy.your-subdomain.workers.dev`

### STEP 4 — Set the Gemini API Key Secret
Add your active Gemini API key to the worker's secure environment variables:
```bash
npx wrangler secret put GEMINI_API_KEY
```
*When prompted, paste your API key (looks like `AIzaSy...`).*

---

## Configuring the Extension

Once your worker is deployed:
1. Open `background.js` in the extension root.
2. Update the `CONFIG` block:
   - Set `GEMINI_ENDPOINT` to your worker's base endpoint path:
     `"https://sudarshan-sheets-ai-proxy.your-subdomain.workers.dev/v1beta/models"`
   - Clear the `GEMINI_API_KEY` value (set it to `""` or `"SECURED_BY_WORKER"`), as it is no longer needed on the client.
3. Re-load the extension unpacked in Chrome (or rebuild the ZIP file).
