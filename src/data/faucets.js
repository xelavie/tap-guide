// Guide data for each faucet type. Pin x/y are % of the reference image box.
import img_lever from '../assets/lever.jpg';
import img_twohandle from '../assets/twohandle.jpg';
import img_sensor from '../assets/sensor.jpg';
import img_thermo from '../assets/thermo.jpg';
import img_diverter from '../assets/diverter.jpg';
import img_hero from '../assets/hero.svg';

const RAW = [
  {
    id: 'lever', img: img_lever, ratio: 1, match: 96,
    name: { ko: '싱글레버 혼합수전', en: 'Single-lever mixer' },
    short: { ko: '싱글레버', en: 'Single lever' },
    pins: [
      { id: 'h', x: 60, y: 22, label: { ko: '레버', en: 'Lever' }, side: 'l' },
      { id: 's', x: 28, y: 60, label: { ko: '토수구', en: 'Spout' }, side: 'r' },
    ],
    steps: [
      { pins: ['h'], arrow: { kind: 'up', x: 60, y: 22 },
        t: { ko: '레버를 위로 들어 올리세요', en: 'Lift the lever up' },
        d: { ko: '많이 올릴수록 물이 세게 나와요.', en: 'The higher you lift, the stronger the flow.' } },
      { pins: ['h'], arrow: { kind: 'swap', x: 60, y: 22 },
        t: { ko: '좌우로 돌려 온도를 맞추세요', en: 'Swing left / right for temperature' },
        d: { ko: '왼쪽은 뜨거운 물, 오른쪽은 찬물이에요.', en: 'Left is hot, right is cold.' } },
      { pins: ['h', 's'], arrow: { kind: 'down', x: 60, y: 22 },
        t: { ko: '다 쓰면 레버를 끝까지 내리세요', en: 'Push the lever all the way down' },
        d: { ko: '물이 완전히 멈췄는지 확인하세요.', en: 'Check the water has fully stopped.' } },
    ],
    safety: { ko: '왼쪽 끝은 매우 뜨거울 수 있어요. 처음엔 가운데에서 시작하세요.', en: 'Far left can be very hot. Start from the middle.' },
  },
  {
    id: 'two', img: img_twohandle, ratio: 600 / 430, match: 91,
    name: { ko: '좌우 2핸들 수전', en: 'Two-handle faucet' },
    short: { ko: '2핸들', en: 'Two handles' },
    pins: [
      { id: 'hot', x: 42, y: 31, label: { ko: '온수', en: 'Hot' }, side: 'l', tone: 'hot' },
      { id: 'cold', x: 72, y: 39, label: { ko: '냉수', en: 'Cold' }, side: 'r', tone: 'cold' },
      { id: 's', x: 41, y: 9, label: { ko: '토수구', en: 'Spout' }, side: 'r' },
    ],
    steps: [
      { pins: ['cold'], arrow: { kind: 'ccw', x: 72, y: 39 },
        t: { ko: '찬물 손잡이부터 여세요', en: 'Open the cold handle first' },
        d: { ko: '오른쪽 손잡이를 앞으로 돌리면 찬물이 나와요.', en: 'Turn the right handle toward you for cold water.' } },
      { pins: ['hot'], arrow: { kind: 'cw', x: 42, y: 31 },
        t: { ko: '온수 손잡이로 온도를 맞추세요', en: 'Add hot water to adjust' },
        d: { ko: '왼쪽 손잡이를 조금씩 열어 섞어주세요.', en: 'Open the left handle a little at a time.' } },
      { pins: ['hot', 'cold'], arrow: null,
        t: { ko: '두 손잡이를 모두 잠그세요', en: 'Close both handles' },
        d: { ko: '반대 방향으로 끝까지 돌리면 멈춰요.', en: 'Turn each back until it stops.' } },
    ],
    safety: { ko: '온수를 먼저 틀면 갑자기 뜨거운 물이 나올 수 있어요.', en: 'Opening hot first can give a sudden burst of hot water.' },
  },
  {
    id: 'sensor', img: img_sensor, ratio: 470 / 390, match: 94,
    name: { ko: '센서식 자동수전', en: 'Touchless sensor faucet' },
    short: { ko: '센서식', en: 'Sensor' },
    pins: [
      { id: 'eye', x: 57, y: 73, label: { ko: '센서', en: 'Sensor' }, side: 'r' },
      { id: 's', x: 18, y: 30, label: { ko: '토수구', en: 'Spout' }, side: 'r' },
    ],
    steps: [
      { pins: ['s'], arrow: { kind: 'hand', x: 22, y: 50 },
        t: { ko: '토수구 아래로 손을 넣으세요', en: 'Put your hands under the spout' },
        d: { ko: '손잡이는 없어요. 10–15cm 아래가 적당해요.', en: 'No handle needed — about 10–15cm below.' } },
      { pins: ['eye'], arrow: { kind: 'press', x: 57, y: 73 },
        t: { ko: '안 나오면 센서 창 앞에서 흔들어 보세요', en: 'No water? Wave in front of the sensor' },
        d: { ko: '검은 창이 손을 감지해요. 가리지 마세요.', en: 'The dark window detects your hands.' } },
      { pins: ['s'], arrow: null,
        t: { ko: '손을 빼면 자동으로 멈춰요', en: 'Pull away and it stops by itself' },
        d: { ko: '보통 1–2초 뒤에 꺼져요.', en: 'Usually within 1–2 seconds.' } },
    ],
    safety: { ko: '온도 조절이 안 되는 경우가 많아요. 먼저 손끝으로 확인하세요.', en: 'Temperature is often fixed. Test with a fingertip first.' },
  },
  {
    id: 'thermo', img: img_thermo, ratio: 1, match: 89,
    name: { ko: '온도조절 써모스탯', en: 'Thermostatic shower mixer' },
    short: { ko: '써모스탯', en: 'Thermostat' },
    pins: [
      { id: 'flow', x: 11, y: 64, label: { ko: '물 양 · 전환', en: 'Flow / switch' }, side: 'r' },
      { id: 'temp', x: 90, y: 41, label: { ko: '온도 다이얼', en: 'Temp dial' }, side: 'l' },
      { id: 'btn', x: 86, y: 35, label: { ko: '안전 버튼', en: 'Safety stop' }, side: 'l', tone: 'hot' },
    ],
    steps: [
      { pins: ['flow'], arrow: { kind: 'ccw', x: 11, y: 64 }, dirModes: 'shower',
        t: { ko: '{side:flow} 손잡이를 돌려 물을 트세요', en: 'Turn the {side:flow} handle to start water' },
        d: { ko: '돌리는 방향에 따라 샤워기/토수구로 바뀌는 모델이 많아요.', en: 'On many models the direction picks shower or spout.' } },
      { pins: ['temp'], arrow: { kind: 'cw', x: 90, y: 41 }, dirModes: 'hot',
        t: { ko: '{side:temp} 다이얼로 온도를 맞추세요', en: 'Set temperature with the {side:temp} dial' },
        d: { ko: '숫자는 °C예요. 38 근처가 적당해요.', en: 'Numbers are °C. Around 38 is comfortable.' } },
      { pins: ['btn'], arrow: { kind: 'press', x: 86, y: 35 },
        t: { ko: '38°C 이상은 빨간 버튼을 누른 채 돌리세요', en: 'Above 38°C: hold the red button while turning' },
        d: { ko: '화상 방지용 잠금 장치예요.', en: 'It’s an anti-scald lock.' } },
    ],
    safety: { ko: '빨간 버튼은 화상 방지 잠금이에요. 아이와 함께라면 누르지 마세요.', en: 'The red button is an anti-scald lock. Leave it alone with kids around.' },
  },
  {
    id: 'diverter', img: img_diverter, ratio: 1, match: 87,
    name: { ko: '샤워 전환 밸브', en: 'Tub / shower diverter' },
    short: { ko: '샤워 전환', en: 'Diverter' },
    pins: [
      { id: 'hot', x: 30, y: 56, label: { ko: '온수 H', en: 'Hot H' }, side: 'l', tone: 'hot' },
      { id: 'div', x: 48, y: 56, label: { ko: '전환', en: 'Switch' }, side: 'b' },
      { id: 'cold', x: 66, y: 56, label: { ko: '냉수 C', en: 'Cold C' }, side: 'r', tone: 'cold' },
      { id: 'head', x: 20, y: 30, label: { ko: '샤워기', en: 'Shower' }, side: 'r' },
      { id: 'tub', x: 33, y: 92, label: { ko: '욕조 토수구', en: 'Tub spout' }, side: 'r' },
    ],
    steps: [
      { pins: ['cold', 'hot'], arrow: { kind: 'ccw', x: 66, y: 56 },
        t: { ko: 'C → H 순서로 열어 온도를 맞추세요', en: 'Open C, then H, to mix' },
        d: { ko: '처음엔 아래 욕조 토수구로 물이 나와요.', en: 'Water comes out of the tub spout first.' } },
      { pins: ['div', 'head'], arrow: { kind: 'cw', x: 48, y: 56 },
        t: { ko: '가운데 손잡이를 돌려 샤워로 바꾸세요', en: 'Turn the middle knob for shower' },
        d: { ko: '물이 위쪽 샤워기로 옮겨가요.', en: 'Water moves up to the shower head.' } },
      { pins: ['hot', 'cold'], arrow: null,
        t: { ko: 'H → C 순서로 잠그세요', en: 'Close H first, then C' },
        d: { ko: '전환 손잡이도 원래대로 돌려두면 좋아요.', en: 'Reset the middle knob too.' } },
    ],
    safety: { ko: '전환 직후 샤워기에서 찬물/뜨거운 물이 갑자기 나올 수 있어요. 몸에서 떨어뜨리고 바꾸세요.', en: 'Water may spray suddenly when switching — aim the head away from you.' },
  },
];

// ---- Optional parts ----
// Some faucets have extra controls that only appear on certain models.
// The AI looks for them; if found on the photo, their steps are added to the guide.

// Push/pull shower diverter knob (pull up = shower, push down = spout).
// Common on wall-mounted bath/shower mixers and US tub spouts.
const PULL_DIVERTER_PIN = { id: 'pull', x: 50, y: 50, label: { ko: '샤워 전환', en: 'Shower switch' }, side: 'r', optional: true };
const PULL_DIVERTER_STEPS = [
  { pins: ['pull'], requires: ['pull'], arrow: { kind: 'up', at: 'pull' },
    t: { ko: '샤워로 바꾸려면 전환 버튼을 위로 당기세요', en: 'Pull the switch up for the shower' },
    d: { ko: '물이 나오는 중에 당겨야 걸려요. 샤워기는 몸 반대쪽으로 두세요.', en: 'Pull while water is running. Point the shower head away from you.' } },
  { pins: ['pull'], requires: ['pull'], arrow: { kind: 'down', at: 'pull' },
    t: { ko: '토수구로 돌리려면 버튼을 아래로 누르세요', en: 'Push it down to switch back to the spout' },
    d: { ko: '물을 잠그면 저절로 내려가는 모델도 많아요.', en: 'On many models it drops back by itself when the water is off.' } },
];

// Insert optional steps before the final "turn it off" step.
function withOptional(f, pins, steps) {
  const last = f.steps.length - 1;
  return { ...f, pins: [...f.pins, ...pins], steps: [...f.steps.slice(0, last), ...steps, f.steps[last]] };
}
const EXTRAS = {
  lever: (f) => withOptional(f, [PULL_DIVERTER_PIN], PULL_DIVERTER_STEPS),
  two: (f) => withOptional(f, [PULL_DIVERTER_PIN], PULL_DIVERTER_STEPS),
};

// ---- Direction modes ----
// A control whose two directions do different things (hotter/colder, shower/spout).
// mode = { dir: 'cw'|'ccw'|'left'|'right'|'up'|'down'|null, label: {ko,en}, tone?: 'hot'|'cold' }
// dir null = we don't know which way, so it is only explained in the step card.
export const OPPOSITE = { cw: 'ccw', ccw: 'cw', left: 'right', right: 'left', up: 'down', down: 'up' };
const MODE_SETS = {
  hot: {
    known: (dir) => [
      { dir, label: { ko: '뜨거운 물', en: 'Hotter' }, tone: 'hot' },
      { dir: OPPOSITE[dir], label: { ko: '찬물', en: 'Colder' }, tone: 'cold' },
    ],
    // Without a direction: say how to tell from the dial itself
    unknown: [
      { dir: null, label: { ko: '빨간 표시 · 큰 숫자 쪽 = 뜨거운 물', en: 'Red mark / higher numbers = hotter' }, tone: 'hot' },
      { dir: null, label: { ko: '파란 표시 · 작은 숫자 쪽 = 찬물', en: 'Blue mark / lower numbers = colder' }, tone: 'cold' },
    ],
  },
  shower: {
    known: (dir) => [
      { dir, label: { ko: '샤워기', en: 'Shower' } },
      { dir: OPPOSITE[dir], label: { ko: '토수구', en: 'Spout' } },
    ],
    unknown: null,
  },
};
export function modesFor(key, dir) {
  const set = MODE_SETS[key];
  if (!set) return null;
  return dir && OPPOSITE[dir] ? set.known(dir) : set.unknown;
}

// "{side:pinId}" in step text → 왼쪽/오른쪽 depending on where that pin is
// relative to the other controls in the photo.
export function resolveSides(f) {
  const pins = f.pins.filter(p => !p.optional);
  const mid = pins.reduce((a, p) => a + p.x, 0) / (pins.length || 1);
  const fill = (txt, lang) => typeof txt !== 'string' ? txt : txt.replace(/\{side:(\w+)\}/g, (_, id) => {
    const p = f.pins.find(q => q.id === id);
    const left = p ? p.x < mid : true;
    return lang === 'ko' ? (left ? '왼쪽' : '오른쪽') : (left ? 'left' : 'right');
  });
  const fix = (o) => o && { ko: fill(o.ko, 'ko'), en: fill(o.en, 'en') };
  return { ...f, steps: f.steps.map(s => ({ ...s, t: fix(s.t), d: fix(s.d) })) };
}

// Default modes for the reference photos (no AI direction info).
function withDefaultModes(f) {
  return { ...f, steps: f.steps.map(s => (s.dirModes && !s.modes ? { ...s, modes: modesFor(s.dirModes, null) } : s)) };
}

// Full definitions incl. optional parts — used by AI recognition (side words still unresolved).
export const FAUCET_DEFS = RAW.map(f => (EXTRAS[f.id] ? EXTRAS[f.id](f) : f));

// Guide without optional parts — used for sample photos and manual pick,
// where we can't know whether the model has those controls.
export function stripOptional(f) {
  return resolveSides(withDefaultModes({
    ...f,
    pins: f.pins.filter(p => !p.optional),
    steps: f.steps.filter(s => !s.requires),
  }));
}
export const FAUCETS = FAUCET_DEFS.map(stripOptional);

// Illustration used on the splash and onboarding screens (not a recognizable type).
export const HERO = {
  id: 'hero', img: img_hero, ratio: 520 / 580,
  pins: [
    { id: 'h', x: 64, y: 24, label: { ko: '레버', en: 'Lever' }, side: 'l' },
    { id: 's', x: 59, y: 71, label: { ko: '토수구', en: 'Spout' }, side: 'r' },
  ],
  steps: [
    { pins: ['h'], arrow: { kind: 'up', x: 64, y: 24 } },
    { pins: ['h'], arrow: { kind: 'swap', x: 64, y: 24 } },
  ],
};
