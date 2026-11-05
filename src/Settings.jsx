import { useState } from 'react';
import { I18N } from './data/i18n.js';
import { PROVIDERS } from './ai/providers.js';
import { saveAiConfig } from './ai/config.js';
import { testConnection } from './ai/recognize.js';

export default function SettingsScreen({ lang, cfg, lastRun, onChange, onBack, toast }) {
  const T = I18N[lang];
  const ko = lang === 'ko';
  const [show, setShow] = useState(false);
  const [test, setTest] = useState({ state: 'idle', msg: '' }); // idle | busy | ok | err
  const p = cfg.provider;
  const meta = PROVIDERS[p];
  const key = cfg.keys[p] || '';
  const model = cfg.models[p] || '';

  // Settings save as you type — no separate save step to forget.
  const update = (patch) => {
    const next = { ...cfg, ...patch };
    saveAiConfig(next); onChange(next);
    setTest({ state: 'idle', msg: '' });
  };
  const setKey = (v) => update({ keys: { ...cfg.keys, [p]: v.trim() } });
  const setModel = (v) => update({ models: { ...cfg.models, [p]: v.trim() } });

  const runTest = async () => {
    if (!key) return;
    setTest({ state: 'busy', msg: '' });
    try {
      await testConnection({ provider: p, key, model });
      setTest({ state: 'ok', msg: T.testOk });
    } catch (e) {
      const m = e.kind === 'auth' ? (ko ? 'API 키가 맞지 않아요' : 'Key was rejected')
        : e.kind === 'network' ? (ko ? '연결할 수 없어요. 인터넷을 확인해주세요' : 'Could not connect')
        : e.message;
      setTest({ state: 'err', msg: m });
    }
  };

  const prefixWarn = key && meta.keyPrefix && !key.startsWith(meta.keyPrefix)
    ? (ko ? `${meta.label} 키는 보통 "${meta.keyPrefix}"로 시작해요` : `${meta.label} keys usually start with "${meta.keyPrefix}"`)
    : '';

  return (
    <div className="scr set" data-screen-label="07 AI Settings">
      <div className="set-top">
        <button className="icon-btn" onClick={onBack} aria-label={ko ? '뒤로' : 'Back'}><span className="chev-l" /></button>
        <h2>{T.setT}</h2>
        <span style={{ width: 40 }} />
      </div>

      <div className="set-body">
        <p className="set-lead">{T.setD}</p>

        <div className="set-lbl">{T.provider}</div>
        <div className="seg" role="radiogroup">
          {Object.entries(PROVIDERS).map(([id, m]) => (
            <button key={id} role="radio" aria-checked={p === id} className={p === id ? 'on' : ''} onClick={() => update({ provider: id })}>
              <b>{m.label}</b><small>{m.company}</small>
              {cfg.keys[id] ? <i className="seg-dot" aria-label={ko ? '키 있음' : 'has key'} /> : null}
            </button>
          ))}
        </div>

        <div className="set-lbl">
          {T.apiKey}
          <a href={meta.keyUrl} target="_blank" rel="noreferrer">{T.getKey} ↗</a>
        </div>
        <div className="field">
          <input type={show ? 'text' : 'password'} value={key} placeholder={T.keyPh}
            autoComplete="off" autoCapitalize="off" spellCheck="false"
            onChange={e => setKey(e.target.value)} aria-label={T.apiKey} />
          {key && <button className="field-btn" onClick={() => setShow(!show)}>{show ? T.hideKey : T.showKey}</button>}
        </div>
        {prefixWarn && <div className="set-warn">{prefixWarn}</div>}

        <div className="set-lbl">{T.model}<small>{T.modelHint}</small></div>
        <div className="field">
          <input type="text" value={model} placeholder={meta.defaultModel}
            autoComplete="off" autoCapitalize="off" spellCheck="false"
            onChange={e => setModel(e.target.value)} aria-label={T.model} />
        </div>

        <div className="set-row">
          <button className={'btn-primary grow ' + (test.state === 'ok' ? 'is-ok' : '')} disabled={!key || test.state === 'busy'} onClick={runTest}>
            {test.state === 'busy' ? T.testing : test.state === 'ok' ? '✓ ' + T.testOk : T.test}
          </button>
          {key && <button className="btn-ghost" onClick={() => { setKey(''); toast(ko ? '키를 삭제했어요' : 'Key removed'); }}>{T.clearKey}</button>}
        </div>
        {test.state === 'err' && <div className="set-err" role="alert">{test.msg}</div>}

        <ul className="set-privacy">
          {T.privacy.map((t, i) => <li key={i}>{t}</li>)}
        </ul>

        {lastRun && (
          <details className="set-log">
            <summary>{T.lastRun}</summary>
            <pre>{JSON.stringify(lastRun, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
