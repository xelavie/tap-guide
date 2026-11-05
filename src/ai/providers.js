// Direct browser calls to each AI provider with the user's own key (BYOK).
// No app server: requests go straight from the phone to the provider.

export const PROVIDERS = {
  anthropic: {
    label: 'Claude',
    company: 'Anthropic',
    defaultModel: 'claude-sonnet-5-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
  },
  gemini: {
    label: 'Gemini',
    company: 'Google',
    defaultModel: 'gemini-3.6-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AIza',
  },
  openai: {
    label: 'ChatGPT',
    company: 'OpenAI',
    defaultModel: 'gpt-5.5',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
  },
};

export class AiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.status = status;
    this.kind = kind || (status === 401 || status === 403 ? 'auth' : status === 429 ? 'quota' : 'api');
  }
}

async function postJson(url, headers, body, signal) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new AiError('Network error — check your connection.', { kind: 'network' });
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* non-JSON */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new AiError(msg, { status: res.status });
  }
  return json;
}

async function callAnthropic({ key, model, system, text, image, signal }) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } });
  content.push({ type: 'text', text });
  const j = await postJson('https://api.anthropic.com/v1/messages', {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }, { model, max_tokens: 1200, system, messages: [{ role: 'user', content }] }, signal);
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
}

async function callGemini({ key, model, system, text, image, signal }) {
  const parts = [];
  if (image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
  parts.push({ text });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const j = await postJson(url, { 'x-goog-api-key': key }, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json' },
  }, signal);
  const out = j.candidates?.[0]?.content?.parts || [];
  return out.filter(p => !p.thought && p.text).map(p => p.text).join('');
}

async function callOpenAI({ key, model, system, text, image, signal }) {
  const content = [{ type: 'text', text }];
  if (image) content.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + image } });
  const j = await postJson('https://api.openai.com/v1/chat/completions', { authorization: 'Bearer ' + key }, {
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content }],
    response_format: { type: 'json_object' },
  }, signal);
  return j.choices?.[0]?.message?.content || '';
}

const CALLERS = { anthropic: callAnthropic, gemini: callGemini, openai: callOpenAI };

export async function callProvider(cfg, args) {
  const fn = CALLERS[cfg.provider];
  if (!fn) throw new AiError('Unknown AI provider', { kind: 'config' });
  if (!cfg.key) throw new AiError('No API key', { kind: 'nokey' });
  return fn({ key: cfg.key.trim(), model: (cfg.model || PROVIDERS[cfg.provider].defaultModel).trim(), ...args });
}

// Pull the first JSON object out of a model reply (tolerates code fences / chatter).
export function extractJson(txt) {
  if (!txt) throw new AiError('Empty response from AI', { kind: 'parse' });
  const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
  if (s < 0 || e <= s) throw new AiError('AI did not return JSON', { kind: 'parse' });
  try { return JSON.parse(txt.slice(s, e + 1)); }
  catch (err) { throw new AiError('Could not read AI response', { kind: 'parse' }); }
}
