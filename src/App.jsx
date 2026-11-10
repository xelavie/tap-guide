import { useState, useEffect, useRef } from 'react';
import { I18N } from './data/i18n.js';
import { FAUCETS as F, HERO } from './data/faucets.js';
import { PhotoStage, GuideOverlay, renderGuideImage, DIR_GLYPH, DIR_WORD } from './overlay.jsx';
import { loadAiConfig, activeAi } from './ai/config.js';
import { recognize } from './ai/recognize.js';
import { PROVIDERS } from './ai/providers.js';
import SettingsScreen from './Settings.jsx';

const T_ = (lang) => I18N[lang];
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ---------------- Brand ---------------- */
function Brand({ T, light }) {
  return <div className={'brand' + (light ? ' light' : '')}>{T.brand}<span className="brand-dot" aria-hidden="true" /></div>;
}

// Faucet illustration framed by viewfinder corners
function HeroFrame({ lang, step, className = '', children }) {
  return (
    <div className={'hero-frame ' + className}>
      <div className="hero-card">
        <PhotoStage src={HERO.img} ratio={HERO.ratio}>
          {step != null && <GuideOverlay faucet={HERO} lang={lang} step={step} />}
        </PhotoStage>
        {children}
      </div>
      <i className="vf" /><i className="vf" /><i className="vf" /><i className="vf" />
    </div>
  );
}

/* ---------------- Splash ---------------- */
function Splash({ lang, quick, onDone }) {
  const T = T_(lang);
  const doneRef = useRef(onDone); doneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), quick ? 900 : 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <button className="scr splash" onClick={() => doneRef.current()} aria-label={T.brand + ' — ' + T.skipSplash} data-screen-label="00 Splash">
      <HeroFrame lang={lang} step={-1} className="sp-hero" />
      <span className="sp-word">{T.brand}<i aria-hidden="true" /></span>
      <span className="sp-tag">{T.tagline}</span>
      <span className="sp-bottom" aria-hidden="true">
        <span className="sp-shutter"><i /></span>
        <span className="sp-en">TAPSNAP</span>
      </span>
    </button>
  );
}

/* ---------------- Onboarding ---------------- */
function Onboarding({ lang, setLang, onDone }) {
  const T = T_(lang);
  const [i, setI] = useState(0);
  const pages = [
    { t: T.ob1T, d: T.ob1D },
    { t: T.ob2T, d: T.ob2D },
    { t: T.ob3T, d: T.ob3D },
  ];
  // Highlight the last line of the first headline ("찍어봐")
  const [l1, ...rest] = pages[i].t.split('\n');
  return (
    <div className="scr ob" data-screen-label="01 Onboarding">
      <div className="ob-top">
        <Brand T={T} />
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="ob-art">
        <HeroFrame lang={lang} step={i === 2 ? null : i} className={'ob-card-' + i}>
          {i === 2 && <div className="ob-perm"><span className="cam-ic" /><div><b>{T.brand}</b><small>{lang === 'ko' ? '카메라 접근 허용' : 'Allow camera access'}</small></div></div>}
        </HeroFrame>
        {i === 0 && (
          <div className="ob-chips rise d1">
            {T.chips.map((c, k) => (
              <span key={k} className={'chip' + (k === 0 ? ' on' : '')}>
                {k > 0 && <i className="chip-arrow" aria-hidden="true" />}
                <b>{c}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ob-body">
        <h1 key={'t' + i} className="rise">{l1}{rest.length > 0 && <>{'\n'}<span className={i === 0 ? 'hl' : ''}>{rest.join('\n')}</span></>}</h1>
        <p key={'d' + i} className="rise d1">{pages[i].d}</p>
      </div>
      <div className="ob-foot">
        <div className="dots">{pages.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="ob-btns">
          {i < 2 && <button className="btn-ghost" onClick={onDone}>{T.skip}</button>}
          <button className="btn-primary grow" onClick={() => (i < 2 ? setI(i + 1) : onDone())}>
            {i < 2 ? T.next : T.start}
          </button>
        </div>
      </div>
    </div>
  );
}

function LangToggle({ lang, setLang, dark }) {
  return (
    <div className={'lang ' + (dark ? 'lang-dark' : '')}>
      {['ko', 'en'].map(l => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)} aria-label={l === 'ko' ? '한국어' : 'English'}>{l === 'ko' ? '한' : 'EN'}</button>
      ))}
    </div>
  );
}

function AiChip({ lang, connected, onClick }) {
  const T = T_(lang);
  return (
    <button className={'ai-chip ' + (connected ? 'on' : '')} onClick={onClick} aria-label={T.settings}>
      <i />{connected ? 'AI' : T.settings}
    </button>
  );
}

/* ---------------- Camera ---------------- */
// Read a photo from the album into a JPEG data URL (orientation fixed, max 2000px).
async function fileToPhoto(file) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    src = await new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => res(im); im.onerror = rej; im.src = url;
    });
  }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) throw new Error('empty image');
  const s = Math.min(1, 2000 / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/jpeg', 0.9), ratio: c.width / c.height };
}

function CameraScreen({ lang, setLang, onCapture, aiOn, onSettings, toast }) {
  const T = T_(lang);
  const vid = useRef(null);
  const fileRef = useRef(null);
  const [status, setStatus] = useState('pending'); // pending | live | off
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream; let cancelled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('off'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        if (vid.current) { vid.current.srcObject = s; vid.current.play().catch(() => {}); }
        setStatus('live');
      })
      .catch(() => setStatus('off'));
    return () => { cancelled = true; stream && stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const openAlbum = () => fileRef.current && fileRef.current.click();
  const shoot = () => {
    if (status !== 'live') { openAlbum(); return; }
    const v = vid.current; const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setFlash(true); setTimeout(() => setFlash(false), 180);
    onCapture(c.toDataURL('image/jpeg', .9), c.width / c.height);
  };
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const p = await fileToPhoto(file);
      onCapture(p.src, p.ratio);
    } catch (err) {
      toast(T.badPhoto);
    } finally { setBusy(false); }
  };

  return (
    <div className="scr cam" data-screen-label="02 Camera">
      <div className="cam-view">
        <video ref={vid} playsInline muted className={status === 'live' ? 'on' : ''} />
        {status !== 'live' && (
          <div className="cam-off">
            <div className="cam-off-bg" style={{ backgroundImage: `url(${HERO.img})` }} />
            {status === 'off' && (
              <div className="cam-off-msg">
                <span className="cam-ic big" />
                <b>{T.camOff}</b>
                <p>{T.camOffD}</p>
                <button className="album-cta" onClick={openAlbum}><span className="gal-ic" />{T.pickPhoto}</button>
              </div>
            )}
          </div>
        )}
        <div className="finder"><i /><i /><i /><i /></div>
        {flash && <div className="flash" />}
      </div>

      <div className="cam-top">
        <Brand T={T} light />
        <div className="cam-top-r">
          <AiChip lang={lang} connected={aiOn} onClick={onSettings} />
          <LangToggle lang={lang} setLang={setLang} dark />
        </div>
      </div>
      <div className="cam-hint">{T.aim}</div>

      <div className="cam-bottom">
        <div className="cam-ctrls">
          <button className="album-btn" onClick={openAlbum} aria-label={T.pickPhoto} disabled={busy}>
            <span className="album-ic"><span className="gal-ic" /></span>
            <small>{busy ? T.loadingPhoto : T.gallery}</small>
          </button>
          <button className="shutter" onClick={shoot} aria-label={lang === 'ko' ? '촬영' : 'Capture'}><i /></button>
          <div className="album-btn" aria-hidden="true" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </div>
  );
}

/* ---------------- Analyzing ---------------- */
// job: { sample: Faucet } for demo photos, or { promise } for AI recognition
function Analyzing({ lang, photo, job, onDone }) {
  const T = T_(lang);
  const [k, setK] = useState(0);
  const [pins, setPins] = useState(job.sample ? job.sample.pins : null);
  const doneRef = useRef(onDone); doneRef.current = onDone;

  useEffect(() => {
    let alive = true;
    const t0 = Date.now();
    const a = setTimeout(() => setK(1), 900);
    const b = setTimeout(() => setK(2), 1800);
    const minMs = job.sample ? 2700 : 1800;
    const settle = (res) => {
      const wait = Math.max(0, minMs - (Date.now() - t0));
      setTimeout(() => { if (alive) doneRef.current(res); }, wait);
    };
    if (job.sample) settle({ ok: true, guide: job.sample });
    else job.promise.then(res => {
      if (!alive) return;
      if (res.ok && res.guide.onPhoto) setPins(res.guide.pins);
      settle(res);
    }, err => settle({ ok: false, error: err }));
    return () => { alive = false; clearTimeout(a); clearTimeout(b); };
  }, [job]);

  return (
    <div className="scr an" data-screen-label="03 Analyzing">
      <PhotoStage src={photo.src} ratio={photo.ratio} className="an-stage">
        <div className="scanline" />
        {pins && k >= 1 && pins.map((p, i) => (
          <span key={p.id} className="an-dot" style={{ left: p.x + '%', top: p.y + '%', animationDelay: i * 120 + 'ms' }} />
        ))}
      </PhotoStage>
      <div className="an-card" role="status">
        <div className="an-spinner"><i /><i /><i /></div>
        <div className="an-txt">
          <b key={k} className="rise">{T.analyzing[k]}</b>
          <div className="an-bar"><i style={{ width: (k + 1) * 33.3 + '%' }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fail / pick ---------------- */
function errorText(err, lang) {
  const ko = lang === 'ko';
  switch (err?.kind) {
    case 'auth': return ko ? 'API 키가 맞지 않아요. AI 연결 설정에서 키를 확인해주세요.' : 'The API key was rejected. Check it in AI setup.';
    case 'quota': return ko ? '사용 한도에 걸렸어요. 잠시 후 다시 시도하거나 결제 설정을 확인해주세요.' : 'Rate or usage limit reached. Try again later or check billing.';
    case 'workspace': return ko ? 'Claude 키에 워크스페이스 설정이 필요해요. AI 연결 화면을 확인해주세요.' : 'Your Claude key needs a workspace. Check AI setup.';
    case 'busy': {
      const name = PROVIDERS[err.provider]?.label || 'AI';
      return ko ? `지금 ${name}에 사용자가 몰려서 잠깐 바빠요. 잠시 뒤 같은 사진으로 다시 시도해 보세요.`
                : `${name} is busy right now. Wait a moment and try the same photo again.`;
    }
    case 'network': return ko ? '인터넷 연결을 확인해주세요.' : 'Check your internet connection.';
    case 'parse': return ko ? 'AI 응답을 읽지 못했어요. 다시 찍어주세요.' : 'Could not read the AI reply. Please retake.';
    default: return (ko ? 'AI 오류: ' : 'AI error: ') + (err?.message || '');
  }
}

const RETRYABLE = ['busy', 'network', 'parse', 'quota', 'api'];

function FailScreen({ lang, photo, reason, error, onRetake, onPick, onSettings, onRetry }) {
  const T = T_(lang);
  const noAi = reason === 'noai';
  const isErr = reason === 'error';
  return (
    <div className="scr fail" data-screen-label="05 Not recognized">
      <div className="fail-photo">
        <PhotoStage src={photo.src} ratio={photo.ratio} imgStyle={{ filter: 'saturate(.6)' }} />
        <div className="fail-badge">{noAi ? 'AI' : '?'}</div>
      </div>
      <div className="fail-body">
        <h2>{noAi ? T.noAiT : error?.kind === 'busy' ? T.busyT : isErr ? T.errT : T.failT}</h2>
        <p>{noAi ? T.noAiD : isErr ? errorText(error, lang) : T.failD}</p>
        {(noAi || error?.kind === 'auth' || error?.kind === 'workspace') && (
          <button className="connect-btn" onClick={onSettings}><span className="ai-dot" />{T.connect}</button>
        )}
        {!noAi && !isErr && (
          <ul className="tips">
            {T.tips.map((t, i) => <li key={i}><span>{i + 1}</span>{t}</li>)}
          </ul>
        )}
        <div className="pick-lbl">{T.pick}</div>
        <div className="pick">
          {F.map(f => (
            <button key={f.id} onClick={() => onPick(f)}>
              <img src={f.img} alt="" /><span>{f.short[lang]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="fail-foot">
        {isErr && onRetry && RETRYABLE.includes(error?.kind) ? (<>
          <button className="btn-ghost" onClick={onRetake}>{T.retake}</button>
          <button className="btn-primary grow" onClick={onRetry}>↻ {T.retrySame}</button>
        </>) : (
          <button className="btn-primary grow" onClick={onRetake}><span className="cam-ic sm" />{T.retake}</button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Result ---------------- */
// What each direction does, in words under the step (always readable, even if the photo is small)
function ModeLegend({ modes, lang }) {
  return (
    <ul className="mode-legend rise d2">
      {modes.map((m, i) => (
        <li key={i} className={m.tone ? 'tone-' + m.tone : ''}>
          <i>{m.dir ? DIR_GLYPH[m.dir] : m.tone === 'hot' ? 'H' : m.tone === 'cold' ? 'C' : '•'}</i>
          {m.dir && <em>{DIR_WORD[lang][m.dir]}</em>}
          <b>{m.label[lang]}</b>
        </li>
      ))}
    </ul>
  );
}

function ResultScreen({ lang, setLang, faucet, userPhoto, onRetake, onShare }) {
  const T = T_(lang);
  const [step, setStep] = useState(0);
  const [showMine, setShowMine] = useState(false);
  useEffect(() => { setStep(0); setShowMine(false); }, [faucet]);
  const n = faucet.steps.length;
  const cur = step >= 0 ? faucet.steps[step] : null;
  // Thumbnail: on-photo guides show the reference example; otherwise the user's own photo
  const thumb = faucet.onPhoto ? (faucet.ref ? { src: faucet.ref.img, label: T.refPhoto } : null) : userPhoto ? { src: userPhoto.src, label: T.yourPhoto } : null;

  return (
    <div className="scr res" data-screen-label="04 Result">
      <div className="res-photo">
        <PhotoStage src={faucet.img} ratio={faucet.ratio}>
          <GuideOverlay faucet={faucet} lang={lang} step={step} />
        </PhotoStage>
        <div className="res-top">
          <button className="icon-btn" onClick={onRetake} aria-label={lang === 'ko' ? '뒤로' : 'Back'}><span className="chev-l" /></button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        {thumb && (
          <button className={'mine ' + (showMine ? 'open' : '')} onClick={() => setShowMine(!showMine)}>
            <img src={thumb.src} alt="" />
            <span>{thumb.label}</span>
          </button>
        )}
      </div>

      <div className="sheet">
        <div className="grab" />
        <div className="type-row">
          <div>
            <div className="eyebrow">{faucet.custom ? T.customEyebrow : T.detected}</div>
            <h2>{faucet.name[lang]}</h2>
          </div>
          <div className="match"><b>{faucet.match}%</b><small>{T.match}</small></div>
        </div>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={step === -1} className={step === -1 ? 'on' : ''} onClick={() => setStep(-1)}>{T.all}</button>
          {faucet.steps.map((_, i) => (
            <button key={i} role="tab" aria-selected={step === i} className={step === i ? 'on' : ''} onClick={() => setStep(i)}>
              {lang === 'ko' ? `${i + 1}${T.step}` : `${T.step} ${i + 1}`}
            </button>
          ))}
        </div>

        {cur ? (
          <div className="step-card" key={faucet.id + step}>
            <div className="step-num">{step + 1}<small>/{n}</small></div>
            <div className="step-txt">
              <h3 className="rise">{cur.t[lang]}</h3>
              <p className="rise d1">{cur.d[lang]}</p>
              {cur.modes && <ModeLegend modes={cur.modes} lang={lang} />}
            </div>
            <div className="step-nav">
              <button disabled={step === 0} onClick={() => setStep(step - 1)} aria-label={lang === 'ko' ? '이전 단계' : 'Previous step'}><span className="chev-l" /></button>
              <button className="fwd" onClick={() => setStep(step < n - 1 ? step + 1 : -1)} aria-label={lang === 'ko' ? '다음 단계' : 'Next step'}><span className="chev-r" /></button>
            </div>
          </div>
        ) : (
          <ol className="overview" key="ov">
            {faucet.steps.map((s, i) => (
              <li key={i} onClick={() => setStep(i)}><span>{i + 1}</span><div><b>{s.t[lang]}</b><small>{s.d[lang]}</small>{s.modes && <ModeLegend modes={s.modes} lang={lang} />}</div></li>
            ))}
          </ol>
        )}

        {faucet.custom && (
          <div className="ai-note">
            <span className="ai-dot" />
            <div><b>{T.aiNote}</b><p>{T.customWarn}</p></div>
          </div>
        )}

        {faucet.note && (
          <div className="ai-note">
            <span className="ai-dot" />
            <div><b>{T.aiNote}</b><p>{faucet.note}</p></div>
          </div>
        )}

        {faucet.safety[lang] && (
          <div className="safety">
            <span className="warn-ic">!</span>
            <div><b>{T.safety}</b><p>{faucet.safety[lang]}</p></div>
          </div>
        )}

        <div className="actions">
          <button className="act" onClick={onRetake}><span className="cam-ic sm dark" />{T.retake}</button>
          <button className="act" onClick={() => onShare('save')}><span className="dl-ic" />{T.save}</button>
          <button className="act primary" onClick={() => onShare('sheet')}><span className="sh-ic" />{T.share}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Share sheet ---------------- */
function ShareSheet({ lang, faucet, onClose, onAction }) {
  const T = T_(lang);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    renderGuideImage(faucet, lang, T).then(c => setPreview(c.toDataURL('image/jpeg', .9))).catch(() => {});
  }, [faucet, lang]);
  return (
    <div className="modal" onClick={onClose} data-screen-label="06 Share">
      <div className="share" onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <h3>{T.shareT}</h3>
        <p className="muted">{T.shareD}</p>
        <div className="share-prev">{preview ? <img src={preview} alt="" /> : <div className="sk" />}</div>
        <div className="share-list">
          <button onClick={() => onAction('save')}><span className="dl-ic" />{T.shareImg}</button>
          <button onClick={() => onAction('link')}><span className="link-ic" />{T.shareLink}</button>
          <button onClick={() => onAction('native')}><span className="sh-ic dark" />{T.shareNative}</button>
        </div>
        <button className="btn-ghost full" onClick={onClose}>{T.close}</button>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [lang, setLangS] = useState(() => ls.get('tg_lang') || 'ko');
  const setLang = (l) => { setLangS(l); ls.set('tg_lang', l); };
  const hashFaucet = () => F.find(f => '#' + f.id === location.hash) || null;
  const [screen, setScreen] = useState(() => hashFaucet() ? 'result' : 'splash');
  const [seen] = useState(() => !!ls.get('tg_ob'));
  const [photo, setPhoto] = useState(null);       // {src, ratio}
  const [faucet, setFaucet] = useState(() => hashFaucet()); // the guide being shown
  const [userPhoto, setUserPhoto] = useState(null);
  const [job, setJob] = useState(null);
  const [fail, setFail] = useState({ reason: 'low', error: null });
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiCfg, setAiCfg] = useState(loadAiConfig);
  const [lastRun, setLastRun] = useState(null);
  const [back, setBack] = useState('camera');
  const T = T_(lang);
  const ai = activeAi(aiCfg);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };
  const go = (s) => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); setScreen(s); };

  const goCapture = (src, ratio) => {
    const p = { src, ratio };
    setUserPhoto(p); setPhoto(p); setFaucet(null);
    if (!ai) { setFail({ reason: 'noai', error: null }); setScreen('fail'); return; }
    const promise = recognize(ai, p, lang).then(res => { setLastRun(res.run); return res; });
    setJob({ promise }); setScreen('analyze');
  };
  const onAnalyzed = (res) => {
    if (res.ok) { setFaucet(res.guide); setScreen('result'); return; }
    if (res.error) setLastRun({ provider: ai?.provider, error: res.error.message, at: Date.now() });
    setFail({ reason: res.error ? 'error' : 'low', error: res.error || null });
    setScreen('fail');
  };
  const openSettings = (from) => { setBack(from); setScreen('settings'); };

  const doShare = async (kind) => {
    if (kind === 'sheet') { setShare(true); return; }
    if (kind === 'save') {
      const c = await renderGuideImage(faucet, lang, T);
      const a = document.createElement('a');
      a.download = `tapsnap-${faucet.id}.png`; a.href = c.toDataURL('image/png'); a.click();
      setShare(false); showToast(T.saved); return;
    }
    if (kind === 'link') {
      try { await navigator.clipboard.writeText(location.href.split('#')[0] + (faucet.custom ? '' : '#' + faucet.id)); } catch (e) { /* ignore */ }
      setShare(false); showToast(T.copied); return;
    }
    if (kind === 'native') {
      try {
        const c = await renderGuideImage(faucet, lang, T);
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        const file = new File([blob], 'tapsnap.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: faucet.name[lang] });
        } else if (navigator.share) {
          await navigator.share({ title: faucet.name[lang], url: location.href.split('#')[0] + '#' + faucet.id });
        } else {
          await navigator.clipboard.writeText(location.href.split('#')[0] + '#' + faucet.id);
          showToast(T.copied);
        }
      } catch (e) { /* user cancelled */ }
      setShare(false);
    }
  };

  return (
    <div className="device">
      <div className="screen">
        {screen === 'splash' && <Splash lang={lang} quick={seen} onDone={() => setScreen(seen ? 'camera' : 'onboard')} />}
        {screen === 'onboard' && <Onboarding lang={lang} setLang={setLang} onDone={() => { ls.set('tg_ob', '1'); setScreen('camera'); }} />}
        {screen === 'camera' && <CameraScreen lang={lang} setLang={setLang} onCapture={goCapture} aiOn={!!ai} onSettings={() => openSettings('camera')} toast={showToast} />}
        {screen === 'analyze' && photo && job && <Analyzing lang={lang} photo={photo} job={job} onDone={onAnalyzed} />}
        {screen === 'fail' && photo && (
          <FailScreen lang={lang} photo={photo} reason={fail.reason} error={fail.error}
            onRetake={() => go('camera')} onSettings={() => openSettings('fail')}
            onRetry={userPhoto ? () => goCapture(userPhoto.src, userPhoto.ratio) : null}
            onPick={(f) => { setFaucet(f); setScreen('result'); }} />
        )}
        {screen === 'result' && faucet && (
          <ResultScreen lang={lang} setLang={setLang} faucet={faucet} userPhoto={userPhoto}
            onRetake={() => go('camera')} onShare={doShare} />
        )}
        {screen === 'settings' && (
          <SettingsScreen lang={lang} cfg={aiCfg} lastRun={lastRun}
            onChange={setAiCfg} onBack={() => setScreen(back)} toast={showToast}
            onGoCamera={() => go('camera')}
            onRetry={back === 'fail' && userPhoto ? () => goCapture(userPhoto.src, userPhoto.ratio) : null} />
        )}
        {share && faucet && <ShareSheet lang={lang} faucet={faucet} onClose={() => setShare(false)} onAction={doShare} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
      <div className="demo-nav">
        <button onClick={() => go('splash')}>{lang === 'ko' ? '시작 화면' : 'Splash'}</button>
        <button onClick={() => { ls.del('tg_ob'); go('onboard'); }}>{lang === 'ko' ? '온보딩' : 'Onboarding'}</button>
        <button onClick={() => go('camera')}>{lang === 'ko' ? '촬영' : 'Camera'}</button>
        <button onClick={() => { setUserPhoto(null); setFaucet(null); setPhoto({ src: F[1].img, ratio: F[1].ratio }); setFail({ reason: 'low', error: null }); setScreen('fail'); }}>{lang === 'ko' ? '인식 실패' : 'Fail state'}</button>
        <button onClick={() => openSettings('camera')}>{T.settings}</button>
      </div>
    </div>
  );
}
