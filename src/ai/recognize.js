// Faucet recognition: photo → { type, confidence, pin positions on THIS photo, note }
import { FAUCET_DEFS, stripOptional } from '../data/faucets.js';
import { callProvider, extractJson, AiError } from './providers.js';

export const MIN_CONFIDENCE = 0.6;

const PULL_HINT = 'a small push/pull diverter knob or button that sends water to the shower hose when pulled up (often on top of or just behind the spout, between the lever and the spout outlet). Only if clearly visible.';

// What the model should look for. Keep in sync with FAUCETS ids / pin ids.
const CATALOG = {
  lever: {
    cue: 'One mixer body with a SINGLE handle/lever on top or side. Lift for flow, swing left/right for temperature. Basin, kitchen, and wall-mounted bath/shower single-lever mixers (often with a shower hose).',
    pins: { h: 'the lever handle (its grip/top)', s: 'the spout outlet tip where water comes out' },
    optional: { pull: PULL_HINT },
  },
  two: {
    cue: 'TWO separate handles/knobs (hot and cold) that feed one spout, including cross-head taps and widespread sets. Also use for separate hot and cold taps.',
    pins: { hot: 'the HOT handle (usually left, red/H mark)', cold: 'the COLD handle (usually right, blue/C mark)', s: 'the spout outlet tip' },
    optional: { pull: PULL_HINT },
  },
  sensor: {
    cue: 'Touchless faucet with NO handle; a small dark sensor window on the body or base.',
    pins: { eye: 'the sensor window', s: 'the spout outlet tip' },
  },
  thermo: {
    cue: 'Horizontal wall shower bar mixer with a knob at EACH end: one for flow / shower-tap switch, one temperature dial with °C numbers and often a red safety button.',
    pins: { flow: 'the flow / switch handle', temp: 'the temperature dial', btn: 'the safety stop button on the temperature dial (often red)' },
  },
  diverter: {
    cue: 'Wall-mounted set with THREE handles in a row (hot, middle diverter, cold) plus a shower head above and a tub spout below.',
    pins: { hot: 'the HOT handle', div: 'the middle diverter handle', cold: 'the COLD handle', head: 'the shower head', tub: 'the tub spout' },
  },
};

const SYSTEM = `You identify faucets/taps in travellers' photos for a how-to app.
Classify the photo into exactly one catalog type, or "unknown" if none fits or no faucet is visible.
Then locate each listed part ON THIS PHOTO as x,y percentages of image width/height (0 = left/top, 100 = right/bottom), pointing at the centre of the part. Use null for parts you cannot see.
Reply with JSON only, no prose.`;

function buildPrompt(lang) {
  const types = Object.entries(CATALOG).map(([id, t]) =>
    `- "${id}": ${t.cue}\n  parts: ${Object.entries(t.pins).map(([p, d]) => `"${p}" = ${d}`).join('; ')}` +
    (t.optional ? `\n  optional parts (include only if present, else null): ${Object.entries(t.optional).map(([p, d]) => `"${p}" = ${d}`).join('; ')}` : '')).join('\n');
  return `Catalog:
${types}

Return:
{
  "type": "<catalog id or unknown>",
  "confidence": <0..1, how sure you are of the type>,
  "parts": { "<part id>": { "x": <0-100>, "y": <0-100> } | null },
  "note": "<optional, max 80 chars, in ${lang === 'ko' ? 'Korean' : 'English'}: anything unusual the user must know, e.g. hot/cold markings reversed, a push-button or pull-up diverter. Empty string if nothing.>"
}`;
}

// Downscale + re-encode so uploads are small and EXIF orientation is baked in.
export async function prepareImage(src, maxSide = 1280) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const dataUrl = c.toDataURL('image/jpeg', 0.85);
  return { dataUrl, base64: dataUrl.split(',')[1], ratio: w / h };
}

const clamp = (v) => Math.max(2, Math.min(98, v));

// Pick a label side that keeps the label on the photo.
function sideFor(x, fallback) {
  if (x > 62) return 'l';
  if (x < 38) return 'r';
  return fallback || 'r';
}

// Re-anchor each step's arrow to the pin it sat on in the reference photo.
function anchorOf(faucet, arrow) {
  let best = null, bd = Infinity;
  for (const p of faucet.pins) {
    if (p.optional) continue;
    const d = Math.hypot(p.x - arrow.x, p.y - arrow.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best ? { pin: best.id, dx: arrow.x - best.x, dy: arrow.y - best.y } : null;
}

// Build a guide that uses the user's photo with AI-located pins.
export function projectOnPhoto(faucet, photo, parts, confidence, note) {
  const pins = [];
  for (const p of faucet.pins) {
    const loc = parts?.[p.id];
    if (!loc || typeof loc.x !== 'number' || typeof loc.y !== 'number') continue;
    const x = clamp(loc.x), y = clamp(loc.y);
    pins.push({ ...p, x, y, side: p.side === 'b' ? 'b' : sideFor(x, p.side) });
  }
  const byId = Object.fromEntries(pins.map(p => [p.id, p]));
  const steps = faucet.steps.filter(s => !s.requires || s.requires.every(id => byId[id])).map(s => {
    if (!s.arrow) return s;
    const a = s.arrow.at ? { pin: s.arrow.at, dx: 0, dy: 0 } : anchorOf(faucet, s.arrow);
    const at = a && byId[a.pin];
    return { ...s, arrow: at ? { ...s.arrow, x: clamp(at.x + a.dx), y: clamp(at.y + a.dy) } : null };
  });
  return {
    ...faucet,
    img: photo.src, ratio: photo.ratio, pins, steps,
    match: Math.round(confidence * 100),
    note: note || '',
    onPhoto: pins.length > 0,
    ref: stripOptional(faucet),
  };
}

export async function recognize(cfg, photo, lang, signal) {
  const prep = await prepareImage(photo.src);
  const t0 = performance.now();
  const txt = await callProvider(cfg, { system: SYSTEM, text: buildPrompt(lang), image: prep.base64, signal });
  const ms = Math.round(performance.now() - t0);
  const j = extractJson(txt);
  const conf = Math.max(0, Math.min(1, Number(j.confidence) || 0));
  const faucet = FAUCET_DEFS.find(f => f.id === j.type);
  const run = { provider: cfg.provider, model: cfg.model, ms, type: j.type, confidence: conf, raw: j, at: Date.now() };
  if (!faucet || conf < MIN_CONFIDENCE) return { ok: false, run };
  const guide = projectOnPhoto(faucet, { src: prep.dataUrl, ratio: prep.ratio }, j.parts, conf, typeof j.note === 'string' ? j.note : '');
  return { ok: true, guide, run };
}

export async function testConnection(cfg) {
  const txt = await callProvider(cfg, { system: 'Reply with JSON only.', text: 'Return {"ok": true}', image: null });
  const j = extractJson(txt);
  if (!j.ok) throw new AiError('Unexpected reply', { kind: 'parse' });
  return true;
}

export { AiError };
