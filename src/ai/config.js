// AI settings live only in this browser's localStorage.
import { PROVIDERS } from './providers.js';

const KEY = 'tg_ai';

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

export function loadAiConfig() {
  try {
    const c = JSON.parse(safeGet(KEY) || '{}');
    return { provider: PROVIDERS[c.provider] ? c.provider : 'gemini', keys: c.keys || {}, models: c.models || {} };
  } catch (e) {
    return { provider: 'gemini', keys: {}, models: {} };
  }
}

export function saveAiConfig(c) { safeSet(KEY, JSON.stringify(c)); }

// The settings actually used for a call
export function activeAi(c = loadAiConfig()) {
  const key = c.keys[c.provider] || '';
  return key ? { provider: c.provider, key, model: c.models[c.provider] || '' } : null;
}
