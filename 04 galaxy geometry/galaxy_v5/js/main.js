import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ═════════════════════════════════════════════════════════════
   코드북 — 00 mater/codeBook_v1.md
═════════════════════════════════════════════════════════════ */
const JAMO = {
  'ㄱ': [0, 0, 0], 'ㅋ': [0, 1, 0], 'ㄲ': [0, 0, 1],
  'ㄴ': [1, 0, 0], 'ㄷ': [1, 1, 0], 'ㅌ': [1, 2, 0], 'ㄸ': [1, 1, 1], 'ㄹ': [1, 3, 0],
  'ㅁ': [2, 0, 0], 'ㅂ': [2, 1, 0], 'ㅍ': [2, 2, 0], 'ㅃ': [2, 1, 1],
  'ㅅ': [3, 0, 0], 'ㅈ': [3, 1, 0], 'ㅊ': [3, 2, 0], 'ㅆ': [3, 0, 1], 'ㅉ': [3, 1, 1],
  'ㅇ': [4, 0, 0], 'ㅎ': [4, 1, 0]
};
/* ═══ 오행 표 — 오행 하나에 대한 모든 것을 여기 한 줄에 모은다 ═══
   순서 = 오행 인덱스(0木 1火 2土 3金 4水). JAMO의 element 값이 이 인덱스다.
   col   : 궤도 라인 · 라벨 · 파편/먼지 입자
   trail : 행성 꼬리(잔상). 가산 6겹에서도 색이 유지되도록 진한 톤
           (검정 오행은 가산합성 특성상 짙은 남빛으로 표현)
   accent: 자소 레터링 화면의 조명 색 (0x… 형식 — THREE.PointLight용)
   tint  : 행성 표면 색 (회색 지형맵에 셰이더에서 곱함)
   glow  : 표면 자체발광 — 어두운 오행일수록 올려서 배경에 안 묻히게
   churn : 표면이 이글거리는 세기 (0이면 정지) */
const EL = [
  {
    h: '木', accent: 0x45dbde, ko: '목', name: '나무',
    col: '#5aa1d3ff', trail: '#4fbbc3ff',
    tex: 'gray_mok.jpg', tint: '#5c9ebfff', glow: 0.10, churn: 1.0, latin: 'WOOD',
  },
  {
    h: '火', accent: 0xe06055, ko: '화', name: '불',
    col: '#e06055', trail: '#d8352a',
    /* M형 항성 표면(입상반) — 행성이 아니라 타는 표면이라 발광이 높다 */
    tex: 'gray_hwa.jpg', tint: '#ff6a42', glow: 0.38, churn: 1.8, latin: 'FIRE',
  },
  {
    h: '土', accent: 0xf0cf3f, ko: '토', name: '흙',
    col: '#f0cf3f', trail: '#fce898ff',
    tex: 'gray_to.jpg', tint: '#ffe570ff', glow: 0.10, churn: 1.1, latin: 'EARTH',
  },
  {
    h: '金', accent: 0xdfe6f2, ko: '금', name: '쇠',
    col: '#efdfc0', trail: '#f2eedfff',
    /* 白 — 순백이면 하이라이트가 날아가므로 살짝 따뜻한 백 */
    tex: 'gray_geum.jpg', tint: '#f4efe4', glow: 0.06, churn: 0.7, latin: 'METAL',
  },
  {
    h: '水', accent: 0x6fa8ff, ko: '수', name: '물',
    col: '#b2c0d7ff', trail: '#3d476bff',
    /* 黑 — 검정에 가장 가깝게, 대신 발광을 올려 보이는 한계까지만 */
    tex: 'gray_su.jpg', tint: '#3b4658', glow: 0.34, churn: 0.9, latin: 'WATER',
  },
];
const OL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const VL = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const CL = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CODA_PARTS = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ']
};

function decompose(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  return { onset: OL[Math.floor(c / 588)], vowel: VL[Math.floor((c % 588) / 28)], coda: CL[c % 28] };
}

/* ═════════════════════════════════════════════════════════════
   02 geometry_v13 — 자소 궤도
   자음 = 오행별 수식 곡선 (하이포/장미/리사주/에피)
   모음 = 원 궤도. 값은 띠(地·人)와 위성(天)이 갖는다
═════════════════════════════════════════════════════════════ */
const PI2 = Math.PI / 2;
const CURVE = {
  /* 木 */ 'ㄱ': { f: 'hypo', A: 2, B: 3, p: 2, q: 1 }, 'ㅋ': { f: 'hypo', A: 4, B: 3, p: 4, q: 1 },
  /* 火 */ 'ㄴ': { f: 'rose', k: 3 }, 'ㄷ': { f: 'rose', k: 2 }, 'ㅌ': { f: 'rose', k: 5 }, 'ㄹ': { f: 'rose', k: 7 },
  /* 土 */ 'ㅁ': { f: 'liss', a: 2, b: 1, d: 0 }, 'ㅂ': { f: 'liss', a: 3, b: 1, d: PI2 }, 'ㅍ': { f: 'liss', a: 3, b: 2, d: PI2 },
  /* 金 */ 'ㅅ': { f: 'hypo', A: 4, B: 3, p: 2, q: 1 }, 'ㅈ': { f: 'hypo', A: 6, B: 3, p: 3, q: 1 }, 'ㅊ': { f: 'hypo', A: 5, B: 3, p: 5, q: 3 },
  /* 水 */ 'ㅇ': { f: 'epi', A: 3, B: 3, p: 3, q: 1 }, 'ㅎ': { f: 'epi', A: 5, B: 6, p: 5, q: 3 },
};
const FAMKO = { hypo: '하이포트로코이드', rose: '장미곡선', liss: '리사주곡선', epi: '에피트로코이드' };
/* 병서 — 궤도는 기본자와 같다. 표기만 쌍둥이 행성 */
const TWIN = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
/* 모음 천지인 필순 — 0=天(·) 1=地(ㅡ) 2=人(ㅣ) */
const VSEQ = {
  'ㅏ': [2, 0], 'ㅑ': [2, 0, 0], 'ㅓ': [0, 2], 'ㅕ': [0, 0, 2],
  'ㅗ': [0, 1], 'ㅛ': [0, 0, 1], 'ㅜ': [1, 0], 'ㅠ': [1, 0, 0],
  'ㅐ': [2, 0, 2], 'ㅒ': [2, 0, 0, 2], 'ㅔ': [0, 2, 2], 'ㅖ': [0, 0, 2, 2],
  'ㅚ': [0, 1, 2], 'ㅟ': [1, 0, 2], 'ㅢ': [1, 2],
  'ㅘ': [0, 1, 2, 0], 'ㅝ': [1, 0, 0, 2],
  'ㅙ': [0, 1, 2, 0, 2], 'ㅞ': [1, 0, 0, 2, 2],
  'ㅡ': [1], 'ㅣ': [2],
};
const YANG = new Set(['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ', 'ㅐ', 'ㅒ', 'ㅚ', 'ㅘ', 'ㅙ']);
const YIN = new Set(['ㅓ', 'ㅕ', 'ㅜ', 'ㅠ', 'ㅔ', 'ㅖ', 'ㅟ', 'ㅝ', 'ㅞ']);
const SAMH = ['天', '地', '人'];
/* 모음은 오행이 아니라 음양을 따른다 — EL과 같은 칸을 가진 여섯 번째 항목 격.
   달 텍스처를 쓰며 위성도 같은 재질을 공유한다 */
const VOWEL_EL = {
  h: '中', accent: 0x9a9a9aff, ko: '중성', name: '달',
  col: '#3d3d3dff', trail: '#505050ff',
  tex: '2k_moon.jpg', tint: '#505050ff', glow: 0.08, churn: 0.35, latin: 'MOON',
};

/* 색 표기 정규화 — THREE.Color는 8자리 hex(#rrggbbaa)도, 알파가 붙은 32비트 숫자도
   읽지 못하고 흰색으로 떨어진다. 색상 피커가 뱉는 값을 그대로 붙여 넣어도 되도록
   THREE로 넘어가는 길목에서 알파를 잘라낸다. CSS 쪽은 8자리를 이해하므로 손대지 않는다 */
const C3 = (h) => new THREE.Color(typeof h === 'string' ? h.slice(0, 7) : (h & 0xffffff));

const NS = 1200;   /* 궤도 샘플 수 */
const R0 = 30;     /* 기본 궤도 반지름 */
const WANG = 0.10; /* 원(모음) 궤도 각속도 */
const SPEED = WANG * 2 * Math.PI * R0;  /* 모든 행성 공통 선속도 */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}
function curveTurns(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return 1;
  return (C.f === 'hypo' || C.f === 'epi') ? C.q : 1;
}
function jamoCurve(g, a) {
  const C = CURVE[TWIN[g] || g] || CURVE['ㅇ'];
  const turns = curveTurns(g);
  let f;
  if (C.f === 'rose') {
    f = t => { const r = Math.cos(C.k * t); return [r * Math.cos(t), r * Math.sin(t)]; };
  } else if (C.f === 'liss') {
    f = t => [Math.sin(C.a * t + C.d), Math.sin(C.b * t)];
  } else {
    const s = C.f === 'hypo' ? 1 : -1, m = C.p / C.q;
    const ySign = C.f === 'hypo' ? -1 : 1;
    f = t => [C.A * Math.cos(t) + s * C.B * Math.cos(m * t), ySign * (C.A * Math.sin(t) - C.B * Math.sin(m * t))];
  }
  const P = [];
  let mx = 0;
  for (let i = 0; i <= NS; i++) {
    const [x, y] = f(i / NS * Math.PI * 2 * turns);
    P.push([x, y]);
    mx = Math.max(mx, Math.hypot(x, y));
  }
  /* 곡선마다 t 증가 방향이 제각각 → 감김수로 판별해 시계방향으로 통일 */
  let wind = 0;
  for (let i = 1; i <= NS; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    wind += Math.atan2(x0 * y1 - y0 * x1, x0 * x1 + y0 * y1);
  }
  if (wind < -0.01) P.reverse();
  return P.map(([x, y]) => [x / mx * a, y / mx * a]);
}
function eqText(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return '';
  const m = C.q === 1 ? C.p : `${C.p}/${C.q}`;
  if (C.f === 'rose') return `r = cos(${C.k}t)`;
  if (C.f === 'liss') return `x = sin(${C.a}t${C.d ? ' + π/2' : ''}) , y = sin(${C.b}t)`;
  return `x = ${C.A}cos t ${C.f === 'hypo' ? '+' : '−'} ${C.B}cos(${m}t)`;
}
function rotate2(P, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return P.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}
function reindex(pts, startIdx, dir) {
  const out = new Array(NS + 1);
  for (let i = 0; i <= NS; i++) out[i] = pts[((startIdx + dir * i) % NS + NS) % NS];
  return out;
}
/* 길이 기준 등간격 재표본화 → 모든 자소의 선속도가 같아진다 */
function arcResample(pts) {
  const cum = [0];
  for (let i = 1; i <= NS; i++)
    cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const len = cum[NS];
  const out = new Array(NS + 1);
  let k = 0;
  for (let i = 0; i <= NS; i++) {
    const d = i / NS * len;
    while (k < NS - 1 && cum[k + 1] < d) k++;
    const seg = cum[k + 1] - cum[k];
    const f = seg > 0 ? (d - cum[k]) / seg : 0;
    out[i] = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
  }
  return { pts: out, len };
}
const FLIP_TWICE = new Set(['ㅂ', 'ㅍ', 'ㅊ', 'ㅋ']);
function consDir(g, el, dir) {
  if (el === 1 || el === 3) dir = -dir;
  if (FLIP_TWICE.has(TWIN[g] || g)) dir = -dir;
  return dir;
}
/* 자음 궤도 — kind: '초성' | '종성' 자음 크기 행성 크기*/
function consOrbit(g, dir, kind, R) {
  const [el, , tense] = JAMO[g] || [4, 0, 0];
  dir = consDir(g, el, dir);
  const rs = arcResample(reindex(rotate2(jamoCurve(g, R0), R() * Math.PI * 2), 0, dir));
  const C = CURVE[TWIN[g] || g];
  const baseSize = 2;
  return {
    glyph: g, kind, type: 'cons', el, col: EL[el].col, trail: EL[el].trail,
    pts: rs.pts, dir, tense, sz: kind === '초성' ? baseSize : baseSize * 0.8,
    w: SPEED / rs.len, moons: 0,
    desc: `${EL[el].h} ${FAMKO[C ? C.f : 'epi']} · ${eqText(g)}${tense ? ' · 병서(쌍둥이)' : ''} · ${dir > 0 ? '시계' : '반시계'}`,
  };
}
/* 모음 궤도 — 원. 음양이 방향을, 천지인이 위성·띠를 정한다 sz 종성 크기 */
function vowelOrbit(v, dir) {
  const seq = VSEQ[v] || [1];
  const cnt = [0, 0, 0];
  seq.forEach(x => cnt[x]++);
  const raw = Array.from({ length: NS + 1 }, (_, i) => {
    const t = i / NS * Math.PI * 2;
    return [R0 * Math.cos(t), R0 * Math.sin(t)];
  });
  const yang = YANG.has(v) ? true : YIN.has(v) ? false : dir > 0;
  const dirLabel = YANG.has(v) ? '陽 시계' : YIN.has(v) ? '陰 반시계' : (dir > 0 ? '中 시계' : '中 반시계');
  return {
    glyph: v, kind: '중성', type: 'vowel', el: -1, col: VOWEL_EL.col, trail: VOWEL_EL.trail,
    pts: reindex(raw, 0, dir), dir, tense: 0, sz: 1,
    w: SPEED / (2 * Math.PI * R0),
    moons: cnt[0], beltH: cnt[1], beltV: cnt[2], seq, yang,
    desc: `${seq.map(x => SAMH[x]).join('')} · 위성${cnt[0]} 가로띠${cnt[1]} 세로띠${cnt[2]} · ${dirLabel}`,
  };
}
/* 음절 → 자소 궤도 목록 (초성 · 중성 · 종성[겹받침 2]) */
function systemFor(ch) {
  const d = decompose(ch);
  if (!d) return null;
  const R = rng(ch.charCodeAt(0) * 2654435761);
  const v = d.vowel;
  /* 초성 방향 = 모음 방향(양성 시계 · 음성 반시계 · 중성 랜덤), 종성 = 반대 */
  const vDir = YANG.has(v) ? 1 : YIN.has(v) ? -1 : (R() < 0.5 ? 1 : -1);
  const orbits = [consOrbit(d.onset, vDir, '초성', R), vowelOrbit(v, vDir)];
  if (d.coda) (CODA_PARTS[d.coda] || [d.coda]).forEach(g => orbits.push(consOrbit(g, -vDir, '종성', R)));
  return { char: ch, el: (JAMO[d.onset] || [4, 0, 0])[0], onset: d.onset, vowel: v, coda: d.coda, orbits };
}

/* ═════════════════════════════════════════════════════════════
   메인 씬 — 01 solar system 베이스
═════════════════════════════════════════════════════════════ */
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000004);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300000);
camera.position.set(0, 46, 78);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.zIndex = '10';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 90000;

scene.add(new THREE.AmbientLight(0xffffff, 0.32));
/* 계마다 점광원을 두면 광원 수가 음절 수만큼 늘어난다 → 전역 평행광 하나로 대신한다 */
const sunLight = new THREE.DirectionalLight(0xfff2d5, 2.4);
sunLight.position.set(1, 0.9, 0.6);
scene.add(sunLight);

const texLoader = new THREE.TextureLoader();
const TEXROOT = "./src/textures/";
const texCache = {};
const loadTex = (name) => {
  if (!texCache[name]) {
    const t = texLoader.load(TEXROOT + name);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache[name] = t;
  }
  return texCache[name];
};

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const smooth = (d, a, b) => {
  const t = Math.min(Math.max((d - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* ---------------- 별 스프라이트 + 포인트 필드 (01 그대로) ---------------- */
function makeStarSprite() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter';
  const flare = (w, l) => {
    const fg = ctx.createLinearGradient(s / 2 - l, s / 2, s / 2 + l, s / 2);
    fg.addColorStop(0, 'rgba(255,255,255,0)');
    fg.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(s / 2 - l, s / 2 - w / 2, l * 2, w);
  };
  flare(2.2, 30);
  ctx.save();
  ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 2); ctx.translate(-s / 2, -s / 2);
  flare(2.2, 30);
  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const STAR_SPRITE = makeStarSprite();

function makeStarField({ count, radiusMin, radiusMax, sizeMin, sizeMax, palette, twinkleAmp, maxPx = 512, atten = 1, generate }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let p;
    if (generate) { p = generate(i); }
    else {
      const r = radiusMin + Math.random() * (radiusMax - radiusMin);
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const sq = Math.sqrt(1 - u * u);
      p = { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
    }
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;

    c.set(p.color ?? palette[Math.floor(Math.random() * palette.length)]);
    const v = 0.6 + Math.random() * 0.4;
    col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;

    size[i] = p.size ?? (sizeMin + Math.pow(Math.random(), 2.2) * (sizeMax - sizeMin));
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.5 + Math.random() * 2.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: STAR_SPRITE },
      uTwinkle: { value: twinkleAmp },
      uAlpha: { value: 1 },
      uMaxPx: { value: maxPx },
      uAtten: { value: atten },
    },
    vertexShader: /* glsl */`
  attribute vec3 aColor;
  attribute float aSize, aPhase, aSpeed;
  uniform float uTime, uTwinkle, uMaxPx, uAtten;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * aSpeed + aPhase));
    vColor = aColor;
    vAlpha = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * tw * pow(300.0 / -mv.z, uAtten), uMaxPx);
    gl_Position = projectionMatrix * mv;
  }`,
    fragmentShader: /* glsl */`
  uniform sampler2D uMap;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha * uAlpha;
  }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}

/* ---------------- [뎁스 1] 우리은하 (01 그대로) ---------------- */
const GALAXY_TILT = new THREE.Euler(0.55, 0.35, 0.12);
const SUN_LOCAL = new THREE.Vector3(9800, 0, 1200);

function galaxyGenerate() {
  const N_BULGE = 11000, N_ARM = 20000, N_HII = 900;
  const pts = [];
  const bulgeCols = [0xfff4d8, 0xffe9b8, 0xffffff, 0xffddaa];
  for (let i = 0; i < N_BULGE; i++) {
    pts.push({
      x: gauss() * 2100, y: gauss() * 800, z: gauss() * 2100,
      color: bulgeCols[Math.floor(Math.random() * bulgeCols.length)],
      size: 300 + Math.pow(Math.random(), 1.8) * 1100,
    });
  }
  const armCols = [0xdfe8ff, 0xffffff, 0xcdd8ff, 0xfff2d8];
  for (let i = 0; i < N_ARM; i++) {
    const t = Math.pow(Math.random(), 0.72) * 12.6;
    let r = 1500 * Math.exp(0.18 * t);
    let th = t + (i % 2) * Math.PI;
    r += gauss() * (280 + r * 0.07);
    th += gauss() * 0.06;
    pts.push({
      x: Math.cos(th) * r, y: gauss() * (130 + r * 0.012), z: Math.sin(th) * r,
      color: armCols[Math.floor(Math.random() * armCols.length)],
      size: 260 + Math.pow(Math.random(), 2.0) * 1000,
    });
  }
  for (let i = 0; i < N_HII; i++) {
    const t = 2.5 + Math.pow(Math.random(), 0.8) * 10;
    let r = 1500 * Math.exp(0.18 * t);
    let th = t + (i % 2) * Math.PI + gauss() * 0.04;
    r += gauss() * (200 + r * 0.05);
    pts.push({
      x: Math.cos(th) * r, y: gauss() * 150, z: Math.sin(th) * r,
      color: 0xff9db8,
      size: 500 + Math.random() * 900,
    });
  }
  let i = 0;
  return () => pts[i++];
}

const galaxy = makeStarField({
  count: 31900,
  sizeMin: 0, sizeMax: 0, palette: [0xffffff],
  twinkleAmp: 0.12,
  maxPx: 10,
  generate: galaxyGenerate(),
});
galaxy.rotation.copy(GALAXY_TILT);
const sunWorldOfLocal = SUN_LOCAL.clone().applyEuler(GALAXY_TILT);
galaxy.position.copy(sunWorldOfLocal.clone().negate());
galaxy.material.uniforms.uAlpha.value = 0;
scene.add(galaxy);

const GALAXY_CENTER_DIR = galaxy.position.clone().normalize();

/* ---------------- [뎁스 2] 성단 + 별 배경 (01 그대로) ---------------- */
const starsWarm = makeStarField({
  count: 9000,
  radiusMin: 420, radiusMax: 1700,
  sizeMin: 8, sizeMax: 30,
  palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xff9e5e, 0xfff4d6],
  twinkleAmp: 0.55,
  atten: 0.25,
});
const starsCool = makeStarField({
  count: 15000,
  radiusMin: 500, radiusMax: 1900,
  sizeMin: 3, sizeMax: 13,
  palette: [0xffffff, 0xbcd2ff, 0x8fb0ff, 0xe8e8ff],
  twinkleAmp: 0.35,
  atten: 0.25,
});
scene.add(starsWarm, starsCool);

const clusterCore = makeStarField({
  count: 9000,
  sizeMin: 8, sizeMax: 32,
  palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xfff4d6, 0xff9e5e],
  twinkleAmp: 0.5,
  atten: 0.25,
  generate: () => {
    const r = 420 + Math.abs(gauss()) * 1150;
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    return { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
  },
});
scene.add(clusterCore);

const streamAxis = GALAXY_CENTER_DIR.clone();
const streamU = new THREE.Vector3(0, 1, 0).cross(streamAxis).normalize();
const streamV = streamAxis.clone().cross(streamU).normalize();
const clusterStream = makeStarField({
  count: 7000,
  sizeMin: 8, sizeMax: 28,
  palette: [0xffd75e, 0xffc44d, 0xff9e5e, 0xffe9a8],
  twinkleAmp: 0.5,
  atten: 0.25,
  generate: () => {
    const t = -2200 + Math.pow(Math.random(), 1.25) * 11500;
    const spread = 240 + Math.max(t, 0) * 0.085;
    const a = gauss() * spread, b = gauss() * spread;
    return {
      x: streamAxis.x * t + streamU.x * a + streamV.x * b,
      y: streamAxis.y * t + streamU.y * a + streamV.y * b,
      z: streamAxis.z * t + streamU.z * a + streamV.z * b,
    };
  },
});
scene.add(clusterStream);

/* ---------------- 태양 글로우 스프라이트 (01 그대로 · 텍스처 공유) 항성 빛 크기 깁노 26 ---------------- */
const GLOW_TEX = (() => {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,244,214,0.95)');
  g.addColorStop(0.25, 'rgba(255,214,110,0.55)');
  g.addColorStop(0.6, 'rgba(255,170,60,0.14)');
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();
function makeGlowSprite(size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sp.scale.setScalar(size);
  return sp;
}

/* ═════════════════════════════════════════════════════════════
   [뎁스 3] 음절 → 계 · [뎁스 2] 어절 → 성단 · [뎁스 1] 문장 → 은하
   음절 하나 = 계 하나 (중심 = 음절 레터 그래픽, 행성 = 자소)
   어절 하나 = 성단 하나 (음절 간 거리의 3배로 배치)
   ". " 기준 문장 하나 = 은하 내 랜덤 좌표의 성단 묶음
   행성 궤도 = geometry_v13 자소 궤적 · 자소마다 궤도면을 기울여 구분
═════════════════════════════════════════════════════════════ */
/* 행성 재질 사양 = 오행 표(EL) 그 자체. 자음은 오행, 모음은 달 */
const planetSpec = (o) => (o.type === 'vowel' ? VOWEL_EL : EL[o.el]);
const planetTex = (o) => planetSpec(o).tex;
const SUN_RADIUS = 3.4;
const MAX_ORBIT = 35;         /* 가장 큰 궤적 반경 (행성·항성이 상대적으로 커 보이게 축소) 궤도 지름 */
const NPT = NS;               /* 궤적 샘플 수 = v13 궤도 샘플 수 */
const REVEAL_DUR = 6;         /* 궤도 작도 6초 */

/* ── 표면 이글거림 셰이더 ───────────────────────────────────────
   MeshStandardMaterial의 조명 계산은 그대로 두고 텍스처 샘플링 지점만
   흐르는 fbm 노이즈로 밀어 준다. 두 층의 속도가 달라서 대류처럼 보인다.
   uPlanetTime 은 전역 하나를 공유 — animate()에서 매 프레임 갱신 */
const uPlanetTime = { value: 0 };

const CHURN_GLSL = `
  uniform float uTime;
  uniform float uChurn;
  float pHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pNoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1,0)), f.x),
               mix(pHash(i + vec2(0,1)), pHash(i + vec2(1,1)), f.x), f.y);
  }
  float pFbm(vec2 p){
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * pNoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }
`;

function addChurn(mat, churn) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uPlanetTime;
    shader.uniforms.uChurn = { value: churn };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CHURN_GLSL)
      /* 느린 큰 소용돌이 + 빠른 잔결 — UV를 밀어 표면이 흐르게 */
      .replace('#include <map_fragment>', `
        float nSlow = pFbm(vMapUv * 5.0 + vec2(uTime * 0.020, uTime * 0.008));
        float nFast = pFbm(vMapUv * 13.0 - vec2(uTime * 0.055, uTime * 0.015));
        vec2 churnUv = vMapUv + vec2(nSlow - 0.5, nFast - 0.5) * 0.018 * uChurn;
        diffuseColor *= texture2D(map, churnUv);
        diffuseColor.rgb *= 1.0 + (nFast - 0.5) * 0.55 * uChurn;
      `)
      /* 밝은 결일수록 더 달아오르게 — 자체발광에도 같은 노이즈를 물린다 */
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        totalEmissiveRadiance *= 1.0 + (nFast - 0.4) * 1.3 * uChurn;
      `);
  };
  /* 주입한 코드가 다르면 다른 프로그램이어야 하므로 캐시 키를 갈라 준다 */
  mat.customProgramCacheKey = () => 'churn' + churn;
}

const planetMatCache = {};
function planetMaterial(o) {
  const s = planetSpec(o);
  if (!planetMatCache[s.tex]) {
    const mat = new THREE.MeshStandardMaterial({
      map: loadTex(s.tex), color: C3(s.tint), roughness: 0.6, metalness: 0.2,
      emissive: C3(s.tint), emissiveMap: loadTex(s.tex), emissiveIntensity: s.glow,
    });
    addChurn(mat, s.churn);
    planetMatCache[s.tex] = mat;
  }
  return planetMatCache[s.tex];
}

/* 성단 뷰 계 마커용 행성 재질 — 먼 거리에서도 보이게 무광원 */
const markerMatCache = {};
function markerMaterial(o) {
  const s = planetSpec(o);
  if (!markerMatCache[s.tex]) {
    /* 마커는 광원이 없으므로 어두운 오행(水)은 색을 들어올려 보이게 한다 */
    const c = C3(s.tint);
    if (s.glow > 0.2) c.lerp(new THREE.Color('#ffffff'), 0.45);
    markerMatCache[s.tex] = new THREE.MeshBasicMaterial({ map: loadTex(s.tex), color: c });
  }
  return markerMatCache[s.tex];
}

/* 단위 원 (XZ) — 작도용 궤도원/자기원 공유 지오메트리 */
const unitCircleGeo = (() => {
  const pts = [];
  for (let i = 0; i < 128; i++) {
    const a = i / 128 * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
})();

/* 모음 띠 — geometry_v13 drawVowelPlanet 규칙: 地(ㅡ)=가로띠 · 人(ㅣ)=세로띠 */
function makeBelt(mesh, radius, inner, outer, rotX, rotZ) {
  const ringGeo = new THREE.RingGeometry(radius * inner, radius * outer, 96);
  const uv = ringGeo.attributes.uv;
  const pos3 = ringGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < uv.count; i++) {
    v.fromBufferAttribute(pos3, i);
    const t = (v.length() - radius * inner) / (radius * (outer - inner));
    uv.setXY(i, t, 0.5);
  }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    map: loadTex('2k_saturn_ring_alpha.png'), side: THREE.DoubleSide,
    transparent: true, opacity: 0.9, depthWrite: false,
  }));
  ring.rotation.set(rotX, 0, rotZ);
  mesh.add(ring);
}

function makeSaturnRing(mesh, radius, o) {
  const bh = o ? (o.beltH | 0) : 1, bv = o ? (o.beltV | 0) : 0;
  const s = o && o.yang === false ? -1 : 1;
  /* 地 — 적도면 가로띠 (개수만큼 바깥으로 겹쳐 쌓음) */
  for (let k = 0; k < bh; k++) {
    makeBelt(mesh, radius, 1.4 + k * 0.5, 2.4 + k * 0.5, Math.PI / 2 - 0.35, 0);
  }
  /* 人 — 극면 세로띠 (음양에 따라 기울기 방향이 반대) */
  for (let k = 0; k < bv; k++) {
    makeBelt(mesh, radius, 1.4 + k * 0.5, 2.4 + k * 0.5, 0, s * (0.38 + k * 0.3));
  }
}

/* 행성 거리 랜덤 배치 — 겹치지 않게 (첫 계는 원점) 음절 거리 */
function placeSystems(n, k = 1) {
  const MIN_SEP = MAX_ORBIT * 2 * k;
  const pts = [new THREE.Vector3(0, 0, 0)];
  for (let i = 1; i < n; i++) {
    let p, tries = 0;
    do {
      const r = (MAX_ORBIT + Math.random() * 150) * k;
      const th = Math.random() * Math.PI * 2;
      const y = gauss() * 55 * k;
      p = new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));
      tries++;
    } while (pts.some(q => q.distanceTo(p) < MIN_SEP) && tries < 300);
    pts.push(p);
  }
  return pts;
}

/* ". "(온점+띄어쓰기) → 문장 / 공백 → 어절 / 음절 → v13 자소 궤도 */
function parseText(text) {
  const sentences = text.split(/\.\s+/).map(s => s.replace(/[.\s]+$/, '').trim()).filter(Boolean);
  const out = [];
  for (const sent of sentences) {
    const words = [];
    for (const w of sent.split(/\s+/)) {
      const sylls = [...w].map(systemFor).filter(Boolean);
      if (sylls.length) words.push({ word: sylls.map(s => s.char).join(''), sylls });
    }
    if (words.length) out.push(words);
  }
  return out;
}

/* 문장 성단 배치 — 우리은하 원반 내 랜덤 좌표 (첫 성단 = 태양 자리 = 원점) */
function placeClusters(n) {
  const locals = [SUN_LOCAL.clone()];
  for (let i = 1; i < n; i++) {
    let p, tries = 0;
    do {
      const r = 3500 + Math.random() * 11000;
      const th = Math.random() * Math.PI * 2;
      p = new THREE.Vector3(Math.cos(th) * r, gauss() * 420, Math.sin(th) * r);
      tries++;
    } while (locals.some(q => q.distanceTo(p) < 7500) && tries < 200);
    locals.push(p);
  }
  return locals.map((l, i) => i === 0
    ? new THREE.Vector3(0, 0, 0)
    : l.applyEuler(GALAXY_TILT).add(galaxy.position));
}

/* 음절 궤적면 기울임 — 세로축 기준 노드선을 n등분 + 랜덤 경사
   (y=0에 겹치던 궤적을 음절마다 다른 평면으로 분산) */
function syllableTilts(n) {
  const tilts = [];
  const off = Math.random() * Math.PI;
  for (let i = 0; i < n; i++) {
    const az = off + (i + 0.15 + Math.random() * 0.7) * (Math.PI / n);
    const incl = n === 1
      ? Math.random() * 0.12
      : (0.28 + Math.random() * 0.42) * (Math.random() < 0.5 ? -1 : 1);
    const axis = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    tilts.push(new THREE.Quaternion().setFromAxisAngle(axis, incl));
  }
  return tilts;
}

/* 오방 컴퍼스 — 02 geometry_v3 UI (水北 火南 木東 金西, 중앙 土=태양) */
const COMPASS_L = MAX_ORBIT + 6;
const compassGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-COMPASS_L, 0, 0), new THREE.Vector3(COMPASS_L, 0, 0),
  new THREE.Vector3(0, 0, -COMPASS_L), new THREE.Vector3(0, 0, COMPASS_L),
]);
function makeCompass(group) {
  const mat = new THREE.LineBasicMaterial({ color: 0xe9dfc8, transparent: true, opacity: 0.07 });
  group.add(new THREE.LineSegments(compassGeo, mat));
  const L = COMPASS_L + 4, labels = [];
  [['木', L, 0], ['金', -L, 0], ['火', 0, L], ['水', 0, -L]].forEach(([t, x, z]) => {
    const el = document.createElement('div');
    el.className = 'compass-label';
    el.textContent = t;
    const o = new CSS2DObject(el);
    o.position.set(x, 0, z);
    group.add(o);
    labels.push(el);
  });
  return { mat, labels };
}

let clusters = [];         /* 문장 — {index,pos,firstWord,deco,beacon,beaconLabel,cF,systems:[i]} */
let words = [];            /* 어절 — {index,clusterIndex,word,pos,systems:[i]} */
let systems = [];          /* 음절 계 — {index,wordIndex,clusterIndex,char,pos,group,star,jamos:[...]} */
let universe = null;       /* 모든 성단·계를 담는 그룹 */
let curText = '';

function disposeUniverse() {
  if (!universe) return;
  universe.traverse(o => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.isSprite) return;
    if (o.geometry && o.geometry !== unitCircleGeo && o.geometry !== compassGeo) o.geometry.dispose();
  });
  scene.remove(universe);
  universe = null;
  clusters = [];
  words = [];
  systems = [];
}

function makeLabelEl(html, color, onClick) {
  const el = document.createElement('div');
  el.className = 'planet-label';
  if (color) el.style.color = color;
  el.innerHTML = html;
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return new CSS2DObject(el);
}

function buildAll(text) {
  disposeUniverse();
  if (!MATS) MATS = buildLetterMaterials();

  const sentences = parseText(text);
  if (!sentences.length) return;

  /* v13 곡선은 모두 rmax = R0 으로 정규화되어 있다 → 모든 계 공통 스케일 */
  const SCALE = MAX_ORBIT / R0;

  universe = new THREE.Group();

  const clusterPos = placeClusters(sentences.length);

  sentences.forEach((wordList, ci) => {
    const cpos = clusterPos[ci];
    const cluster = {
      index: ci, pos: cpos, firstWord: wordList[0].word,
      deco: null, beacon: null, beaconLabel: null, cF: 1, systems: [],
    };

    /* --- 성단 별 배경 (원점 성단은 기존 01 배경이 담당)
       원점과 동일한 4종 구성: warm 9000 + cool 15000 + core 9000 + stream 7000 --- */
    if (ci > 0) {
      const deco = new THREE.Group();
      deco.add(makeStarField({
        count: 9000, radiusMin: 420, radiusMax: 1700, sizeMin: 8, sizeMax: 30,
        palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xff9e5e, 0xfff4d6],
        twinkleAmp: 0.55, atten: 0.25,
      }));
      deco.add(makeStarField({
        count: 15000, radiusMin: 500, radiusMax: 1900, sizeMin: 3, sizeMax: 13,
        palette: [0xffffff, 0xbcd2ff, 0x8fb0ff, 0xe8e8ff],
        twinkleAmp: 0.35, atten: 0.25,
      }));
      deco.add(makeStarField({
        count: 9000, sizeMin: 8, sizeMax: 32,
        palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xfff4d6, 0xff9e5e],
        twinkleAmp: 0.5, atten: 0.25,
        generate: () => {
          const r = 420 + Math.abs(gauss()) * 1150;
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const sq = Math.sqrt(1 - u * u);
          return { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
        },
      }));
      /* 은하 중심 방향 별 흐름 (원점의 clusterStream과 동일 규칙) */
      const ax = galaxy.position.clone().sub(cpos).normalize();
      const u1 = new THREE.Vector3(0, 1, 0).cross(ax).normalize();
      const v1 = ax.clone().cross(u1).normalize();
      deco.add(makeStarField({
        count: 7000, sizeMin: 8, sizeMax: 28,
        palette: [0xffd75e, 0xffc44d, 0xff9e5e, 0xffe9a8],
        twinkleAmp: 0.5, atten: 0.25,
        generate: () => {
          const t = -2200 + Math.pow(Math.random(), 1.25) * 11500;
          const spread = 240 + Math.max(t, 0) * 0.085;
          const a = gauss() * spread, b = gauss() * spread;
          return {
            x: ax.x * t + u1.x * a + v1.x * b,
            y: ax.y * t + u1.y * a + v1.y * b,
            z: ax.z * t + u1.z * a + v1.z * b,
          };
        },
      }));
      deco.position.copy(cpos);
      deco.children.forEach(f => { f.visible = showStars; });
      universe.add(deco);
      cluster.deco = deco;
    }

    /* --- 은하 뷰 성단 표지 (광점 + 라벨) --- */
    const beacon = makeGlowSprite(2400);
    beacon.position.copy(cpos);
    universe.add(beacon);
    cluster.beacon = beacon;

    const beaconLabel = makeLabelEl(
      `<span class="ring-icon" style="color:#cfd8ff"></span><span class="name">${cluster.firstWord}${wordList.length > 1 ? '…' : ''} 은하구역</span>`,
      null, () => flyToCluster(ci));
    beaconLabel.element.classList.add('cluster-label');
    beaconLabel.position.copy(cpos);
    universe.add(beaconLabel);
    cluster.beaconLabel = beaconLabel;

    /* --- 어절 = 성단 : 음절 간 거리의 3배로 배치 어절 거리 --- */
    const wordPos = placeSystems(wordList.length, 3);
    wordList.forEach((wd, wi) => {
      const wIndex = words.length;
      const wcenter = cpos.clone().add(wordPos[wi]);
      const wordEntry = { index: wIndex, clusterIndex: ci, word: wd.word, pos: wcenter, systems: [] };

      /* --- 음절 = 계 --- */
      const sylPos = placeSystems(wd.sylls.length);
      wd.sylls.forEach((sd, si) => {
        const sysIndex = systems.length;
        const pos = wcenter.clone().add(sylPos[si]);
        const group = new THREE.Group();
        group.position.copy(pos);

        /* --- 항성 = 음절 레터 그래픽 (03 letter_v1) — 태양 대체 항성 크기 --- */
        const star = buildSyllable(sd.char) || new THREE.Group();
        star.children.filter(o => o.isLight).forEach(o => star.remove(o));
        star.scale.setScalar(1.3);
        star.add(makeGlowSprite(26));
        star.visible = showSun;
        group.add(star);

        const sunLabel = makeLabelEl(
          `<span class="ring-icon" style="color:#ffd76a"></span><span class="name">${sd.char}계</span>`,
          null, () => flyToSystem(sysIndex));
        sunLabel.element.classList.add('sun-label');
        group.add(sunLabel);

        const sunOffLabel = makeLabelEl(
          `<span class="sun-off-name">${sd.char}</span>`, null, () => flyToSystem(sysIndex));
        sunOffLabel.element.classList.add('sun-off-label');
        group.add(sunOffLabel);

        /* --- 오방 컴퍼스 (02 geometry_v3 UI) --- */
        const compass = makeCompass(group);

        /* --- 성단 뷰 계 마커: 글로우 + 자소 행성 --- */
        const marker = new THREE.Group();
        marker.add(makeGlowSprite(560));
        sd.orbits.forEach((o, j) => {
          const mp = new THREE.Mesh(new THREE.SphereGeometry(46 * (o.sz / 1.5), 24, 24), markerMaterial(o));
          const a = j / sd.orbits.length * Math.PI * 2;
          mp.position.set(Math.cos(a) * 210, 0, Math.sin(a) * 210);
          if (o.type === 'vowel') makeSaturnRing(mp, 46, o);
          marker.add(mp);
        });
        marker.scale.setScalar(0.001);
        marker.visible = false;
        group.add(marker);

        /* --- 자소 → 기울인 궤도면 + 행성 (180°를 자소 수로 나눠 랜덤 배치) --- */
        const tilts = syllableTilts(sd.orbits.length);
        const jamos = [];
        sd.orbits.forEach((o, j) => {
          const jGroup = new THREE.Group();
          jGroup.quaternion.copy(tilts[j]);
          group.add(jGroup);

          /* 궤적 (v13 곡선 → 기울인 평면) */
          const trajArr = new Float32Array((NPT + 1) * 3);
          o.pts.forEach(([x, y], k) => {
            trajArr[k * 3] = x * SCALE; trajArr[k * 3 + 1] = 0; trajArr[k * 3 + 2] = y * SCALE;
          });
          const trajGeo = new THREE.BufferGeometry();
          trajGeo.setAttribute('position', new THREE.BufferAttribute(trajArr, 3));
          trajGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((NPT + 1) * 3), 3));
          const trajMat = new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false,
          });
          const traj = new THREE.Line(trajGeo, trajMat);
          traj.geometry.setDrawRange(0, 2);
          jGroup.add(traj);

          /* 궤적 글로우 — 정점색 가산합성 4겹 */
          const glowMat = new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: 0.15,
            blending: THREE.AdditiveBlending, depthWrite: false,
          });
          const glows = [];
          for (let gi = 0; gi < 4; gi++) {
            const g = new THREE.Line(trajGeo, glowMat);
            jGroup.add(g);
            glows.push(g);
          }

          /* 반짝이는 부스러기 */
          const ND = 90;
          const dGeo = new THREE.BufferGeometry();
          dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
          dGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
          const debris = new THREE.Points(dGeo, new THREE.PointsMaterial({
            size: 0.9, map: STAR_SPRITE, vertexColors: true, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          debris.frustumCulled = false;
          jGroup.add(debris);
          const dust = {
            age: new Float32Array(ND).fill(99), life: new Float32Array(ND).fill(1),
            vel: new Float32Array(ND * 3), ph: new Float32Array(ND), idx: 0, acc: 0,
          };
          const elC = C3(o.col);
          const trailC = C3(o.trail);

          const NB = 14;
          const bGeo = new THREE.BufferGeometry();
          bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
          bGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
          const debrisBig = new THREE.Points(bGeo, new THREE.PointsMaterial({
            size: 4, map: STAR_SPRITE, vertexColors: true, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          debrisBig.frustumCulled = false;
          jGroup.add(debrisBig);
          const dustBig = {
            age: new Float32Array(NB).fill(99), life: new Float32Array(NB).fill(1),
            vel: new Float32Array(NB * 3), ph: new Float32Array(NB), idx: 0, acc: 0,
          };

          /* 행성 — 자음: 오행 텍스처(띠·위성 없음) · 모음: 임시 토성 텍스처(띠 + 위성) */
          const radius = o.sz;
          const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), planetMaterial(o));
          planet.userData.sysIndex = sysIndex;
          planet.userData.jamoIndex = j;
          let moonGrp = null;
          if (o.type === 'vowel') {
            makeSaturnRing(planet, radius, o);
            if (o.moons) {
              moonGrp = new THREE.Group();
              for (let m = 0; m < o.moons; m++) {
                const mm = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.26, 16, 16), planetMaterial(o));
                const ma = m / o.moons * Math.PI * 2;
                mm.position.set(Math.cos(ma) * radius * 3.1, 0, Math.sin(ma) * radius * 3.1);
                moonGrp.add(mm);
              }
              planet.add(moonGrp);
            }
          } else if (o.tense) {
            /* 병서 — 쌍둥이 행성 */
            const twin = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.72, 32, 32), planetMaterial(o));
            twin.position.set(radius * 1.5, 0, 0);
            planet.add(twin);
          }
          jGroup.add(planet);

          const planetLabel = makeLabelEl(
            `<span class="ring-icon"></span><span class="name">${o.glyph}</span>`,
            o.col, () => selectPlanet(sysIndex, j));
          planet.add(planetLabel);

          jamos.push({
            ...o, jGroup, planet, planetLabel, moonGrp, traj, trajMat, glows,
            debris, dust, debrisBig, dustBig, elC, trailC,
            /* age0 = 작도 시작 시각(음절·자소 순서대로 시차). 되감기 기준점 */
            age: -(si * 0.6 + j * 0.4), age0: -(si * 0.6 + j * 0.4), tc: 0,
          });
        });

        universe.add(group);
        wordEntry.systems.push(sysIndex);
        cluster.systems.push(sysIndex);
        systems.push({
          index: sysIndex, wordIndex: wIndex, clusterIndex: ci,
          char: sd.char, word: wd.word, el: sd.el,
          onset: sd.onset, vowel: sd.vowel, coda: sd.coda,
          pos, group, star, sunLabel, sunOffLabel, compass, marker, jamos, SCALE, sysF: 1,
        });
      });
      words.push(wordEntry);
    });

    clusters.push(cluster);
  });

  // Populate dropdown menus
  const wordsDropdown = document.getElementById('dropdown-words');
  const clustersDropdown = document.getElementById('dropdown-clusters');

  if (wordsDropdown) {
    wordsDropdown.innerHTML = '';
    systems.forEach((sys) => {
      const btn = document.createElement('button');
      btn.textContent = `${sys.char}계`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        flyToSystem(sys.index);
      });
      wordsDropdown.appendChild(btn);
    });
  }

  if (clustersDropdown) {
    clustersDropdown.innerHTML = '';
    words.forEach((wd) => {
      const btn = document.createElement('button');
      btn.textContent = `${wd.word} 성단`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        flyToWord(wd.index);
      });
      clustersDropdown.appendChild(btn);
    });
  }

  scene.add(universe);
}

/* ═════════════════════════════════════════════════════════════
   카메라 연출 / 선택 (01 베이스 + 뎁스 4 연결)
═════════════════════════════════════════════════════════════ */
let camTween = null;
let showStars = true;
let showSun = true;
let showOrbit = true;
let showName = true;

function toggleStarsVisibility() {
  showStars = !showStars;
  if (galaxy) galaxy.visible = showStars;
  if (starsWarm) starsWarm.visible = showStars;
  if (starsCool) starsCool.visible = showStars;
  if (clusterCore) clusterCore.visible = showStars;
  if (clusterStream) clusterStream.visible = showStars;

  if (universe) {
    universe.traverse(child => {
      if (child.isPoints) {
        child.visible = showStars;
      }
    });
  }

  const btn = document.getElementById('btn-toggle-stars');
  if (btn) {
    btn.style.opacity = showStars ? '1' : '0.4';
  }
}

function flyTo(getTargetPos, distance, duration = 1.6, onDone = null) {
  const toTargetFn = () => getTargetPos();
  const toPosFn = () => {
    const t = getTargetPos();
    const dir = new THREE.Vector3().subVectors(camera.position, t).normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0.4, 1).normalize();
    dir.y = Math.max(dir.y, 0.25);
    dir.normalize();
    return t.clone().addScaledVector(dir, distance);
  };
  camTween = {
    t: 0, dur: duration,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosFn, toTargetFn, onDone,
  };
}

function nearestSystem() {
  let best = null, bestD = Infinity;
  for (const s of systems) {
    const d = camera.position.distanceTo(s.pos);
    if (d < bestD) { bestD = d; best = s; }
  }
  return { sys: best, d: bestD };
}

function nearestWord() {
  let best = null, bestD = Infinity;
  for (const w of words) {
    const d = camera.position.distanceTo(w.pos);
    if (d < bestD) { bestD = d; best = w; }
  }
  return { word: best, d: bestD };
}

function nearestCluster() {
  let best = null, bestD = Infinity;
  for (const c of clusters) {
    const d = camera.position.distanceTo(c.pos);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { cluster: best, d: bestD };
}

function flyToSystem(i) {
  const s = systems[i];
  if (!s) return;
  flyTo(() => s.pos.clone(), 90, 1.8);
}
function flyToWord(wi) {
  const w = words[wi];
  if (!w) return;
  flyTo(() => w.pos.clone(), 700, 2.0);
}
function flyToCluster(ci) {
  const c = clusters[ci];
  if (!c) return;
  flyTo(() => c.pos.clone(), 8000, 2.2);
}
/* 어절 성단 = 음절 계 여러 개를 함께 보는 거리 */
function goCluster() {
  const { word } = nearestWord();
  flyTo(() => (word ? word.pos.clone() : new THREE.Vector3(0, 0, 0)), 700, 2.0);
}
function goGalaxy() {
  flyTo(() => new THREE.Vector3(0, 0, 0), 62000, 2.8);
}

/* 행성 클릭 → 줌인 → 레터 오버레이 (뎁스 4) */
function selectPlanet(si, ji) {
  const s = systems[si];
  if (!s) return;
  const jm = s.jamos[ji];
  if (!jm) return;
  document.querySelectorAll('.planet-label').forEach(el => el.classList.remove('selected'));
  jm.planetLabel.element.classList.add('selected');
  const dist = jm.sz * (jm.type === 'vowel' ? 8 : 6);
  flyTo(() => jm.planet.getWorldPosition(new THREE.Vector3()), dist, 1.5, () => openLetter(jm, s));
}

document.getElementById('btn-system').addEventListener('click', () => {
  const { sys } = nearestSystem();
  if (sys) flyToSystem(sys.index);
});
document.getElementById('btn-cluster').addEventListener('click', goCluster);
document.getElementById('btn-galaxy').addEventListener('click', goGalaxy);

document.getElementById('btn-toggle-stars').addEventListener('click', toggleStarsVisibility);



function toggleOrbitVisibility() {
  showOrbit = !showOrbit;
  const btn = document.getElementById('btn-toggle-orbit');
  if (btn) {
    btn.style.opacity = showOrbit ? '1' : '0.4';
  }
}
document.getElementById('btn-toggle-orbit').addEventListener('click', toggleOrbitVisibility);

function toggleNameVisibility() {
  showName = !showName;
  const btn = document.getElementById('btn-toggle-name');
  if (btn) {
    btn.style.opacity = showName ? '1' : '0.4';
  }
}
document.getElementById('btn-toggle-name').addEventListener('click', toggleNameVisibility);

function alignCompass() {
  const T = controls.target.clone();
  const dist = camera.position.distanceTo(T);
  const targetPos = T.clone().add(new THREE.Vector3(0, 0.5, 0.866).normalize().multiplyScalar(dist));

  camTween = {
    t: 0, dur: 1.2,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosFn: () => targetPos.clone(),
    toTargetFn: () => T.clone(),
    onDone: null
  };
}
document.getElementById('compass-hud').addEventListener('click', alignCompass);

function updateCompassHUD() {
  const canvas = document.getElementById('compass-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Faint circle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.stroke();

  const T = controls.target;
  const center = new THREE.Vector3().copy(T);
  const east = new THREE.Vector3().copy(T).add(new THREE.Vector3(1, 0, 0));
  const west = new THREE.Vector3().copy(T).add(new THREE.Vector3(-1, 0, 0));
  const south = new THREE.Vector3().copy(T).add(new THREE.Vector3(0, 0, 1));
  const north = new THREE.Vector3().copy(T).add(new THREE.Vector3(0, 0, -1));

  center.project(camera);
  east.project(camera);
  west.project(camera);
  south.project(camera);
  north.project(camera);

  const dEast = new THREE.Vector2(east.x - center.x, center.y - east.y);
  const dWest = new THREE.Vector2(west.x - center.x, center.y - west.y);
  const dSouth = new THREE.Vector2(south.x - center.x, center.y - south.y);
  const dNorth = new THREE.Vector2(north.x - center.x, center.y - north.y);

  if (dEast.lengthSq() === 0 || dSouth.lengthSq() === 0) return;

  dEast.normalize().multiplyScalar(28);
  dWest.normalize().multiplyScalar(28);
  dSouth.normalize().multiplyScalar(28);
  dNorth.normalize().multiplyScalar(28);

  ctx.lineWidth = 1.5;

  // West-East (Gold-Wood) line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx + dWest.x, cy + dWest.y);
  ctx.lineTo(cx + dEast.x, cy + dEast.y);
  ctx.stroke();

  // North-South (Water-Fire) line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx + dNorth.x, cy + dNorth.y);
  ctx.lineTo(cx + dSouth.x, cy + dSouth.y);
  ctx.stroke();

  // Text labels
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(232, 234, 240, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textDist = 41;
  const pNorth = dNorth.clone().normalize().multiplyScalar(textDist);
  const pSouth = dSouth.clone().normalize().multiplyScalar(textDist);
  const pEast = dEast.clone().normalize().multiplyScalar(textDist);
  const pWest = dWest.clone().normalize().multiplyScalar(textDist);

  ctx.fillText('북', cx + pNorth.x, cy + pNorth.y);
  ctx.fillText('남', cx + pSouth.x, cy + pSouth.y);
  ctx.fillText('동', cx + pEast.x, cy + pEast.y);
  ctx.fillText('서', cx + pWest.x, cy + pWest.y);
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!letterOverlayEl.classList.contains('hidden')) closeLetter();
    else { const { sys } = nearestSystem(); if (sys) flyToSystem(sys.index); }
  }
});

/* 캔버스 클릭 → 레이캐스트 행성 선택 (계 뎁스에서만) */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downXY = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 5) return;
  if (!letterOverlayEl.classList.contains('hidden')) return;
  const { d } = nearestSystem();
  if (d > 700) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(systems.flatMap(s => s.jamos.map(y => y.planet)), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && o.userData.sysIndex === undefined) o = o.parent;
    if (o) selectPlanet(o.userData.sysIndex, o.userData.jamoIndex);
  }
});

/* ---------------- 시간/재생 UI ---------------- */
const dtEl = document.getElementById('datetime');

/* 재생 컨트롤 — v13의 ⟪ ⏸ ▶ ⟫ 규칙 그대로 (되감기·완료는 재생 상태로 복귀) */
let paused = false;
const btnPause = document.getElementById('tp-pause');
const btnPlay = document.getElementById('tp-play');
function setPaused(p) {
  paused = p;
  btnPause.classList.toggle('active', p);
  btnPlay.classList.toggle('active', !p);
}
const eachJamo = (fn) => systems.forEach(s => s.jamos.forEach(fn));
btnPause.onclick = () => setPaused(true);
btnPlay.onclick = () => setPaused(false);
/* ⟪ 처음부터 다시 작도 · ⟫ 작도 즉시 완료 */
document.getElementById('tp-rewind').onclick = () => {
  eachJamo(y => { y.age = y.age0; y.tc = 0; });
  setPaused(false);
};
document.getElementById('tp-end').onclick = () => {
  eachJamo(y => { y.age = REVEAL_DUR; });
  setPaused(false);
};
setPaused(false);
function updateClockUI() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  dtEl.textContent =
    `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(updateClockUI, 1000);
updateClockUI();

/* ---------------- 스케일 HUD — 4뎁스 이름 ---------------- */
const scaleNameEl = document.getElementById('scale-name');
let lastScaleName = '';
function updateScaleHUD() {
  const { sys, d } = nearestSystem();
  const { word, d: dw } = nearestWord();
  const { cluster, d: dc } = nearestCluster();
  let name;
  if (sys && d < 260) name = `${sys.char}계`;
  else if (word && dw < 2600) name = `${word.word} 성단`;
  else if (cluster && dc < 18000) name = `${cluster.firstWord} 근방 은하구역`;
  else name = '우리은하';
  if (name !== lastScaleName) {
    lastScaleName = name;
    scaleNameEl.textContent = name;
  }

  // 00계 화면단(d < 700)이면서 행성 확대 오버레이(letter-overlay)가 안 열렸을 때만 방위 표시기(컴퍼스) 노출
  const compassHudEl = document.getElementById('compass-hud');
  const isSystemView = (sys && d < 260) && letterOverlayEl.classList.contains('hidden');
  if (isSystemView) {
    compassHudEl.classList.remove('hidden');
  } else {
    compassHudEl.classList.add('hidden');
  }
}

/* ═════════════════════════════════════════════════════════════
   [뎁스 4] 03 letter system — 행성 클릭 시 음절 3D 모델
═════════════════════════════════════════════════════════════ */
const letterOverlayEl = document.getElementById('letter-overlay');

/* --- 프로시저럴 오행 텍스처 (letter_v1 그대로) --- */
function lHash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = lHash(ix, iy), b = lHash(ix + 1, iy), c = lHash(ix, iy + 1), d = lHash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct = 5) {
  let v = 0, amp = .5, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * vnoise(x * f, y * f); amp *= .5; f *= 2.03; }
  return v;
}
function ridged(x, y, oct = 4) {
  let v = 0, amp = .55, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * (1 - Math.abs(2 * vnoise(x * f, y * f) - 1)); amp *= .5; f *= 2.1; }
  return v;
}
function lerp3(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }

function makeTexture(fn, size = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const u = px / size, v = py / size, i = (py * size + px) * 4;
    const [r, g, b] = fn(u, v);
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let MATS = null;
function buildLetterMaterials() {
  /* 木 — 나무결 + 호박빛 균열 */
  const woodMap = makeTexture((u, v) => {
    const grain = fbm(u * 3, v * 22, 5);
    const ring = .5 + .5 * Math.sin(u * 46 + grain * 7);
    let c = lerp3([64, 40, 22], [128, 84, 46], ring * .75 + grain * .25);
    const crack = ridged(u * 5 + 9, v * 5, 4);
    if (crack > 1.18) { const g = Math.min(1, (crack - 1.18) / .22); c = lerp3(c, [255, 150, 60], g); }
    return c;
  });
  const woodEmis = makeTexture((u, v) => {
    const crack = ridged(u * 5 + 9, v * 5, 4);
    if (crack > 1.18) { const g = Math.min(1, (crack - 1.18) / .22); return [255 * g, 120 * g, 35 * g]; }
    return [0, 0, 0];
  });
  /* 火 — 화염 플라즈마 */
  const fireMap = makeTexture((u, v) => {
    const f = fbm(u * 4, v * 4, 6) + .3 * ridged(u * 7, v * 7 + 3, 4);
    const t = Math.min(1, Math.max(0, (f - .35) * 1.6));
    if (t < .4) return lerp3([40, 4, 8], [180, 30, 20], t / .4);
    if (t < .75) return lerp3([180, 30, 20], [255, 120, 30], (t - .4) / .35);
    return lerp3([255, 120, 30], [255, 235, 160], (t - .75) / .25);
  });
  /* 土 — 갈라진 대지 */
  const soilMap = makeTexture((u, v) => {
    const base = fbm(u * 5, v * 5, 5);
    let c = lerp3([96, 68, 42], [176, 138, 92], base);
    const dune = .5 + .5 * Math.sin(v * 30 + fbm(u * 4, v * 4, 4) * 9);
    c = lerp3(c, [150, 112, 70], dune * .25);
    const crack = ridged(u * 6 + 4, v * 6 + 4, 5);
    if (crack > 1.22) c = lerp3(c, [34, 24, 16], Math.min(1, (crack - 1.22) / .16));
    return c;
  });
  /* 金 — 브러시드 크롬 */
  const metalMap = makeTexture((u, v) => {
    const brush = fbm(u * 1.6, v * 90, 4);
    const streak = .5 + .5 * Math.sin(v * 160 + brush * 13);
    const g = 150 + brush * 70 + streak * 22;
    return [g, g + 4, g + 12];
  });
  /* 水 — 심해 물결 + 포말 */
  const waterMap = makeTexture((u, v) => {
    const w = fbm(u * 5, v * 5, 5);
    let c = lerp3([6, 24, 66], [40, 110, 200], w);
    const caust = ridged(u * 8, v * 8 + 7, 4);
    if (caust > 1.1) c = lerp3(c, [190, 232, 255], Math.min(1, (caust - 1.1) / .26));
    return c;
  });

  return [
    new THREE.MeshPhysicalMaterial({
      map: woodMap, bumpMap: woodMap, bumpScale: .9,
      roughness: .62, metalness: 0, clearcoat: .25, clearcoatRoughness: .5,
      emissive: 0xff7830, emissiveMap: woodEmis, emissiveIntensity: 1.4
    }),
    new THREE.MeshPhysicalMaterial({
      map: fireMap, bumpMap: fireMap, bumpScale: .5,
      roughness: .42, metalness: .05,
      emissive: 0xffffff, emissiveMap: fireMap, emissiveIntensity: .5
    }),
    new THREE.MeshPhysicalMaterial({
      map: soilMap, bumpMap: soilMap, bumpScale: 1.4,
      roughness: .95, metalness: 0
    }),
    new THREE.MeshPhysicalMaterial({
      map: metalMap, bumpMap: metalMap, bumpScale: .15,
      roughness: .16, metalness: 1
    }),
    new THREE.MeshPhysicalMaterial({
      map: waterMap, bumpMap: waterMap, bumpScale: .6,
      roughness: .12, metalness: .08, clearcoat: 1, clearcoatRoughness: .08,
      emissive: 0x1a4a90, emissiveIntensity: .07
    }),
  ];
}

/* --- 자모 3D 글리프 (letter_v1 그대로) --- */
const SW = .36, SD = .38;
const STROKES = {
  'ㄱ': [[-.8, .8, .8, .8], [.8, .8, .8, -.8]],
  'ㄴ': [[-.8, .8, -.8, -.8], [-.8, -.8, .8, -.8]],
  'ㄷ': [[-.8, .8, .8, .8], [-.8, .8, -.8, -.8], [-.8, -.8, .8, -.8]],
  'ㄹ': [[-.8, .8, .8, .8], [.8, .8, .8, 0], [-.8, 0, .8, 0], [-.8, 0, -.8, -.8], [-.8, -.8, .8, -.8]],
  'ㅁ': [[-.8, .8, .8, .8], [-.8, .8, -.8, -.8], [.8, .8, .8, -.8], [-.8, -.8, .8, -.8]],
  'ㅂ': [[-.8, .8, -.8, -.8], [.8, .8, .8, -.8], [-.8, .02, .8, .02], [-.8, -.8, .8, -.8]],
  'ㅅ': [[0, .8, -.78, -.8], [0, .8, .78, -.8]],
  'ㅈ': [[-.8, .8, .8, .8], [0, .78, -.78, -.8], [0, .78, .78, -.8]],
  'ㅊ': [[-.34, 1.22, .34, 1.22], [-.8, .68, .8, .68], [0, .66, -.78, -.85], [0, .66, .78, -.85]],
  'ㅋ': [[-.8, .8, .8, .8], [.8, .8, .8, -.8], [-.8, 0, .8, 0]],
  'ㅌ': [[-.8, .8, .8, .8], [-.8, .8, -.8, -.8], [-.8, 0, .6, 0], [-.8, -.8, .8, -.8]],
  'ㅍ': [[-.8, .8, .8, .8], [-.42, .8, -.42, -.8], [.42, .8, .42, -.8], [-.8, -.8, .8, -.8]]
};
const DOUBLE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

function bar(x1, y1, x2, y2, mat, w = SW, d = SD) {
  const len = Math.hypot(x2 - x1, y2 - y1) + w * .72;
  const geo = new RoundedBoxGeometry(len, w, d, 3, w * .32);
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  return m;
}
function torusRing(cx, cy, r, tube, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 22, 48), mat);
  m.position.set(cx, cy, 0);
  return m;
}
function buildJamo(j, mat) {
  const g = new THREE.Group();
  if (DOUBLE[j]) {
    [-.5, .5].forEach(ox => {
      const half = buildJamo(DOUBLE[j], mat);
      half.scale.set(.5, .92, 1);
      half.position.x = ox;
      g.add(half);
    });
    return g;
  }
  if (j === 'ㅇ') { g.add(torusRing(0, 0, .72, SW * .55, mat)); return g; }
  if (j === 'ㅎ') {
    g.add(bar(-.3, 1.28, .3, 1.28, mat));
    g.add(bar(-.82, .74, .82, .74, mat));
    g.add(torusRing(0, -.3, .56, SW * .5, mat));
    return g;
  }
  (STROKES[j] || []).forEach(s => g.add(bar(s[0], s[1], s[2], s[3], mat)));
  return g;
}

/* --- 중성 천지인 (letter_v1 그대로) --- */
const VSPEC = {
  'ㅏ': { tri: 1, d: 1, dp: 'out' }, 'ㅑ': { tri: 1, d: 2, dp: 'out' },
  'ㅓ': { tri: 1, d: 1, dp: 'in' }, 'ㅕ': { tri: 1, d: 2, dp: 'in' },
  'ㅣ': { tri: 1, d: 0 },
  'ㅐ': { tri: 2, d: 1, dp: 'mid' }, 'ㅒ': { tri: 2, d: 2, dp: 'mid' },
  'ㅔ': { tri: 2, d: 1, dp: 'in' }, 'ㅖ': { tri: 2, d: 2, dp: 'in' },
  'ㅗ': { gnd: 1, gd: 1, gp: 'up' }, 'ㅛ': { gnd: 1, gd: 2, gp: 'up' },
  'ㅜ': { gnd: 1, gd: 1, gp: 'dn' }, 'ㅠ': { gnd: 1, gd: 2, gp: 'dn' },
  'ㅡ': { gnd: 1, gd: 0 },
  'ㅢ': { gnd: 1, gd: 0, tri: 1, d: 0 },
  'ㅚ': { gnd: 1, gd: 1, gp: 'up', tri: 1, d: 0 },
  'ㅟ': { gnd: 1, gd: 1, gp: 'dn', tri: 1, d: 0 },
  'ㅘ': { gnd: 1, gd: 1, gp: 'up', tri: 1, d: 1, dp: 'out' },
  'ㅝ': { gnd: 1, gd: 1, gp: 'dn', tri: 1, d: 1, dp: 'in' },
  'ㅙ': { gnd: 1, gd: 1, gp: 'up', tri: 2, d: 1, dp: 'mid' },
  'ㅞ': { gnd: 1, gd: 1, gp: 'dn', tri: 2, d: 1, dp: 'in' }
};

function capsule(p1, p2, r, mat) {
  const dir = new THREE.Vector3().subVectors(p2, p1), len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 20), mat);
  m.position.copy(p1).lerp(p2, .5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
function dot(x, y, z, r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 26, 26), mat);
  m.position.set(x, y, z);
  return m;
}
const ROD_R = .17, DOT_R = .28;
const APEX = new THREE.Vector3(0, 3.0, 0);
const LEG_END_X = 2.95, LEG_END_Y = -1.95;

function buildTri(spec, mat, g) {
  const layers = spec.tri;
  for (let side = -1; side <= 1; side += 2) {
    const end = new THREE.Vector3(side * LEG_END_X, LEG_END_Y, 0);
    const legDir = new THREE.Vector3().subVectors(end, APEX).normalize();
    const out = new THREE.Vector3(legDir.y * -side, legDir.x * side, 0).normalize();
    if (out.x * side < 0) out.negate();
    for (let L = 0; L < layers; L++) {
      const off = out.clone().multiplyScalar(L * .58);
      g.add(capsule(APEX.clone().add(off), end.clone().add(off), ROD_R, mat));
    }
    const inn = spec.dp === 'in';
    const ts = spec.d === 1 ? [inn ? .5 : .44] : spec.d === 2 ? (inn ? [.4, .64] : [.3, .56]) : [];
    ts.forEach(t => {
      const base = APEX.clone().lerp(end, t);
      let p;
      if (spec.dp === 'out') p = base.add(out.clone().multiplyScalar(.62 + (layers - 1) * .58));
      else if (inn) p = base.add(out.clone().multiplyScalar(-.6));
      else p = base.add(out.clone().multiplyScalar(.29));
      g.add(dot(p.x, p.y, p.z, DOT_R, mat));
    });
  }
}
const GY = -2.5;
function buildGround(spec, mat, g) {
  g.add(capsule(new THREE.Vector3(-1.78, GY, 0), new THREE.Vector3(1.78, GY, 0), ROD_R, mat));
  for (let side = -1; side <= 1; side += 2) {
    g.add(capsule(new THREE.Vector3(side * 1.78, GY, 0),
      new THREE.Vector3(side * 1.5, GY + .72, 0), ROD_R, mat));
  }
  const xs = spec.gd === 1 ? [0] : spec.gd === 2 ? [-.52, .52] : [];
  const dy = spec.gp === 'up' ? .66 : -.66;
  xs.forEach(x => g.add(dot(x, GY + dy, 0, DOT_R, mat)));
}

function buildSyllable(ch) {
  const d = decompose(ch); if (!d) return null;
  const spec = VSPEC[d.vowel];
  const el = JAMO[d.onset][0];
  const mat = MATS[el];
  const G = new THREE.Group();

  const onset = buildJamo(d.onset, mat);
  onset.scale.setScalar(1.15);
  G.add(onset);

  if (spec.tri) buildTri(spec, mat, G);
  if (spec.gnd) buildGround(spec, mat, G);

  if (d.coda) {
    let low = spec.gnd ? GY : -2.1;
    if (spec.gnd && spec.gp === 'dn') low = GY - .95;
    const parts = CODA_PARTS[d.coda] || [d.coda];
    const cs = .52;
    parts.forEach((p, i) => {
      const jm = buildJamo(p, mat);
      jm.scale.setScalar(cs);
      jm.position.set((i - (parts.length - 1) / 2) * 1.28, low - 1.1, 0);
      G.add(jm);
    });
  }

  const pl = new THREE.PointLight(C3((EL[el] || VOWEL_EL).accent), 7, 13, 2);
  pl.position.set(0, .4, 3.6);
  G.add(pl);

  G.userData = { char: ch, el, phase: Math.random() * Math.PI * 2 };
  return G;
}

/* --- 레터 씬 (지연 초기화) --- */
let Lscene = null, Lcamera = null, Lrenderer = null, Lcomposer = null, Lcontrols = null;
let Lrim = null;   /* 크롬 판에 오행 색을 얹는 림 라이트 */
let Lgroup = null, Lcapsule = null, LspawnT = 0;

function letterInit() {
  const wrap = document.getElementById('letter-stage');
  Lscene = new THREE.Scene();
  Lscene.background = new THREE.Color(0x05060f);
  Lscene.fog = new THREE.FogExp2(0x05060f, .004);

  Lcamera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 400);
  Lcamera.position.set(0, .4, 14);

  Lrenderer = new THREE.WebGLRenderer({ antialias: true });
  Lrenderer.setSize(innerWidth, innerHeight);
  Lrenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  Lrenderer.toneMapping = THREE.ACESFilmicToneMapping;
  Lrenderer.toneMappingExposure = 1.05;
  wrap.appendChild(Lrenderer.domElement);

  const pmrem = new THREE.PMREMGenerator(Lrenderer);
  Lscene.environment = pmrem.fromScene(new RoomEnvironment(), .06).texture;

  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(7, 11, 9); Lscene.add(key);
  Lrim = new THREE.DirectionalLight(0x5a72ff, 1.1);
  Lrim.position.set(-9, -3, -7); Lscene.add(Lrim);
  Lscene.add(new THREE.AmbientLight(0x1c2038, .7));

  Lcomposer = new EffectComposer(Lrenderer);
  Lcomposer.addPass(new RenderPass(Lscene, Lcamera));
  Lcomposer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .26, .7, .88));
  Lcomposer.addPass(new OutputPass());

  Lcontrols = new OrbitControls(Lcamera, Lrenderer.domElement);
  Lcontrols.enableDamping = true; Lcontrols.dampingFactor = .06;
  Lcontrols.autoRotate = false;
  Lcontrols.minDistance = 6; Lcontrols.maxDistance = 90;
  Lcontrols.target.set(0, -.5, 0);

  /* letter_v1 배경 별 */
  const NST = 1500, pos = [], col = [];
  for (let i = 0; i < NST; i++) {
    const r = 70 + Math.random() * 180,
      th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * .62, r * Math.cos(ph));
    const t = Math.random(), b = .45 + Math.random() * .55;
    if (t < .78) col.push(b, b * .96, b * .86);
    else if (t < .92) col.push(.5 * b, .62 * b, b);
    else col.push(b, .6 * b, .45 * b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  Lscene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: .55, vertexColors: true, transparent: true, opacity: .85,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));

  MATS = buildLetterMaterials();
}

/* --- 자소 레터링 → 얇은 크롬 판 (00 mater/lettering) --- */
const LETTERING = new Set(['ㄱ', 'ㄴ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅋ', 'ㅎ', 'ㅏ', 'ㅓ', 'ㅕ', 'ㅜ']);
const maskCache = {};
/* PNG 의 알파를 RGB 로 옮겨 alphaMap(초록 채널)으로 쓸 수 있게 만든다 */
function letteringMask(glyph, cb) {
  if (maskCache[glyph]) { cb(maskCache[glyph]); return; }
  const img = new Image();
  img.onload = () => {
    const S = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const m = a[i + 3]; a[i] = a[i + 1] = a[i + 2] = m; a[i + 3] = 255; }
    ctx.putImageData(d, 0, 0);
    maskCache[glyph] = new THREE.CanvasTexture(cv);
    cb(maskCache[glyph]);
  };
  img.onerror = () => console.warn('[v5] 레터링 이미지 로드 실패:', glyph);
  img.src = './src/lettering/' + encodeURIComponent(glyph) + '.png';
}
function buildChromePlate(glyph, group, spec) {
  /* 금속(metalness 1)의 color 는 반사광 전체를 물들인다.
     오행 색을 그대로 쓰면 탁해지므로 흰빛 쪽으로 당겨 크롬의 결을 남긴다 */
  const metalC = C3(spec.accent).lerp(new THREE.Color(0xffffff), 0.55);
  letteringMask(glyph, tex => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: metalC, metalness: 1, roughness: 0.11,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
      /* 박막간섭 — 보는 각도에 따라 무지개(오로라) 결이 흐른다.
         두께 범위를 넓게 잡을수록 색 띠가 여러 겹으로 갈라진다 */
      iridescence: 0.9, iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 1000],
      alphaMap: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(8, 8);
    /* 앞·뒤 두 장을 겹쳐 얇은 판의 두께를 낸다 */
    [0.07, -0.07].forEach(z => {
      const m = new THREE.Mesh(geo, mat);
      m.position.z = z;
      group.add(m);
    });
  });
}

/* jm = 자소 궤도 정보, sys = 그 자소가 속한 음절 계 */
function openLetter(jm, sys) {
  if (!Lscene) letterInit();

  if (Lgroup) {
    Lscene.remove(Lgroup);
    Lgroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    Lgroup = null;
  }
  Lgroup = new THREE.Group();
  Lgroup.userData = { char: jm.glyph, phase: Math.random() * Math.PI * 2 };
  /* 레터링 이미지가 있는 자소만 크롬 판으로 띄운다 (없으면 공란) */
  const spec = planetSpec(jm);
  /* 반사광(림 라이트)도 그 자소의 오행 색으로 */
  if (Lrim) Lrim.color.copy(C3(spec.accent));
  if (LETTERING.has(jm.glyph)) buildChromePlate(jm.glyph, Lgroup, spec);
  else console.log('[v5] 레터링 이미지 없음 — 공란 처리:', jm.glyph);
  Lgroup.scale.setScalar(.001);
  LspawnT = elapsedTime;
  Lscene.add(Lgroup);

  /* 행성 캡슐 — 자소가 자기 행성 속에 담긴 연출 */
  if (Lcapsule) {
    Lscene.remove(Lcapsule);
    Lcapsule.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  Lcapsule = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(28, 64, 64),
    new THREE.MeshStandardMaterial({
      map: loadTex(planetTex(jm)), color: C3(planetSpec(jm).tint),
      emissive: C3(planetSpec(jm).tint), emissiveIntensity: planetSpec(jm).glow + 0.25,
      transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false, roughness: 1,
    }));
  Lcapsule.add(shell);
  if (jm.type === 'vowel') makeSaturnRing(shell, 28, jm);
  Lscene.add(Lcapsule);

  Lcamera.position.set(0, .4, 14);
  Lcontrols.target.set(0, -.5, 0);

  const elemEl = document.getElementById('letter-element');
  const isV = jm.type === 'vowel';
  elemEl.textContent = isV
    ? `${jm.yang ? '陽 양' : '陰 음'} · 삼재 ${jm.seq.map(x => SAMH[x]).join('')}`
    : `${EL[jm.el].h} ${EL[jm.el].name} · ${EL[jm.el].ko}`;
  elemEl.style.color = jm.col;
  document.getElementById('letter-char').textContent = jm.glyph;
  document.getElementById('letter-jamo').textContent =
    `${sys ? sys.char + ' · ' : ''}${jm.kind} · ${jm.desc}`;
  document.getElementById('letter-desc').textContent = isV
    ? `모음은 오행이 아니라 음양과 삼재(天地人)를 따릅니다. 원 궤도를 돌며 위성 ${jm.moons}개와 띠를 갖습니다.`
    : `${jm.kind} ${jm.glyph}의 오행 ${EL[jm.el].h}(${EL[jm.el].ko})이 이 행성의 물질과 궤도 수식을 결정합니다.` +
    (LETTERING.has(jm.glyph) ? '' : ' (레터링 이미지 준비 중)');

  letterOverlayEl.classList.remove('hidden');
}


function closeLetter() {
  letterOverlayEl.classList.add('hidden');
  const { sys } = nearestSystem();
  if (sys) flyTo(() => sys.pos.clone(), 90, 1.8);
}
document.getElementById('letter-close').addEventListener('click', closeLetter);

/* ═════════════════════════════════════════════════════════════
   입력 → 성단·계 재구성
═════════════════════════════════════════════════════════════ */
const input = document.getElementById('nameInput');
input.addEventListener('input', () => {
  const norm = [...input.value].filter(c => decompose(c) || c === ' ' || c === '.').join('');
  if (norm.trim() && norm !== curText) {
    curText = norm;
    buildAll(norm);
    if (systems.length) flyToSystem(0);
  }
});

/* ═════════════════════════════════════════════════════════════
   메인 루프
═════════════════════════════════════════════════════════════ */
const clock = new THREE.Clock();
let elapsedTime = 0;
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const TWO_PI = Math.PI * 2;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsedTime = clock.elapsedTime;
  uPlanetTime.value = elapsedTime;
  const speed = paused ? 0 : 1;

  const dOrigin = camera.position.length();
  const nc = nearestCluster();
  const dNear = nc.cluster ? nc.d : dOrigin;
  const clusterF = 1 - smooth(dNear, 26000, 72000);
  const galaxyF = smooth(dNear, 9000, 42000);
  const originF = 1 - smooth(dOrigin, 26000, 72000);

  starsWarm.material.uniforms.uTime.value = elapsedTime;
  starsCool.material.uniforms.uTime.value = elapsedTime;
  clusterCore.material.uniforms.uTime.value = elapsedTime;
  clusterStream.material.uniforms.uTime.value = elapsedTime;
  galaxy.material.uniforms.uTime.value = elapsedTime;

  starsWarm.material.uniforms.uAlpha.value = originF;
  starsCool.material.uniforms.uAlpha.value = originF;
  clusterCore.material.uniforms.uAlpha.value = originF;
  clusterStream.material.uniforms.uAlpha.value = originF;
  galaxy.material.uniforms.uAlpha.value = galaxyF;

  /* ----- 성단별: 광채 구름 페이드 + 은하 뷰 표지 ----- */
  for (const c of clusters) {
    const dSelf = camera.position.distanceTo(c.pos);
    c.cF = 1 - smooth(dSelf, 26000, 72000);
    if (c.deco) {
      for (const f of c.deco.children) {
        f.material.uniforms.uTime.value = elapsedTime;
        f.material.uniforms.uAlpha.value = c.cF;
      }
    }
    c.beacon.material.opacity = 0.9 * galaxyF;
    c.beacon.visible = galaxyF > 0.02;
    c.beaconLabel.element.style.opacity = galaxyF;
    c.beaconLabel.element.style.pointerEvents = galaxyF < 0.05 ? 'none' : 'auto';
  }

  updateScaleHUD();

  /* ----- 계별 업데이트: 음절별 v8 체인 공전 + 페이드 ----- */
  for (const s of systems) {
    const dS = camera.position.distanceTo(s.pos);
    const sysF = 1 - smooth(dS, 350, 1300);
    s.sysF = sysF;
    const visible = sysF > 0.02;
    const SC = s.SCALE;

    for (const y of s.jamos) {
      /* 작도 진행: reveal 6초 → 이후 연속 공전 (u = 궤도 위 위상 0~1) */
      y.age += dt * speed;
      const reveal = Math.min(1, Math.max(0, y.age / REVEAL_DUR));
      let u;
      if (reveal < 1) {
        u = reveal;
        y.tc = 0;
        y.traj.geometry.setDrawRange(0, Math.max(2, Math.floor(reveal * NPT)));
      } else {
        y.tc += dt * y.w * speed;
        u = y.tc % 1;
        y.traj.geometry.setDrawRange(0, NPT + 1);
      }

      if (visible) {
        const idx = Math.min(NPT, Math.floor(u * NPT));
        const [px, py] = y.pts[idx];
        y.planet.position.set(px * SC, 0, py * SC);
        y.planet.rotation.y += dt * 0.25;
        if (y.moonGrp) y.moonGrp.rotation.y += dt * 0.9;

        /* ----- 궤적 글로우 꼬리 (행성 뒤로 한 바퀴에 걸쳐 소멸) ----- */
        const ca = y.traj.geometry.attributes.color.array;
        const head = reveal < 1 ? Math.max(1, Math.floor(reveal * NPT) - 1) : idx;
        for (let k = 0; k <= NPT; k++) {
          let d = head - k;
          if (reveal >= 1 && d < 0) d += NPT;
          if (d < 0) { ca[k * 3] = ca[k * 3 + 1] = ca[k * 3 + 2] = 0; continue; }
          const b = Math.pow(Math.max(0, 1 - d / NPT), 1.35) * sysF;
          ca[k * 3] = y.trailC.r * b;
          ca[k * 3 + 1] = y.trailC.g * b;
          ca[k * 3 + 2] = y.trailC.b * b;
        }
        y.traj.geometry.attributes.color.needsUpdate = true;

        /* ----- 반짝이는 부스러기 ----- */
        const du = y.dust;
        const dp = y.debris.geometry.attributes.position.array;
        const dc = y.debris.geometry.attributes.color.array;
        du.acc += dt * 26;
        while (du.acc >= 1) {
          du.acc -= 1;
          const i = du.idx = (du.idx + 1) % 90;
          dp[i * 3] = y.planet.position.x + (Math.random() - 0.5) * 0.7;
          dp[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
          dp[i * 3 + 2] = y.planet.position.z + (Math.random() - 0.5) * 0.7;
          du.vel[i * 3] = (Math.random() - 0.5) * 0.9;
          du.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
          du.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
          du.age[i] = 0;
          du.life[i] = 1.1 + Math.random() * 1.5;
          du.ph[i] = Math.random() * TWO_PI;
        }
        for (let i = 0; i < 90; i++) {
          du.age[i] += dt;
          const a = du.age[i], Lf = du.life[i];
          if (a >= Lf) { dc[i * 3] = dc[i * 3 + 1] = dc[i * 3 + 2] = 0; continue; }
          dp[i * 3] += du.vel[i * 3] * dt;
          dp[i * 3 + 1] += du.vel[i * 3 + 1] * dt;
          dp[i * 3 + 2] += du.vel[i * 3 + 2] * dt;
          const fade = Math.pow(1 - a / Lf, 1.7);
          const tw = 0.55 + 0.45 * Math.sin(elapsedTime * 11 + du.ph[i]);
          const b = fade * tw * sysF;
          dc[i * 3] = y.elC.r * b; dc[i * 3 + 1] = y.elC.g * b; dc[i * 3 + 2] = y.elC.b * b;
        }
        y.debris.geometry.attributes.position.needsUpdate = true;
        y.debris.geometry.attributes.color.needsUpdate = true;

        /* ----- 큰 반짝이 ----- */
        const db = y.dustBig;
        const bp = y.debrisBig.geometry.attributes.position.array;
        const bc = y.debrisBig.geometry.attributes.color.array;
        db.acc += dt * 3;
        while (db.acc >= 1) {
          db.acc -= 1;
          const i = db.idx = (db.idx + 1) % 14;
          bp[i * 3] = y.planet.position.x + (Math.random() - 0.5) * 1.2;
          bp[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
          bp[i * 3 + 2] = y.planet.position.z + (Math.random() - 0.5) * 1.2;
          db.vel[i * 3] = (Math.random() - 0.5) * 0.6;
          db.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
          db.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
          db.age[i] = 0;
          db.life[i] = 1.6 + Math.random() * 1.4;
          db.ph[i] = Math.random() * TWO_PI;
        }
        for (let i = 0; i < 14; i++) {
          db.age[i] += dt;
          const ab = db.age[i], Lb = db.life[i];
          if (ab >= Lb) { bc[i * 3] = bc[i * 3 + 1] = bc[i * 3 + 2] = 0; continue; }
          bp[i * 3] += db.vel[i * 3] * dt;
          bp[i * 3 + 1] += db.vel[i * 3 + 1] * dt;
          bp[i * 3 + 2] += db.vel[i * 3 + 2] * dt;
          const fadeB = Math.pow(1 - ab / Lb, 1.5);
          const twB = 0.5 + 0.5 * Math.sin(elapsedTime * 7 + db.ph[i]);
          const bB = fadeB * twB * sysF;
          bc[i * 3] = y.elC.r * bB; bc[i * 3 + 1] = y.elC.g * bB; bc[i * 3 + 2] = y.elC.b * bB;
        }
        y.debrisBig.geometry.attributes.position.needsUpdate = true;
        y.debrisBig.geometry.attributes.color.needsUpdate = true;
      }

      /* 페이드 (계 단위) */
      y.trajMat.opacity = 0.9 * sysF;
      const orbitVisible = visible && showOrbit;
      y.planet.visible = visible;
      y.traj.visible = orbitVisible;
      for (const g of y.glows) g.visible = orbitVisible;
      y.debris.visible = visible;
      y.debrisBig.visible = visible;
      const op = showName ? sysF : 0;
      y.planetLabel.element.style.opacity = op;
      y.planetLabel.element.style.pointerEvents = op < 0.05 ? 'none' : 'auto';
    }

    s.star.rotation.y += dt * 0.02;
    s.compass.mat.opacity = showOrbit ? 0.07 * sysF : 0;
    const cOp = showOrbit ? sysF : 0;
    for (const el of s.compass.labels) {
      el.style.opacity = cOp;
      el.style.pointerEvents = cOp < 0.05 ? 'none' : 'auto';
    }

    /* 성단 뷰 계 마커 — 계에 가까우면 숨기고 성단 거리에서 등장 */
    const mF = smooth(dS, 500, 2400) * (clusters[s.clusterIndex] ? clusters[s.clusterIndex].cF : 0);
    s.marker.visible = mF > 0.02;
    if (s.marker.visible) {
      s.marker.scale.setScalar(mF);
      s.marker.rotation.y += dt * 0.05;
    }

    const sOp = (showName && showSun) ? clusterF : 0;
    s.sunLabel.element.style.opacity = sOp;
    s.sunLabel.element.style.pointerEvents = sOp < 0.05 ? 'none' : 'auto';

    const offOp = (showName && !showSun) ? clusterF * 0.5 : 0;
    if (s.sunOffLabel) {
      s.sunOffLabel.element.style.opacity = offOp;
      s.sunOffLabel.element.style.pointerEvents = offOp < 0.05 ? 'none' : 'auto';
    }
  }

  /* ----- 카메라 트윈 ----- */
  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = easeInOut(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPosFn(), k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTargetFn(), k);
    if (camTween.t >= 1) {
      const done = camTween.onDone;
      camTween = null;
      if (done) done();
    }
  }


  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  updateCompassHUD();

  /* ----- 레터 오버레이 ----- */
  if (Lscene && !letterOverlayEl.classList.contains('hidden')) {
    if (Lgroup) {
      const tt = Math.min(1, (elapsedTime - LspawnT) / .9);
      Lgroup.scale.setScalar(1 - Math.pow(1 - tt, 3) || .001);
      Lgroup.position.y = Math.sin(elapsedTime * .8 + Lgroup.userData.phase) * .28;
      Lgroup.rotation.y = Math.sin(elapsedTime * .4 + Lgroup.userData.phase) * .38;
    }
    if (Lcapsule) Lcapsule.rotation.y = elapsedTime * 0.04;
    Lcontrols.update();
    Lcomposer.render();
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  if (Lrenderer) {
    Lcamera.aspect = innerWidth / innerHeight;
    Lcamera.updateProjectionMatrix();
    Lrenderer.setSize(innerWidth, innerHeight);
    Lcomposer.setSize(innerWidth, innerHeight);
  }
});

/* ---------------- 시작 ---------------- */
curText = '김수환무. 거북이와 두루미';
buildAll(curText);
animate();
