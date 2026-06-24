// ============================================
// SUDARSHAN SHEETS AI - Background Service Worker
// ============================================

import { GeminiAgent } from './agents/gemini-agent.js';
import { MemoryManager } from './memory/memory-manager.js';
import { handleGetAuthToken } from './auth.js';

const CONFIG = {
  GEMINI_API_KEY: '', // Secured on Cloudflare Worker
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_ENDPOINT: 'https://sudarshan-sheets-ai-proxy.sheevum-goel.workers.dev/v1beta/models',
};

const memory = new MemoryManager();
const gemini = new GeminiAgent(CONFIG);

// ── Message Router ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    handleGetAuthToken(sendResponse);
    return true; // keep channel open for async
  }

  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // keep channel open for async
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'CHAT':
      return await handleChat(message);
    case 'ANALYZE_SHEET':
      return await handleAnalyzeSheet(message);
    case 'EXECUTE_ACTION':
      return await handleExecuteAction(message);
    case 'GET_FORMULA':
      return await handleGetFormula(message);
    case 'VOICE_INPUT':
      return await handleVoiceInput(message);
    case 'SAVE_MEMORY':
      return await memory.save(message.key, message.value);
    case 'GET_MEMORY':
      return await memory.get(message.key);
    case 'CLEAR_SESSION':
      return await memory.clearSession();
    default:
      return { error: 'Unknown message type' };
  }
}

// ── Chat Handler ─────────────────────────────────────────────
async function handleChat({ userMessage, sheetContext, sessionHistory }) {
  const userMem = await memory.get('user_profile') || {};
  const workbookMem = await memory.get('workbook_memory') || {};

  const systemPrompt = buildSystemPrompt(userMem, workbookMem, sheetContext);
  const response = await gemini.chat(systemPrompt, sessionHistory, userMessage);

  // Save to session memory
  await memory.appendSession({ role: 'user', content: userMessage });
  await memory.appendSession({ role: 'assistant', content: response.text });

  return { text: response.text, actions: response.actions };
}

// ── Sheet Analysis Handler ────────────────────────────────────
async function handleAnalyzeSheet({ sheetData }) {
  const prompt = `
You are a data analyst. Analyze this spreadsheet data and provide:
1. Summary of what the data contains
2. Key insights (top 3)
3. Data quality issues if any
4. Recommended actions

Sheet Data:
${JSON.stringify(sheetData, null, 2)}

Respond in a clear, structured format. If the user seems to be Indian business context, use relevant terminology.
`;
  const response = await gemini.generate(prompt);
  return { analysis: response.text };
}

// ── Formula Handler ───────────────────────────────────────────
async function handleGetFormula({ request, sheetContext }) {
  const formulaKnowledge = getFormulaKnowledge();
  const prompt = `
You are an expert Google Sheets & Excel formula engineer with deep knowledge of all formulas.

FORMULA KNOWLEDGE BASE:
${formulaKnowledge}

SHEET CONTEXT:
${JSON.stringify(sheetContext, null, 2)}

USER REQUEST: ${request}

Provide:
1. The exact formula to use
2. Where to place it (cell reference)
3. Brief explanation in simple terms
4. Alternative formula if applicable

Format: 
FORMULA: =YOUR_FORMULA_HERE
PLACE IN: Cell reference
EXPLANATION: Simple explanation
`;
  const response = await gemini.generate(prompt);
  return { formula: response.text };
}

// ── Action Handler ────────────────────────────────────────────
async function handleExecuteAction({ action, sheetContext }) {
  const prompt = `
You are an action planner for Google Sheets automation.

ACTION REQUESTED: ${action}
SHEET CONTEXT: ${JSON.stringify(sheetContext, null, 2)}

Respond with a JSON action plan:
{
  "intent": "what the user wants",
  "risk_level": "low|medium|high",
  "requires_confirmation": true/false,
  "steps": [
    { "type": "writeValues|insertFormula|formatRange|deleteRows|sortData|filterData|createChart", "params": {} }
  ],
  "explanation": "what will happen in simple terms"
}
`;
  const response = await gemini.generate(prompt);
  try {
    const cleaned = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return { plan: JSON.parse(cleaned) };
  } catch {
    return { plan: null, raw: response.text };
  }
}

// ── Voice Input Handler ───────────────────────────────────────
async function handleVoiceInput({ transcript, sheetContext }) {
  const prompt = `
You are a multilingual AI assistant for Google Sheets. 
The user spoke in English/Hindi/Hinglish: "${transcript}"

Translate their intent into a clear action. Examples:
- "Top customers dikhao" → Show top customers by value
- "Revenue trend batao" → Analyze revenue trend  
- "Duplicate rows hata do" → Remove duplicate rows
- "Sales report banao" → Generate sales report

SHEET CONTEXT: ${JSON.stringify(sheetContext, null, 2)}

Respond with:
{
  "understood": "what you understood in English",
  "action_type": "analyze|formula|action|report|chart",
  "response": "friendly response in same language as input",
  "execute": true/false
}
`;
  const response = await gemini.generate(prompt);
  try {
    const cleaned = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { understood: transcript, response: response.text, execute: false };
  }
}

// ── System Prompt Builder ─────────────────────────────────────
function buildSystemPrompt(userMem, workbookMem, sheetContext) {
  return `You are Sudarshan Sheets AI — an intelligent AI copilot embedded inside Google Sheets.

YOUR IDENTITY:
- You are a helpful, expert spreadsheet assistant
- You understand English, Hindi, and Hinglish naturally
- You respond in the same language the user writes in
- You are friendly, concise, and action-oriented

USER PROFILE:
${JSON.stringify(userMem, null, 2)}

WORKBOOK KNOWLEDGE:
${JSON.stringify(workbookMem, null, 2)}

CURRENT SHEET CONTEXT:
${sheetContext ? JSON.stringify(sheetContext, null, 2) : 'No sheet data loaded yet'}

YOUR CAPABILITIES:
1. Analyze spreadsheet data
2. Generate formulas (all Excel/Sheets formulas)
3. Create charts and reports
4. Clean and transform data
5. Automate repetitive tasks
6. Answer questions about the data

FORMULA EXPERTISE: You know ALL Google Sheets and Excel formulas including:
LOOKUP: VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP, XMATCH
MATH: SUM, SUMIF, SUMIFS, SUMPRODUCT, AGGREGATE
TEXT: CONCATENATE, LEFT, RIGHT, MID, TRIM, UPPER, LOWER, SUBSTITUTE, REGEXEXTRACT
DATE: TODAY, NOW, DATEDIF, NETWORKDAYS, EDATE, EOMONTH
LOGICAL: IF, IFS, AND, OR, NOT, IFERROR, IFNA, SWITCH
STATISTICAL: AVERAGE, AVERAGEIF, COUNTIF, COUNTIFS, STDEV, MEDIAN, MODE
ARRAY: ARRAYFORMULA, FILTER, SORT, UNIQUE, QUERY
FINANCIAL: NPV, IRR, PMT, FV, PV, RATE
DATABASE: DSUM, DCOUNT, DAVERAGE, DMAX, DMIN

RULES:
- Never directly modify the sheet without user confirmation for destructive actions
- Always explain what you're going to do before doing it
- For delete/replace operations, always ask confirmation
- Keep responses concise and actionable
- If user writes in Hindi/Hinglish, respond in Hinglish`;
}

// ── Formula Knowledge Base ────────────────────────────────────
function getFormulaKnowledge() {
  return `
=== COMPLETE FORMULA REFERENCE ===

LOOKUP & REFERENCE:
- VLOOKUP(search_key, range, index, [sorted]) — vertical lookup
- HLOOKUP(search_key, range, index, [sorted]) — horizontal lookup  
- INDEX(reference, row, [col]) — return value at position
- MATCH(search_key, range, [type]) — find position of value
- XLOOKUP(search, lookup_range, return_range, [not_found], [match_mode]) — modern lookup
- XMATCH(search, range, [match_mode], [search_mode]) — modern match
- OFFSET(cell, rows, cols, [height], [width]) — dynamic range
- INDIRECT(ref_text) — reference from text string
- CHOOSE(index, val1, val2...) — choose from list

MATH & AGGREGATION:
- SUM(range) — total
- SUMIF(range, criteria, [sum_range]) — conditional sum
- SUMIFS(sum_range, range1, criteria1, ...) — multi-condition sum
- SUMPRODUCT(array1, array2...) — multiply then sum
- AGGREGATE(function_num, options, ref) — flexible aggregation
- SUBTOTAL(function_num, range) — subtotal ignoring hidden
- ROUND(value, places) / ROUNDUP / ROUNDDOWN
- MOD(dividend, divisor) — remainder
- INT(value) / TRUNC(value, digits)
- ABS(value) / SQRT(value) / POWER(base, exp)
- CEILING(value, factor) / FLOOR(value, factor)
- RAND() / RANDBETWEEN(low, high)
- PRODUCT(range) — multiply all values

TEXT FUNCTIONS:
- CONCATENATE(text1, text2...) or & operator
- TEXTJOIN(delimiter, ignore_empty, text1...) — join with separator
- LEFT(text, num_chars) / RIGHT(text, num_chars)
- MID(text, start, num_chars) — extract middle
- LEN(text) — length of string
- FIND(find_text, within_text, [start]) — position (case-sensitive)
- SEARCH(find_text, within_text, [start]) — position (not case-sensitive)
- SUBSTITUTE(text, old, new, [instance]) — replace text
- REPLACE(text, start, num_chars, new_text)
- TRIM(text) — remove extra spaces
- CLEAN(text) — remove non-printable chars
- UPPER/LOWER/PROPER(text) — case conversion
- TEXT(value, format) — format number as text
- VALUE(text) — convert text to number
- SPLIT(text, delimiter) — split into columns
- REGEXEXTRACT(text, pattern) — extract with regex
- REGEXMATCH(text, pattern) — test with regex
- REGEXREPLACE(text, pattern, replacement)

DATE & TIME:
- TODAY() / NOW() — current date/datetime
- DATE(year, month, day) — create date
- YEAR/MONTH/DAY(date) — extract parts
- HOUR/MINUTE/SECOND(time)
- WEEKDAY(date, [type]) — day of week number
- WEEKNUM(date, [type]) — week number
- DATEDIF(start, end, unit) — date difference (Y/M/D/YM/MD/YD)
- NETWORKDAYS(start, end, [holidays]) — working days
- WORKDAY(start, days, [holidays]) — add working days
- EDATE(start, months) — add months
- EOMONTH(start, months) — end of month
- DATEVALUE(date_text) — text to date
- TIMEVALUE(time_text) — text to time

LOGICAL:
- IF(condition, true_val, false_val)
- IFS(cond1, val1, cond2, val2...) — multiple conditions
- AND(cond1, cond2...) / OR(cond1, cond2...) / NOT(condition)
- IFERROR(value, error_val) — handle errors
- IFNA(value, na_val) — handle #N/A
- SWITCH(expr, case1, val1, ..., [default]) — switch statement
- XOR(logical1, logical2...) — exclusive or

STATISTICAL:
- AVERAGE(range) / AVERAGEIF / AVERAGEIFS
- COUNT(range) / COUNTA / COUNTBLANK
- COUNTIF(range, criteria) / COUNTIFS
- MAX/MIN(range) / MAXIFS / MINIFS
- LARGE(range, k) / SMALL(range, k) — nth largest/smallest
- MEDIAN(range) — middle value
- MODE(range) / MODE.MULT — most frequent
- STDEV(range) / STDEVP / STDEVS
- VAR(range) / VARP — variance
- PERCENTILE(range, percentile) / QUARTILE
- RANK(value, range, [order]) — rank in list
- CORREL(range1, range2) — correlation
- FORECAST(x, known_y, known_x) — predict value
- GROWTH/TREND — exponential/linear trends
- FREQUENCY(data, bins) — frequency distribution

ARRAY & DYNAMIC:
- ARRAYFORMULA(formula) — apply to entire range
- FILTER(range, condition) — filter rows
- SORT(range, col, order) — sort array
- SORTBY(range, by_range, order) — sort by another range
- UNIQUE(range) — remove duplicates
- SEQUENCE(rows, cols, start, step) — number sequence
- TRANSPOSE(range) — flip rows/cols
- FLATTEN(range) — flatten to single column
- TOCOL/TOROW(range) — convert to col/row
- VSTACK/HSTACK(range1, range2) — stack arrays

QUERY (Google Sheets specific):
- QUERY(data, query_string, [headers])
  Examples:
  =QUERY(A:D,"SELECT A,B,C WHERE D>100 ORDER BY B DESC LIMIT 10")
  =QUERY(A:D,"SELECT A, SUM(B) GROUP BY A")

FINANCIAL:
- PMT(rate, nper, pv, [fv], [type]) — loan payment
- FV(rate, nper, pmt, [pv], [type]) — future value
- PV(rate, nper, pmt, [fv], [type]) — present value
- NPV(rate, value1, value2...) — net present value
- IRR(values, [guess]) — internal rate of return
- RATE(nper, pmt, pv) — interest rate
- NPER(rate, pmt, pv) — number of periods

DATABASE:
- DSUM(database, field, criteria) — conditional sum
- DCOUNT/DCOUNTA — conditional count
- DAVERAGE — conditional average
- DMAX/DMIN — conditional max/min
- DGET — extract single matching value

INFORMATION:
- ISBLANK/ISERROR/ISNA/ISNUMBER/ISTEXT(value)
- TYPE(value) — returns type number
- CELL(info_type, reference) — cell info
- N(value) — convert to number
- NA() — return #N/A error
- ERROR.TYPE(error) — error type number
`;
}
