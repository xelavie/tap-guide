// Faucet recognition: photo → { type, confidence, pin positions on THIS photo, note }
import { FAUCET_DEFS, stripOptional } from '../data/faucets.js';
import { callProvider, extractJson, AiError } from './providers.js';

export const MIN_CONFIDENCE = 0.6;
export const CUSTOM_MIN_CONFIDENCE = 0.45;

const PULL_HINT = 'a small push/pull diverter knob or button that sends water to the shower hose when pulled up (often on top of or just behind the spout, between the lever and the spout outlet). Only if clearly visible.';

// What the model should look for. Keep in sync with FAUCETS ids / pin ids.
const CATALOG = {
  lever: {
    cue: 'One mixer body with a SINGLE lever on TOP that lifts up for flow and swings left/right for temperature. Basin, kitchen, and wall-mounted bath/shower single-lever mixers (often with a shower hose). NOT for slim pin levers mounted on the SIDE of a cylinder, or levers on a wall plate: use "custom" for those.',
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
    cue: 'Horizontal wall-mounted thermostatic bar mixer (often called a shower bar) with a control at EACH end: one is the flow / shower-tub switch (a knob or a slim lever), the other is the temperature dial (numbers in °C may be printed or absent) usually with a small safety stop button (red or metal). Any finish: chrome, black, brass.',
    pins: { flow: 'the flow / switch handle', temp: 'the temperature dial', btn: 'the safety stop button on the temperature dial (often red)' },
  },
  diverter: {
    cue: 'Wall-mounted set with THREE handles in a row (hot, middle diverter, cold) plus a shower head above and a tub spout below.',
    pins: { hot: 'the HOT handle', div: 'the middle diverter handle', cold: 'the COLD handle', head: 'the shower head', tub: 'the tub spout' },
  },
};

const SYSTEM = `You help travellers use unfamiliar faucets, taps and shower controls from a photo.
1. If the faucet clearly matches a catalog type AND that type's standard operation applies, use that type and locate its parts.
2. Otherwise, if a faucet or shower control is visible, use type "custom" and write a short guide for THIS faucet yourself, based on how this design is normally operated. Be practical and cautious: if the direction is uncertain, say to try gently and check the water temperature.
3. Use "unknown" only when no faucet or shower control is visible or the photo is too unclear.
Positions are x,y percentages of the image width/height (0 = left/top, 100 = right/bottom), at the centre of the part. Use null for parts you cannot see.
Reply with JSON only, no prose.`;

function buildPrompt(lang) {
  const types = Object.entries(CATALOG).map(([id, t]) =>
    `- "${id}": ${t.cue}\n  parts: ${Object.entries(t.pins).map(([p, d]) => `"${p}" = ${d}`).join('; ')}` +
    (t.optional ? `\n  optional parts (include only if present, else null): ${Object.entries(t.optional).map(([p, d]) => `"${p}" = ${d}`).join('; ')}` : '')).join('\n');
  return `Catalog:
${types}

Return:
{
  "type": "<catalog id, custom, or unknown>",
  "confidence": <0..1>,
  "parts": { "<part id>": { "x": <0-100>, "y": <0-100> } | null },
  "note": "<optional, max 80 chars, in ${lang === 'ko' ? 'Korean' : 'English'}: anything unusual the user must know. Empty string if nothing.>",
  "custom": null
}

When type is "custom", set "parts" to {} and fill "custom" instead (Korean in "ko", English in "en", short and plain):
{
  "name": { "ko": "<e.g. 사이드 레버 세면대 수전>", "en": "<e.g. Side-lever basin mixer>" },
  "parts": [ { "id": "<short id>", "label": { "ko": "<2-6 chars>", "en": "<1-2 words>" }, "x": <0-100>, "y": <0-100>, "tone": "hot" | "cold" | null } ],
  "steps": [ { "part": "<part id>", "arrow": "up" | "down" | "cw" | "ccw" | "swap" | "press" | "hand" | null,
               "t": { "ko": "<imperative, max 22 chars>", "en": "<max 40 chars>" },
               "d": { "ko": "<one sentence, max 40 chars>", "en": "<max 70 chars>" } } ],
  "safety": { "ko": "<one caution, max 45 chars>", "en": "<max 80 chars>" }
}
Rules for custom: 2-6 parts (the controls and the outlet), 2-5 steps in order (turn on, set temperature, switch outlet if any, turn off). "arrow" shows the motion at that part: up/down = lift/push, cw/ccw = rotate clockwise/anticlockwise as seen in the photo, swap = move sideways between hot and cold, press = push a button, hand = put hands under a sensor.`;
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

const ARROWS = ['up', 'down', 'cw', 'ccw', 'swap', 'press', 'hand'];
const txt2 = (v, fb = '') => (v && typeof v === 'object')
  ? { ko: String(v.ko || v.en || fb), en: String(v.en || v.ko || fb) }
  : { ko: String(v || fb), en: String(v || fb) };

// Turn the AI's own guide for an uncatalogued faucet into the app's guide shape.
export function buildCustomGuide(c, photo, confidence, note) {
  if (!c || !Array.isArray(c.parts) || !Array.isArray(c.steps)) return null;
  const pins = c.parts.slice(0, 6)
    .filter(p => p && p.id && typeof p.x === 'number' && typeof p.y === 'number')
    .map(p => {
      const x = clamp(p.x), y = clamp(p.y);
      return { id: String(p.id), x, y, label: txt2(p.label, String(p.id)), side: sideFor(x, 'r'), tone: p.tone === 'hot' || p.tone === 'cold' ? p.tone : undefined };
    });
  const byId = Object.fromEntries(pins.map(p => [p.id, p]));
  const steps = c.steps.slice(0, 5).filter(st => st && st.t).map(st => {
    const at = byId[st.part];
    const kind = ARROWS.includes(st.arrow) ? st.arrow : null;
    return { pins: at ? [at.id] : [], arrow: at && kind ? { kind, x: at.x, y: at.y } : null, t: txt2(st.t), d: txt2(st.d) };
  });
  if (pins.length === 0 || steps.length === 0) return null;
  const name = txt2(c.name, 'Faucet');
  return {
    id: 'custom', custom: true, name, short: name,
    img: photo.src, ratio: photo.ratio, pins, steps,
    safety: txt2(c.safety, ''),
    match: Math.round(confidence * 100),
    note: note || '',
    onPhoto: true, ref: null,
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
  const note = typeof j.note === 'string' ? j.note : '';
  if (j.type === 'custom') {
    const guide = conf >= CUSTOM_MIN_CONFIDENCE && buildCustomGuide(j.custom, { src: prep.dataUrl, ratio: prep.ratio }, conf, note);
    return guide ? { ok: true, guide, run } : { ok: false, run };
  }
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
