import { useState, useRef, useEffect } from 'react';
import { PROVIDERS } from './ai/providers.js';
import { saveAiConfig } from './ai/config.js';
import { testConnection } from './ai/recognize.js';

// Copy for the guided key setup. Kept here because it is specific to this screen.
const TXT = {
  ko: {
    title: 'AI 연결하기',
    whatT: 'API 키가 뭔가요?',
    whatD: 'AI 회사가 내 계정에 발급해 주는 긴 비밀번호예요. 이 키를 한 번 넣어두면 탭스냅이 내 AI로 수전 사진을 분석해요.',
    step1: '어떤 AI를 쓸까요?',
    rec: '무료로 시작 · 추천',
    paid: '유료 크레딧 필요',
    step2: '키 받아오기',
    open: '키 발급 페이지 열기',
    step3: '키 붙여넣기',
    paste: '붙여넣기',
    keyPh: '복사한 키가 여기에 들어가요',
    pasteFail: '자동 붙여넣기가 막혀 있어요. 입력칸을 길게 눌러 ‘붙여넣기’를 선택해 주세요.',
    show: '보기', hide: '숨기기',
    testing: '연결을 확인하는 중…',
    ok: '연결 완료!',
    okD: '이제 수도꼭지를 찍으면 바로 알려드려요.',
    goCam: '수도꼭지 찍으러 가기',
    retry: '아까 사진으로 다시 분석하기',
    testAgain: '다시 확인하기',
    remove: '키 삭제',
    removed: '키를 삭제했어요',
    advanced: '고급 설정 (보통은 건드리지 않아도 돼요)',
    model: '모델', modelHint: '비워두면 기본 모델',
    ws: '워크스페이스 ID', wsHint: 'Claude 키를 만들 때 워크스페이스를 골랐다면 비워두세요',
    privacy: ['키는 이 휴대폰 브라우저에만 저장돼요. 개발팀도 볼 수 없어요.', '앱 서버가 없어서, 사진은 고른 AI 회사로 바로 전송돼요.', 'AI 사용료가 생기면 각자의 AI 계정에 청구돼요.'],
    lastRun: '최근 인식 기록 (테스트용)',
    errAuth: '키가 맞지 않아요. 복사 버튼을 다시 눌러 키 전체를 복사했는지 확인해 주세요.',
    errNet: '연결할 수 없어요. 인터넷 연결을 확인해 주세요.',
    errWs: '이 Claude 키는 워크스페이스 ID가 필요해요. 키를 만들 때 워크스페이스(Default)를 골라 다시 만들거나, 고급 설정에 ID를 넣어주세요.',
    errQuota: '사용 한도나 결제 설정 문제예요. AI 회사 페이지에서 결제 정보를 확인해 주세요.',
    prefix: (label, p) => `${label} 키는 보통 “${p}”로 시작해요. 다른 회사 키를 넣으신 건 아닌지 확인해 주세요.`,
    tapHere: '이걸 누르세요',
  },
  en: {
    title: 'Connect an AI',
    whatT: 'What is an API key?',
    whatD: 'A long password that an AI company issues to your account. Add it once and TapSnap uses your AI to read faucet photos.',
    step1: 'Which AI?',
    rec: 'Free to start · Recommended',
    paid: 'Needs paid credits',
    step2: 'Get your key',
    open: 'Open the key page',
    step3: 'Paste your key',
    paste: 'Paste',
    keyPh: 'Your copied key goes here',
    pasteFail: 'Automatic paste is blocked. Long-press the field and choose “Paste”.',
    show: 'Show', hide: 'Hide',
    testing: 'Checking the connection…',
    ok: 'Connected!',
    okD: 'Now just take a photo of the faucet.',
    goCam: 'Go take a photo',
    retry: 'Analyze my last photo',
    testAgain: 'Check again',
    remove: 'Remove key',
    removed: 'Key removed',
    advanced: 'Advanced (usually leave as is)',
    model: 'Model', modelHint: 'Empty = default model',
    ws: 'Workspace ID', wsHint: 'Leave empty if you picked a workspace when creating the Claude key',
    privacy: ['Your key is stored only in this phone’s browser. Not even we can see it.', 'There is no app server — photos go straight to the AI you chose.', 'Any AI usage fees are billed to your own AI account.'],
    lastRun: 'Last recognition (for testing)',
    errAuth: 'The key was rejected. Tap the copy button again and make sure you copied the whole key.',
    errNet: 'Could not connect. Check your internet connection.',
    errWs: 'This Claude key needs a workspace ID. Recreate the key with the Default workspace, or add the ID under Advanced.',
    errQuota: 'Usage limit or billing issue. Check billing on the AI company’s page.',
    prefix: (label, p) => `${label} keys usually start with “${p}”. Make sure this is the right company’s key.`,
    tapHere: 'Tap this',
  },
};

// Per-provider steps. `copy` marks the step that shows the copy-button picture.
const GUIDE = {
  gemini: {
    ko: ['아래 ‘키 발급 페이지 열기’를 누르고 구글 계정으로 로그인하세요.', '키가 하나도 없으면 오른쪽 위 ‘API 키 만들기’를 누르세요. 이미 있으면 건너뛰세요.', { copy: '키 목록에서 네모 두 개가 겹친 복사 아이콘을 누르세요. 키가 복사돼요.' }, '탭스냅으로 돌아와 ‘붙여넣기’를 누르면 끝!'],
    en: ['Tap “Open the key page” below and sign in with Google.', 'If you have no key yet, tap “Create API key” at the top right. Otherwise skip this.', { copy: 'In the key list, tap the copy icon (two overlapping squares). The key is copied.' }, 'Come back to TapSnap and tap “Paste”. Done!'],
  },
  anthropic: {
    ko: ['아래 ‘키 발급 페이지 열기’를 누르고 Claude 계정으로 로그인하세요. 결제 크레딧이 있어야 써요.', '‘Create key’를 누르고 이름을 아무거나 적은 뒤, 워크스페이스는 ‘Default’를 고르세요.', { copy: '“sk-ant-”로 시작하는 키가 한 번만 보여요. 옆의 복사 버튼을 누르세요.' }, '탭스냅으로 돌아와 ‘붙여넣기’를 누르면 끝!'],
    en: ['Tap “Open the key page” below and sign in to Claude. You need billing credits.', 'Tap “Create key”, enter any name and choose the “Default” workspace.', { copy: 'The key starting with “sk-ant-” is shown only once. Tap its copy button.' }, 'Come back to TapSnap and tap “Paste”. Done!'],
  },
  openai: {
    ko: ['아래 ‘키 발급 페이지 열기’를 누르고 OpenAI 계정으로 로그인하세요. 결제 정보가 등록돼 있어야 써요.', '‘Create new secret key’를 누르고 이름을 아무거나 적으세요.', { copy: '“sk-”로 시작하는 키가 한 번만 보여요. ‘Copy’ 버튼을 누르세요.' }, '탭스냅으로 돌아와 ‘붙여넣기’를 누르면 끝!'],
    en: ['Tap “Open the key page” below and sign in to OpenAI. Billing must be set up.', 'Tap “Create new secret key” and enter any name.', { copy: 'The key starting with “sk-” is shown only once. Tap “Copy”.' }, 'Come back to TapSnap and tap “Paste”. Done!'],
  },
};

const CopyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </svg>
);

// A simplified drawing of the provider's key row with the copy button highlighted.
function CopyHint({ provider, T }) {
  if (provider === 'gemini') {
    return (
      <div className="kh" aria-hidden="true">
        <div className="kh-row">
          <div className="kh-name"><b>…v2Eg</b><small>Default Gemini API Key</small></div>
          <div className="kh-icons">
            <span className="kh-target"><CopyIcon /><em>{T.tapHere}</em></span>
            <span className="kh-ic">$</span>
            <span className="kh-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="12" width="3" height="8" /><rect x="10.5" y="8" width="3" height="12" /><rect x="17" y="4" width="3" height="16" /></svg></span>
            <span className="kh-ic">⋮</span>
          </div>
        </div>
      </div>
    );
  }
  const prefix = provider === 'anthropic' ? 'sk-ant-api03-••••••••' : 'sk-proj-••••••••••';
  return (
    <div className="kh" aria-hidden="true">
      <div className="kh-row">
        <div className="kh-key">{prefix}</div>
        <span className="kh-target">{provider === 'openai' ? <span className="kh-copytxt">Copy</span> : <CopyIcon />}<em>{T.tapHere}</em></span>
      </div>
    </div>
  );
}

export default function SettingsScreen({ lang, cfg, lastRun, onChange, onBack, onGoCamera, onRetry, toast }) {
  const T = TXT[lang];
  const ko = lang === 'ko';
  const [show, setShow] = useState(false);
  const [test, setTest] = useState({ state: cfg.keys[cfg.provider] ? 'idle' : 'idle', msg: '' }); // idle | busy | ok | err
  const [pasteMsg, setPasteMsg] = useState('');
  const runId = useRef(0);
  const doneRef = useRef(null);
  useEffect(() => { if (test.state === 'ok' && doneRef.current) doneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [test.state]);
  const p = cfg.provider;
  const meta = PROVIDERS[p];
  const key = cfg.keys[p] || '';
  const model = cfg.models[p] || '';
  const workspace = (cfg.workspaces || {})[p] || '';

  // Settings save as you type — there is no save button to forget.
  const update = (patch) => {
    const next = { ...cfg, ...patch };
    saveAiConfig(next); onChange(next);
    return next;
  };
  const runTest = async (next = cfg) => {
    const pp = next.provider; const k = next.keys[pp] || '';
    if (!k) return;
    const id = ++runId.current;
    setTest({ state: 'busy', msg: '' });
    try {
      await testConnection({ provider: pp, key: k, model: next.models[pp] || '', workspace: (next.workspaces || {})[pp] || '' });
      if (id === runId.current) setTest({ state: 'ok', msg: '' });
    } catch (e) {
      if (id !== runId.current) return;
      const m = e.kind === 'auth' ? T.errAuth : e.kind === 'network' ? T.errNet : e.kind === 'workspace' ? T.errWs : e.kind === 'quota' ? T.errQuota : e.message;
      setTest({ state: 'err', msg: m });
    }
  };
  const setKey = (v, autoTest) => {
    const next = update({ keys: { ...cfg.keys, [p]: v.trim() } });
    setPasteMsg('');
    if (autoTest && v.trim()) runTest(next); else setTest({ state: 'idle', msg: '' });
  };
  const pickProvider = (id) => { update({ provider: id }); setTest({ state: 'idle', msg: '' }); setPasteMsg(''); };
  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (!t) throw new Error('empty');
      setKey(t, true);
    } catch (e) { setPasteMsg(T.pasteFail); }
  };

  const prefixWarn = key && meta.keyPrefix && !key.startsWith(meta.keyPrefix) ? T.prefix(meta.label, meta.keyPrefix) : '';
  const steps = GUIDE[p][lang];

  return (
    <div className="scr set" data-screen-label="07 AI Settings">
      <div className="set-top">
        <button className="icon-btn" onClick={onBack} aria-label={ko ? '뒤로' : 'Back'}><span className="chev-l" /></button>
        <h2>{T.title}</h2>
        <span style={{ width: 40 }} />
      </div>

      <div className="set-body">
        <div className="what">
          <span className="what-ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l3 3M14 9l2 2" /></svg></span>
          <div><b>{T.whatT}</b><p>{T.whatD}</p></div>
        </div>

        <div className="set-step"><span className="num">1</span>{T.step1}</div>
        <div className="seg" role="radiogroup">
          {Object.entries(PROVIDERS).map(([id, m]) => (
            <button key={id} role="radio" aria-checked={p === id} className={p === id ? 'on' : ''} onClick={() => pickProvider(id)}>
              <b>{m.label}</b><small>{m.company}</small>
              {cfg.keys[id] ? <i className="seg-dot" aria-label={ko ? '키 있음' : 'has key'} /> : null}
            </button>
          ))}
        </div>
        <p className={'seg-note ' + (p === 'gemini' ? 'rec' : '')}>{p === 'gemini' ? '★ ' + T.rec : T.paid}</p>

        <div className="set-step"><span className="num">2</span>{T.step2}</div>
        <ol className="guide">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="g-num">{i + 1}</span>
              <div className="g-body">
                <p>{typeof s === 'string' ? s : s.copy}</p>
                {typeof s !== 'string' && <CopyHint provider={p} T={T} />}
                {i === 0 && <a className="open-btn" href={meta.keyUrl} target="_blank" rel="noreferrer">{T.open} ↗</a>}
              </div>
            </li>
          ))}
        </ol>

        <div className="set-step"><span className="num">3</span>{T.step3}</div>
        <div className="paste-row">
          <div className="field">
            <input type={show ? 'text' : 'password'} value={key} placeholder={T.keyPh}
              autoComplete="off" autoCapitalize="off" spellCheck="false" aria-label="API key"
              onChange={e => setKey(e.target.value, false)}
              onPaste={e => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); setKey(t, true); } }}
              onBlur={() => { if (key && test.state === 'idle') runTest(); }} />
            {key && <button className="field-btn" onClick={() => setShow(!show)}>{show ? T.hide : T.show}</button>}
          </div>
          <button className="paste-btn" onClick={paste}>{T.paste}</button>
        </div>
        {pasteMsg && <div className="set-warn">{pasteMsg}</div>}
        {prefixWarn && <div className="set-warn">{prefixWarn}</div>}
        {test.state === 'busy' && <div className="set-busy" role="status"><span className="an-spinner"><i /><i /><i /></span>{T.testing}</div>}
        {test.state === 'err' && (
          <div className="set-err" role="alert">{test.msg}
            <button className="err-retry" onClick={() => runTest()}>{T.testAgain}</button>
          </div>
        )}
        {test.state === 'ok' && (
          <div className="done-card" role="status" ref={doneRef}>
            <div className="done-check" aria-hidden="true">✓</div>
            <b>{T.ok}</b>
            <p>{T.okD}</p>
            {onRetry && <button className="btn-primary" onClick={onRetry}>{T.retry}</button>}
            <button className={onRetry ? 'btn-ghost' : 'btn-primary'} onClick={onGoCamera}>{T.goCam}</button>
          </div>
        )}

        {key && <button className="btn-ghost link" onClick={() => { setKey(''); toast(T.removed); }}>{T.remove}</button>}

        <ul className="set-privacy">
          {T.privacy.map((t, i) => <li key={i}>{t}</li>)}
        </ul>

        <details className="set-adv">
          <summary>{T.advanced}</summary>
          <div className="set-lbl">{T.model}<small>{T.modelHint}</small></div>
          <div className="field">
            <input type="text" value={model} placeholder={meta.defaultModel} autoComplete="off" autoCapitalize="off" spellCheck="false"
              onChange={e => update({ models: { ...cfg.models, [p]: e.target.value.trim() } })} aria-label={T.model} />
          </div>
          {meta.hasWorkspace && (
            <>
              <div className="set-lbl">{T.ws}<small>{T.wsHint}</small></div>
              <div className="field">
                <input type="text" value={workspace} placeholder="wrkspc_…" autoComplete="off" autoCapitalize="off" spellCheck="false"
                  onChange={e => update({ workspaces: { ...(cfg.workspaces || {}), [p]: e.target.value.trim() } })} aria-label={T.ws} />
              </div>
            </>
          )}
          {lastRun && (<><div className="set-lbl">{T.lastRun}</div><pre className="set-log">{JSON.stringify(lastRun, null, 2)}</pre></>)}
        </details>
      </div>
    </div>
  );
}
