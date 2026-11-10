// Photo stage + guide overlay (pins, labels, motion arrows) + canvas export
import { useState as useStateO, useRef as useRefO, useLayoutEffect as useLayoutEffectO } from 'react';

function useFitBox(ratio) {
  const ref = useRefO(null);
  const [box, setBox] = useStateO({ w: 0, h: 0 });
  useLayoutEffectO(() => {
    const el = ref.current; if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let w = W, h = W / ratio;
      if (h > H) { h = H; w = H * ratio; }
      setBox({ w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);
  return [ref, box];
}

// Fills its parent; centers the image at its native ratio; children overlay the image box exactly
function PhotoStage({ src, ratio, children, imgStyle, className = '' }) {
  const [ref, box] = useFitBox(ratio);
  return (
    <div ref={ref} className={'pstage ' + className}>
      <div className="pstage-box" style={{ width: box.w, height: box.h }}>
        <img src={src} alt="" style={imgStyle} draggable="false" />
        {children}
      </div>
    </div>
  );
}

export const DIR_GLYPH = { cw: '↻', ccw: '↺', left: '←', right: '→', up: '↑', down: '↓' };
export const DIR_WORD = {
  ko: { cw: '시계 방향', ccw: '반시계 방향', left: '왼쪽으로', right: '오른쪽으로', up: '위로', down: '아래로' },
  en: { cw: 'Clockwise', ccw: 'Anticlockwise', left: 'Left', right: 'Right', up: 'Up', down: 'Down' },
};
const isTemp = (modes) => !modes || modes.some(m => m.tone);

// Two result chips next to the control: what each direction does (only when the direction is known)
function ModeTags({ modes, x, y, lang }) {
  const known = (modes || []).filter(m => m.dir);
  if (known.length === 0) return null;
  const below = y < 62;
  return (
    <div className={'mode-tags ' + (below ? 'below' : 'above')} style={{ left: Math.max(22, Math.min(78, x)) + '%', top: y + '%' }}>
      {known.map((m, i) => (
        <span key={i} className={'mt ' + (m.tone ? 'tone-' + m.tone : '')}><i>{DIR_GLYPH[m.dir]}</i>{m.label[lang]}</span>
      ))}
    </div>
  );
}

function Arrow({ kind, x, y, modes }) {
  const pos = { left: x + '%', top: y + '%' };
  if (kind === 'up' || kind === 'down') {
    return (
      <div className={'arw arw-vert arw-' + kind} style={pos}>
        <i /><i /><i />
      </div>
    );
  }
  if (kind === 'cw' || kind === 'ccw') {
    return (
      <div className={'arw arw-rot arw-' + kind} style={pos}>
        <svg viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="5"
            strokeLinecap="round" strokeDasharray="120 200" />
          <polygon points="70,30 78,46 62,44" fill="currentColor" transform="rotate(-6 70 40)" />
        </svg>
      </div>
    );
  }
  if (kind === 'swap') {
    return (
      // H/C only when the swing really is hot ↔ cold; otherwise a neutral two-way switch
      isTemp(modes)
        ? <div className="arw arw-swap" style={pos}><span className="sw-l">H</span><b /><span className="sw-r">C</span></div>
        : <div className="arw arw-swap is-neutral" style={pos}><span>◀</span><b /><span>▶</span></div>
    );
  }
  // hand / press → ripple
  return (
    <div className={'arw arw-ripple ' + (kind === 'hand' ? 'is-hand' : '')} style={pos}>
      <i /><i /><i /><em />
    </div>
  );
}

function Pin({ pin, lang, state, num }) {
  // state: 'on' | 'dim' | 'all'
  const showLabel = state !== 'dim';
  return (
    <div className={`pin pin-${state} pin-side-${pin.side || 'r'} ${pin.tone ? 'tone-' + pin.tone : ''}`}
      style={{ left: pin.x + '%', top: pin.y + '%' }}>
      <span className="pin-dot" />
      {state === 'on' && <span className="pin-pulse" />}
      {showLabel && (
        <span className="pin-label">
          {num != null && <b>{num}</b>}
          {pin.label[lang]}
        </span>
      )}
    </div>
  );
}

// step: -1 = overview, else index
function GuideOverlay({ faucet, lang, step }) {
  const active = step >= 0 ? faucet.steps[step] : null;
  return (
    <div className="guide-ov" key={faucet.id + ':' + step} aria-hidden="true">
      {faucet.pins.map(p => {
        let state = 'all', num = null;
        if (active) state = active.pins.includes(p.id) ? 'on' : 'dim';
        else {
          const i = faucet.steps.findIndex(s => s.pins[0] === p.id);
          if (i >= 0) num = i + 1;
        }
        return <Pin key={p.id} pin={p} lang={lang} state={state} num={num} />;
      })}
      {active && active.arrow && <Arrow {...active.arrow} modes={active.modes} />}
      {active && active.modes && (() => {
        const at = active.arrow || faucet.pins.find(p => p.id === active.pins[0]);
        return at ? <ModeTags modes={active.modes} x={at.x} y={at.y} lang={lang} /> : null;
      })()}
    </div>
  );
}

// ---------- Export annotated image ----------
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

async function renderGuideImage(faucet, lang, T) {
  const img = await loadImg(faucet.img);
  const W = 1080, IH = Math.round(W / faucet.ratio);
  const pad = 64, lineH = 46;
  const modeLine = (s) => (s.modes || []).map(m => (m.dir ? DIR_GLYPH[m.dir] + ' ' : m.tone === 'hot' ? 'H ' : m.tone === 'cold' ? 'C ' : '') + m.label[lang]).join('   ·   ');
  const footer = 200 + faucet.steps.reduce((a, s) => a + (s.modes ? 160 : 118), 0) + 150;
  const c = document.createElement('canvas');
  c.width = W; c.height = IH + footer;
  const x = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px Pretendard, "Apple SD Gothic Neo", sans-serif`;
  x.fillStyle = '#fbf8f3'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, W, IH);

  const coral = '#e06a45', hot = '#e0523c', cold = '#3f86c9', ink = '#3a2e26';
  faucet.pins.forEach(p => {
    const px = p.x / 100 * W, py = p.y / 100 * IH;
    const col = p.tone === 'hot' ? hot : p.tone === 'cold' ? cold : coral;
    x.beginPath(); x.arc(px, py, 26, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill();
    x.beginPath(); x.arc(px, py, 15, 0, Math.PI * 2); x.fillStyle = col; x.fill();
    x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke();
    x.font = font(700, 34);
    const label = p.label[lang];
    const tw = x.measureText(label).width + 44, th = 62;
    let lx = p.side === 'l' ? px - 38 - tw : px + 38, ly = py - th / 2;
    if (p.side === 'b') { lx = px - tw / 2; ly = py + 36; }
    lx = Math.max(12, Math.min(W - tw - 12, lx));
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(lx, ly, tw, th, 31); x.fill();
    x.fillStyle = ink; x.textBaseline = 'middle'; x.fillText(label, lx + 22, ly + th / 2 + 1);
  });

  let y = IH + pad;
  x.textBaseline = 'alphabetic';
  x.fillStyle = coral; x.font = font(700, 30); x.fillText(T.brand.toUpperCase(), pad, y);
  y += 64; x.fillStyle = ink; x.font = font(800, 56); x.fillText(faucet.name[lang], pad, y);
  y += 56;
  faucet.steps.forEach((s, i) => {
    y += 30;
    x.fillStyle = coral; x.beginPath(); x.arc(pad + 26, y + 10, 26, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = font(800, 30); x.textAlign = 'center'; x.fillText(String(i + 1), pad + 26, y + 21);
    x.textAlign = 'left';
    x.fillStyle = ink; x.font = font(700, 38); x.fillText(s.t[lang], pad + 80, y + 22);
    x.fillStyle = '#8a7a6c'; x.font = font(500, 30); x.fillText(s.d[lang], pad + 80, y + 22 + lineH);
    if (s.modes) { x.fillStyle = coral; x.font = font(700, 28); x.fillText(modeLine(s), pad + 80, y + 22 + lineH * 2); y += 42; }
    y += 88;
  });
  y += 30;
  x.fillStyle = '#fbe6dc'; x.beginPath(); x.roundRect(pad, y, W - pad * 2, 96, 24); x.fill();
  x.fillStyle = hot; x.font = font(700, 30);
  const sTxt = '⚠ ' + faucet.safety[lang];
  x.fillText(sTxt.length > 46 ? sTxt.slice(0, 45) + '…' : sTxt, pad + 30, y + 58);
  return c;
}

export { PhotoStage, GuideOverlay, Arrow, Pin, renderGuideImage, useFitBox };
