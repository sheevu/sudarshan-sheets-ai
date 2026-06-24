# Dual Platform Support — Google Sheets & MS Excel

To make the AI Copilot feasible for both **Google Sheets** and **Microsoft Excel**, the project is structured with a **Universal Data Model** and shared styling. The user can run:
- The **Chrome Extension** for Google Sheets.
- The **Office Add-in** for Microsoft Excel (Web, Desktop, and Mac).

Both options connect to your same secure **Cloudflare Worker** backend and share the same core AI brain.

---

## The Universal Connector Architecture

We have designed a parallel data layer. In the `connectors/` folder, you will find:
1. [google-sheets.js](file:///d:/CODEX2025-2026/sudarshan-sheets-ai/connectors/google-sheets.js) — Reads/writes data via Google REST APIs.
2. [excel-connector.js](file:///d:/CODEX2025-2026/sudarshan-sheets-ai/connectors/excel-connector.js) — Reads/writes data via Microsoft OfficeJS APIs.

Both connectors implement the **exact same interface**:

| Method | Google Sheets Implementation | MS Excel Implementation | Output Data Model |
| :--- | :--- | :--- | :--- |
| `readSheetData()` | Fetches via `fetch()` (OAuth) | Reads via `Excel.run()` (Native) | `{ workbookId, sheetName, totalRows, totalColumns, headers, rows, summary }` |
| `writeValues()` | Puts via `fetch(PUT)` | Writes via `range.values` | `Promise<boolean>` |
| `insertFormula()` | Puts `=FORMULA` to cell | Writes `=FORMULA` via `range.formulas` | `Promise<boolean>` |
| `appendRows()` | Appends via `fetch(POST)` | Appends to `sheet.getUsedRange()` | `Promise<boolean>` |
| `deleteRows()` | Batches `deleteDimension` | Deletes via `range.delete()` | `Promise<boolean>` |

This ensures that the main chat interface, system prompts, quick action chips, and formula builders do not need to change when switching between Sheets and Excel.

---

## Deploying for Microsoft Excel (User Choice)

If the user wishes to use the AI Copilot in Excel:

### Step 1 — Initialize the Excel Project
We use Microsoft's Office Yeoman generator to bootstrap the shell:
```bash
npm install -g yo generator-office
yo office
```
*Options to select:*
- **Project Type**: `Office Add-in Task Pane project`
- **Script Type**: `JavaScript`
- **Host Application**: `Excel`
- **Project Name**: `sudarshan-excel-ai`

### Step 2 — Copy the Shareable Assets
Move the unified assets from the `sudarshan-sheets-ai` workspace to the new `sudarshan-excel-ai` project:
1. Copy the styling from [sidebar.css](file:///d:/CODEX2025-2026/sudarshan-sheets-ai/sidebar.css) into the Excel project's `taskpane.css`.
2. Copy the connector [connectors/excel-connector.js](file:///d:/CODEX2025-2026/sudarshan-sheets-ai/connectors/excel-connector.js) into the Excel project.
3. Import the Excel Connector and the secure Worker proxy URL into the task pane logic to handle chats.

### Step 3 — Run Excel Locally
Launch your Excel Add-in:
```bash
npm start
```
Excel will open automatically, adding the ✨ **Sudarshan Sheets AI** icon to the Ribbon. Clicking it will load your identical dark-mode sidebar next to your Excel grids!
