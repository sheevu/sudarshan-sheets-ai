// ============================================
// GEMINI AI AGENT
// ============================================

export class GeminiAgent {
  constructor(config) {
    this.apiKey = config.GEMINI_API_KEY;
    this.model = config.GEMINI_MODEL;
    this.endpoint = config.GEMINI_ENDPOINT;
  }

  async generate(prompt) {
    const url = `${this.endpoint}/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text };
  }

  async chat(systemPrompt, history = [], userMessage) {
    const url = `${this.endpoint}/${this.model}:generateContent?key=${this.apiKey}`;

    const contents = [];

    // Add system as first user message (Gemini format)
    contents.push({
      role: 'user',
      parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUnderstood. I am Sudarshan Sheets AI, ready to help.` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I am Sudarshan Sheets AI. How can I help you with your spreadsheet today?' }]
    });

    // Add conversation history
    for (const msg of history.slice(-10)) { // last 10 messages for context
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const body = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Detect if response contains action instructions
    const actions = this.extractActions(text);
    return { text, actions };
  }

  extractActions(text) {
    const actions = [];
    // Detect formula suggestions
    const formulaMatch = text.match(/FORMULA:\s*(=.+)/i);
    if (formulaMatch) actions.push({ type: 'formula', value: formulaMatch[1] });
    // Detect action requests
    if (text.toLowerCase().includes('delete') || text.toLowerCase().includes('remove')) {
      actions.push({ type: 'destructive_warning' });
    }
    return actions;
  }
}
